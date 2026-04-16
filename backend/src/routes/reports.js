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

module.exports = router;
