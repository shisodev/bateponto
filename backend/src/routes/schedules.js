const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Buscar escala de um funcionário
router.get('/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;

  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const schedule = db.prepare('SELECT * FROM work_schedules WHERE user_id = ?').get(userId);
  if (!schedule) {
    return res.json(null);
  }
  res.json(schedule);
});

// Criar ou atualizar escala (admin)
router.put('/:userId', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.userId;
  const {
    type, break_duration, weekly_hours,
    monday_start, monday_end, tuesday_start, tuesday_end,
    wednesday_start, wednesday_end, thursday_start, thursday_end,
    friday_start, friday_end, saturday_start, saturday_end,
    sunday_start, sunday_end
  } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const existing = db.prepare('SELECT id FROM work_schedules WHERE user_id = ?').get(userId);

  if (existing) {
    db.prepare(`
      UPDATE work_schedules SET
        type = ?, break_duration = ?, weekly_hours = ?,
        monday_start = ?, monday_end = ?, tuesday_start = ?, tuesday_end = ?,
        wednesday_start = ?, wednesday_end = ?, thursday_start = ?, thursday_end = ?,
        friday_start = ?, friday_end = ?, saturday_start = ?, saturday_end = ?,
        sunday_start = ?, sunday_end = ?
      WHERE user_id = ?
    `).run(
      type || 'fixed', break_duration || 60, weekly_hours || 44,
      monday_start, monday_end, tuesday_start, tuesday_end,
      wednesday_start, wednesday_end, thursday_start, thursday_end,
      friday_start, friday_end, saturday_start, saturday_end,
      sunday_start, sunday_end, userId
    );
  } else {
    db.prepare(`
      INSERT INTO work_schedules (
        user_id, type, break_duration, weekly_hours,
        monday_start, monday_end, tuesday_start, tuesday_end,
        wednesday_start, wednesday_end, thursday_start, thursday_end,
        friday_start, friday_end, saturday_start, saturday_end,
        sunday_start, sunday_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, type || 'fixed', break_duration || 60, weekly_hours || 44,
      monday_start, monday_end, tuesday_start, tuesday_end,
      wednesday_start, wednesday_end, thursday_start, thursday_end,
      friday_start, friday_end, saturday_start, saturday_end,
      sunday_start, sunday_end
    );
  }

  const schedule = db.prepare('SELECT * FROM work_schedules WHERE user_id = ?').get(userId);
  res.json(schedule);
});

module.exports = router;
