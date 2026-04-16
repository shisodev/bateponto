const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Funcionário vê própria escala do mês
router.get('/my', authenticateToken, (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = String(month ? parseInt(month) : now.getMonth() + 1).padStart(2, '0');
  const y = year ? parseInt(year) : now.getFullYear();

  const entries = db.prepare(`
    SELECT * FROM daily_schedules
    WHERE user_id = ? AND date LIKE ?
    ORDER BY date ASC
  `).all(req.user.id, `${y}-${m}-%`);

  res.json(entries);
});

// Admin vê escala de um funcionário (mês)
router.get('/user/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { month, year } = req.query;
  const now = new Date();
  const m = String(month ? parseInt(month) : now.getMonth() + 1).padStart(2, '0');
  const y = year ? parseInt(year) : now.getFullYear();

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const entries = db.prepare(`
    SELECT * FROM daily_schedules
    WHERE user_id = ? AND date LIKE ?
    ORDER BY date ASC
  `).all(req.params.userId, `${y}-${m}-%`);

  res.json(entries);
});

// Admin cria múltiplas entradas (bulk) — deve vir antes de POST /
router.post('/bulk', authenticateToken, requireAdmin, (req, res) => {
  const { user_id, entries } = req.body;

  if (!user_id || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'user_id e entries são obrigatórios' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'Funcionário não encontrado' });

  let count = 0;
  for (const e of entries) {
    if (!e.date || !e.start_time || !e.end_time) continue;

    const existing = db.prepare(
      'SELECT id FROM daily_schedules WHERE user_id = ? AND date = ?'
    ).get(user_id, e.date);

    if (existing) {
      db.prepare(`
        UPDATE daily_schedules SET start_time = ?, end_time = ?, break_start = ?, break_end = ?, notes = ?
        WHERE id = ?
      `).run(e.start_time, e.end_time, e.break_start || null, e.break_end || null, e.notes || null, existing.id);
    } else {
      db.prepare(`
        INSERT INTO daily_schedules (user_id, date, start_time, end_time, break_start, break_end, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(user_id, e.date, e.start_time, e.end_time, e.break_start || null, e.break_end || null, e.notes || null);
    }
    count++;
  }

  res.json({ message: `${count} entradas criadas/atualizadas com sucesso` });
});

// Admin cria uma entrada
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { user_id, date, start_time, end_time, break_start, break_end, notes } = req.body;

  if (!user_id || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'user_id, date, start_time e end_time são obrigatórios' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'Funcionário não encontrado' });

  // Upsert: se já existe entrada para esse dia, atualiza
  const existing = db.prepare(
    'SELECT id FROM daily_schedules WHERE user_id = ? AND date = ?'
  ).get(user_id, date);

  if (existing) {
    db.prepare(`
      UPDATE daily_schedules SET start_time = ?, end_time = ?, break_start = ?, break_end = ?, notes = ?
      WHERE id = ?
    `).run(start_time, end_time, break_start || null, break_end || null, notes || null, existing.id);
    const entry = db.prepare('SELECT * FROM daily_schedules WHERE id = ?').get(existing.id);
    return res.json(entry);
  }

  const result = db.prepare(`
    INSERT INTO daily_schedules (user_id, date, start_time, end_time, break_start, break_end, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user_id, date, start_time, end_time, break_start || null, break_end || null, notes || null);

  const entry = db.prepare('SELECT * FROM daily_schedules WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(entry);
});

// Admin edita uma entrada
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { start_time, end_time, break_start, break_end, notes } = req.body;

  const entry = db.prepare('SELECT * FROM daily_schedules WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entrada não encontrada' });

  db.prepare(`
    UPDATE daily_schedules
    SET start_time = ?, end_time = ?, break_start = ?, break_end = ?, notes = ?
    WHERE id = ?
  `).run(
    start_time || entry.start_time,
    end_time || entry.end_time,
    break_start !== undefined ? (break_start || null) : entry.break_start,
    break_end !== undefined ? (break_end || null) : entry.break_end,
    notes !== undefined ? (notes || null) : entry.notes,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM daily_schedules WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Admin remove uma entrada
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const entry = db.prepare('SELECT * FROM daily_schedules WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entrada não encontrada' });

  db.prepare('DELETE FROM daily_schedules WHERE id = ?').run(req.params.id);
  res.json({ message: 'Entrada removida com sucesso' });
});

module.exports = router;
