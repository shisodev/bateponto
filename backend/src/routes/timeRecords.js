const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const RECORD_TYPES = ['entrada', 'saida', 'inicio_pausa', 'fim_pausa'];

function getLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now - offset);
  return {
    timestamp: local.toISOString().slice(0, 19).replace('T', ' '),
    date: local.toISOString().slice(0, 10)
  };
}

// Validar se o tipo de registro é permitido dado o estado atual do dia
function validateRecordType(userId, type, date) {
  const todayRecords = db.prepare(`
    SELECT type FROM time_records
    WHERE user_id = ? AND date = ?
    ORDER BY timestamp ASC
  `).all(userId, date);

  const lastRecord = todayRecords[todayRecords.length - 1];
  const lastType = lastRecord ? lastRecord.type : null;

  const rules = {
    entrada: [null, 'saida'],
    saida: ['entrada', 'fim_pausa'],
    inicio_pausa: ['entrada', 'fim_pausa'],
    fim_pausa: ['inicio_pausa']
  };

  if (!rules[type] || !rules[type].includes(lastType)) {
    const messages = {
      entrada: 'Você já registrou entrada. Registre saída primeiro.',
      saida: 'Você precisa registrar entrada antes de registrar saída.',
      inicio_pausa: 'Você precisa estar trabalhando para iniciar a pausa.',
      fim_pausa: 'Você precisa iniciar a pausa antes de finalizar.'
    };
    return { valid: false, message: messages[type] };
  }

  return { valid: true };
}

// Registrar ponto (funcionário)
router.post('/', authenticateToken, (req, res) => {
  const { type, notes } = req.body;
  const userId = req.user.id;

  if (!RECORD_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Tipo de registro inválido' });
  }

  const { timestamp, date } = getLocalDateTime();
  const validation = validateRecordType(userId, type, date);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  const result = db.prepare(`
    INSERT INTO time_records (user_id, type, timestamp, date, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, type, timestamp, date, notes || null);

  const typeLabels = {
    entrada: 'Entrada',
    saida: 'Saída',
    inicio_pausa: 'Início de Pausa',
    fim_pausa: 'Fim de Pausa'
  };

  db.prepare(`
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (?, ?, ?)
  `).run(userId, 'time_record', `${typeLabels[type]} registrada: ${timestamp}`);

  const record = db.prepare('SELECT * FROM time_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(record);
});

// Registros de hoje do funcionário logado
router.get('/today', authenticateToken, (req, res) => {
  const { date } = getLocalDateTime();
  const records = db.prepare(`
    SELECT * FROM time_records
    WHERE user_id = ? AND date = ?
    ORDER BY timestamp ASC
  `).all(req.user.id, date);
  res.json({ records, date });
});

// Histórico de registros do funcionário
router.get('/history', authenticateToken, (req, res) => {
  const { start_date, end_date } = req.query;
  const userId = req.user.id;

  let query = 'SELECT * FROM time_records WHERE user_id = ?';
  const params = [userId];

  if (start_date) { query += ' AND date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND date <= ?'; params.push(end_date); }

  query += ' ORDER BY timestamp DESC LIMIT 200';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

// Todos os registros (admin)
router.get('/all', authenticateToken, requireAdmin, (req, res) => {
  const { user_id, start_date, end_date, date } = req.query;

  let query = `
    SELECT tr.*, u.full_name, u.username
    FROM time_records tr
    JOIN users u ON tr.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (user_id) { query += ' AND tr.user_id = ?'; params.push(user_id); }
  if (date) { query += ' AND tr.date = ?'; params.push(date); }
  if (start_date) { query += ' AND tr.date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND tr.date <= ?'; params.push(end_date); }

  query += ' ORDER BY tr.timestamp DESC LIMIT 500';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

// Status atual do funcionário (para saber qual botão mostrar)
router.get('/status', authenticateToken, (req, res) => {
  const { date } = getLocalDateTime();
  const records = db.prepare(`
    SELECT type, timestamp FROM time_records
    WHERE user_id = ? AND date = ?
    ORDER BY timestamp ASC
  `).all(req.user.id, date);

  const lastType = records.length > 0 ? records[records.length - 1].type : null;

  const statusMap = {
    null: 'sem_registro',
    entrada: 'trabalhando',
    saida: 'encerrado',
    inicio_pausa: 'em_pausa',
    fim_pausa: 'trabalhando'
  };

  res.json({
    status: statusMap[lastType] || 'sem_registro',
    last_record: lastType,
    records,
    date
  });
});

// Excluir registro (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const record = db.prepare('SELECT * FROM time_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Registro não encontrado' });

  db.prepare('DELETE FROM time_records WHERE id = ?').run(req.params.id);
  db.prepare(`
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (?, ?, ?)
  `).run(req.user.id, 'delete_record', `Registro excluído: ID ${req.params.id}`);

  res.json({ message: 'Registro excluído com sucesso' });
});

module.exports = router;
