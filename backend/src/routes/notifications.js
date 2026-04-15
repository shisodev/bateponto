const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Listar notificações do usuário
router.get('/', authenticateToken, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);
  res.json(notifications);
});

// Contar não lidas
router.get('/unread-count', authenticateToken, (req, res) => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM notifications
    WHERE user_id = ? AND read = 0
  `).get(req.user.id);
  res.json({ count: result.count });
});

// Marcar como lida
router.put('/:id/read', authenticateToken, (req, res) => {
  db.prepare(`
    UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);
  res.json({ message: 'Notificação marcada como lida' });
});

// Marcar todas como lidas
router.put('/read-all', authenticateToken, (req, res) => {
  db.prepare(`
    UPDATE notifications SET read = 1 WHERE user_id = ?
  `).run(req.user.id);
  res.json({ message: 'Todas as notificações marcadas como lidas' });
});

// Criar notificação (admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { user_id, title, message, type } = req.body;

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, ?, ?, ?)
  `).run(user_id, title, message, type || 'info');

  res.status(201).json({ message: 'Notificação enviada' });
});

// Logs de atividade (admin)
router.get('/logs', authenticateToken, requireAdmin, (req, res) => {
  const logs = db.prepare(`
    SELECT al.*, u.full_name
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.timestamp DESC
    LIMIT 100
  `).all();
  res.json(logs);
});

module.exports = router;
