const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Listar modelos (todos os usuários autenticados podem ver)
router.get('/', authenticateToken, (req, res) => {
  const templates = db.prepare('SELECT * FROM schedule_templates ORDER BY name').all();
  res.json(templates);
});

// Criar modelo (admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, start_time, end_time, break_start, break_end } = req.body;

  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'name, start_time e end_time são obrigatórios' });
  }

  const result = db.prepare(`
    INSERT INTO schedule_templates (name, start_time, end_time, break_start, break_end, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), start_time, end_time, break_start || null, break_end || null, req.user.id);

  const template = db.prepare('SELECT * FROM schedule_templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(template);
});

// Editar modelo (admin)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, start_time, end_time, break_start, break_end } = req.body;

  const template = db.prepare('SELECT * FROM schedule_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Modelo não encontrado' });

  db.prepare(`
    UPDATE schedule_templates
    SET name = ?, start_time = ?, end_time = ?, break_start = ?, break_end = ?
    WHERE id = ?
  `).run(
    name?.trim() || template.name,
    start_time || template.start_time,
    end_time || template.end_time,
    break_start !== undefined ? (break_start || null) : template.break_start,
    break_end !== undefined ? (break_end || null) : template.break_end,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM schedule_templates WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Deletar modelo (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const template = db.prepare('SELECT * FROM schedule_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Modelo não encontrado' });

  db.prepare('DELETE FROM schedule_templates WHERE id = ?').run(req.params.id);
  res.json({ message: 'Modelo excluído com sucesso' });
});

module.exports = router;
