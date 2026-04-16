const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Retorna a data local (não UTC) no formato YYYY-MM-DD
function getLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function calcHoursWorked(records) {
  let totalMinutes = 0;
  let entradaTime = null;
  let pausaTime = null;

  for (const r of records) {
    const t = new Date(`1970-01-01T${r.timestamp.slice(11, 19)}`);
    if (r.type === 'entrada') {
      entradaTime = t;
    } else if (r.type === 'inicio_pausa' && entradaTime) {
      totalMinutes += (t - entradaTime) / 60000;
      entradaTime = null;
      pausaTime = t;
    } else if (r.type === 'fim_pausa') {
      pausaTime = null;
      entradaTime = t;
    } else if (r.type === 'saida') {
      if (entradaTime) {
        totalMinutes += (t - entradaTime) / 60000;
        entradaTime = null;
      }
    }
  }

  // Se ainda está trabalhando (sem saída), calcula até agora
  if (entradaTime) {
    const now = new Date();
    totalMinutes += (now - entradaTime) / 60000;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return { total_minutes: Math.round(totalMinutes), hours, minutes, formatted: `${hours}h ${minutes.toString().padStart(2, '0')}m` };
}

function minToFormatted(min) {
  const abs = Math.abs(Math.round(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = min < 0 ? '-' : '+';
  return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
}

function timeToMin(str) {
  if (!str) return 0;
  const parts = str.slice(0, 5).split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

// Espelho de ponto por funcionário e período
router.get('/mirror', authenticateToken, (req, res) => {
  const { user_id, start_date, end_date } = req.query;
  const targetUserId = req.user.role === 'admin' ? (user_id || req.user.id) : req.user.id;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Informe o período (start_date e end_date)' });
  }

  const user = db.prepare('SELECT id, full_name, username FROM users WHERE id = ?').get(targetUserId);
  if (!user) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const records = db.prepare(`
    SELECT * FROM time_records
    WHERE user_id = ? AND date >= ? AND date <= ?
    ORDER BY timestamp ASC
  `).all(targetUserId, start_date, end_date);

  // Agrupar por dia
  const byDate = {};
  for (const r of records) {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  }

  const days = Object.keys(byDate).sort().map(date => {
    const dayRecords = byDate[date];
    const worked = calcHoursWorked(dayRecords);
    const entrada = dayRecords.find(r => r.type === 'entrada');
    const saida = dayRecords.filter(r => r.type === 'saida').pop();

    return {
      date,
      records: dayRecords,
      entry_time: entrada ? entrada.timestamp.slice(11, 16) : null,
      exit_time: saida ? saida.timestamp.slice(11, 16) : null,
      worked_hours: worked.formatted,
      total_minutes: worked.total_minutes
    };
  });

  const totalMinutes = days.reduce((sum, d) => sum + d.total_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = Math.round(totalMinutes % 60);

  res.json({
    user,
    period: { start_date, end_date },
    days,
    summary: {
      total_days: days.length,
      total_hours_formatted: `${totalHours}h ${totalMins.toString().padStart(2, '0')}m`,
      total_minutes: totalMinutes
    }
  });
});

// Dashboard stats (admin)
router.get('/dashboard', authenticateToken, requireAdmin, (req, res) => {
  const today = getLocalDate();

  const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'employee' AND active = 1").get();
  const todayRecords = db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM time_records WHERE date = ?").get(today);
  const pendingAdjustments = db.prepare("SELECT COUNT(*) as count FROM adjustment_requests WHERE status = 'pending'").get();
  const presentToday = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count FROM time_records
    WHERE date = ? AND type = 'entrada'
  `).get(today);

  // Últimos registros do dia
  const recentRecords = db.prepare(`
    SELECT tr.*, u.full_name
    FROM time_records tr
    JOIN users u ON tr.user_id = u.id
    WHERE tr.date = ?
    ORDER BY tr.timestamp DESC
    LIMIT 10
  `).all(today);

  res.json({
    total_employees: totalEmployees.count,
    present_today: presentToday.count,
    today_records: todayRecords.count,
    pending_adjustments: pendingAdjustments.count,
    recent_records: recentRecords
  });
});

// Funcionários presentes hoje
router.get('/present-today', authenticateToken, requireAdmin, (req, res) => {
  const today = getLocalDate();

  const records = db.prepare(`
    SELECT u.id, u.full_name,
      MIN(CASE WHEN tr.type = 'entrada' THEN tr.timestamp END) as first_entry,
      MAX(CASE WHEN tr.type = 'saida' THEN tr.timestamp END) as last_exit,
      MAX(tr.type) as last_type
    FROM users u
    LEFT JOIN time_records tr ON u.id = tr.user_id AND tr.date = ?
    WHERE u.role = 'employee' AND u.active = 1
    GROUP BY u.id
    ORDER BY u.full_name
  `).all(today);

  res.json(records);
});

// Banco de horas — por funcionário e período
router.get('/bank-hours', authenticateToken, (req, res) => {
  const { user_id, start_date, end_date } = req.query;
  const targetUserId = req.user.role === 'admin' ? (user_id || req.user.id) : req.user.id;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'Informe o período (start_date e end_date)' });
  }

  const user = db.prepare('SELECT id, full_name, username FROM users WHERE id = ?').get(targetUserId);
  if (!user) return res.status(404).json({ error: 'Funcionário não encontrado' });

  // Escalas, registros e ajustes aprovados no período
  const schedules = db.prepare(`
    SELECT * FROM daily_schedules
    WHERE user_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC
  `).all(targetUserId, start_date, end_date);

  const allRecords = db.prepare(`
    SELECT * FROM time_records
    WHERE user_id = ? AND date >= ? AND date <= ?
    ORDER BY timestamp ASC
  `).all(targetUserId, start_date, end_date);

  const approvedAdjustments = db.prepare(`
    SELECT * FROM adjustment_requests
    WHERE user_id = ? AND date >= ? AND date <= ? AND status = 'approved'
    ORDER BY date ASC
  `).all(targetUserId, start_date, end_date);

  // Agrupar por data
  const recordsByDate = {};
  for (const r of allRecords) {
    if (!recordsByDate[r.date]) recordsByDate[r.date] = [];
    recordsByDate[r.date].push(r);
  }

  const adjustmentsByDate = {};
  for (const a of approvedAdjustments) {
    if (!adjustmentsByDate[a.date]) adjustmentsByDate[a.date] = [];
    adjustmentsByDate[a.date].push(a);
  }

  const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const days = schedules.map(schedule => {
    const dayRecords = (recordsByDate[schedule.date] || [])
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const dayAdjustments = adjustmentsByDate[schedule.date] || [];

    // Horas esperadas pela escala
    const schedStart = timeToMin(schedule.start_time);
    const schedEnd   = timeToMin(schedule.end_time);
    let expectedMin  = schedEnd - schedStart;
    if (schedule.break_start && schedule.break_end) {
      expectedMin -= (timeToMin(schedule.break_end) - timeToMin(schedule.break_start));
    }
    expectedMin = Math.max(0, expectedMin);

    // Atestado = ajuste aprovado com "atestado" no motivo ou na obs. do admin
    const isAtestado = dayAdjustments.some(a =>
      (a.reason      && a.reason.toLowerCase().includes('atestado')) ||
      (a.admin_notes && a.admin_notes.toLowerCase().includes('atestado'))
    );

    const hasApprovedAdj = dayAdjustments.length > 0;

    // Horas trabalhadas
    const worked    = calcHoursWorked(dayRecords);
    const workedMin = worked.total_minutes;

    const entradaRec = dayRecords.find(r => r.type === 'entrada');
    const saidaRec   = [...dayRecords].reverse().find(r => r.type === 'saida');

    // Dia da semana (usa meio-dia para evitar DST)
    const dow = new Date(schedule.date + 'T12:00:00').getDay();

    let balanceMin, observation;
    if (isAtestado) {
      observation = 'Atestado';
      balanceMin  = 0;
    } else if (dayRecords.length === 0) {
      observation = 'Falta';
      balanceMin  = -expectedMin;
    } else if (hasApprovedAdj) {
      observation = 'Ajuste Aprovado';
      balanceMin  = workedMin - expectedMin;
    } else {
      observation = 'Normal';
      balanceMin  = workedMin - expectedMin;
    }

    return {
      date:      schedule.date,
      weekday:   WEEKDAY_NAMES[dow],
      schedule: {
        start_time:  schedule.start_time.slice(0, 5),
        end_time:    schedule.end_time.slice(0, 5),
        break_start: schedule.break_start ? schedule.break_start.slice(0, 5) : null,
        break_end:   schedule.break_end   ? schedule.break_end.slice(0, 5)   : null,
      },
      entry_time:        entradaRec ? entradaRec.timestamp.slice(11, 16) : null,
      exit_time:         saidaRec   ? saidaRec.timestamp.slice(11, 16)   : null,
      records:           dayRecords,
      expected_minutes:  Math.round(expectedMin),
      expected_formatted:`${Math.floor(expectedMin / 60)}h ${Math.round(expectedMin % 60).toString().padStart(2, '0')}m`,
      worked_minutes:    workedMin,
      worked_formatted:  worked.formatted,
      balance_minutes:   Math.round(balanceMin),
      balance_formatted: minToFormatted(balanceMin),
      observation,
      has_approved_adjustment: hasApprovedAdj,
    };
  });

  const totalExpMin = days.reduce((s, d) => s + d.expected_minutes, 0);
  const totalWrkMin = days.reduce((s, d) => s + d.worked_minutes,   0);
  const totalBalMin = days.reduce((s, d) => s + d.balance_minutes,  0);

  res.json({
    user,
    period: { start_date, end_date },
    days,
    summary: {
      total_scheduled_days:     days.length,
      total_worked_days:        days.filter(d => d.records.length > 0).length,
      total_absences:           days.filter(d => d.observation === 'Falta').length,
      total_expected_minutes:   Math.round(totalExpMin),
      total_expected_formatted: `${Math.floor(totalExpMin / 60)}h ${Math.round(totalExpMin % 60).toString().padStart(2, '0')}m`,
      total_worked_minutes:     Math.round(totalWrkMin),
      total_worked_formatted:   `${Math.floor(totalWrkMin / 60)}h ${Math.round(totalWrkMin % 60).toString().padStart(2, '0')}m`,
      balance_minutes:          Math.round(totalBalMin),
      balance_formatted:        minToFormatted(totalBalMin),
    }
  });
});

module.exports = router;
