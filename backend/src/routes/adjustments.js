const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Criar solicitação de ajuste (funcionário)
router.post('/', authenticateToken, (req, res) => {
  const { record_id, record_type, original_timestamp, requested_timestamp, date, reason } = req.body;

  if (!record_type || !requested_timestamp || !date || !reason) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }

  const result = db.prepare(`
    INSERT INTO adjustment_requests
      (user_id, record_id, record_type, original_timestamp, requested_timestamp, date, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, record_id || null, record_type, original_timestamp || null, requested_timestamp, date, reason);

  // Notificar admin
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  for (const admin of admins) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, ?)
    `).run(
      admin.id,
      'Nova solicitação de ajuste',
      `${req.user.full_name} solicitou ajuste de ponto para ${date}`,
      'warning'
    );
  }

  const request = db.prepare('SELECT * FROM adjustment_requests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(request);
});

// Listar solicitações do funcionário
router.get('/my', authenticateToken, (req, res) => {
  const requests = db.prepare(`
    SELECT * FROM adjustment_requests
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(requests);
});

// Listar todas as solicitações (admin)
router.get('/all', authenticateToken, requireAdmin, (req, res) => {
  const { status } = req.query;

  let query = `
    SELECT ar.*, u.full_name, u.username
    FROM adjustment_requests ar
    JOIN users u ON ar.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND ar.status = ?'; params.push(status); }
  query += ' ORDER BY ar.created_at DESC';

  const requests = db.prepare(query).all(...params);
  res.json(requests);
});

// Aprovar ou rejeitar (admin)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { status, admin_notes } = req.body;
  const requestId = req.params.id;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  const request = db.prepare('SELECT * FROM adjustment_requests WHERE id = ?').get(requestId);
  if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'Solicitação já foi processada' });

  db.prepare(`
    UPDATE adjustment_requests
    SET status = ?, admin_notes = ?, reviewed_by = ?,
        reviewed_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(status, admin_notes || null, req.user.id, requestId);

  // Se aprovado, aplicar a correção no registro
  if (status === 'approved') {
    if (request.record_id) {
      db.prepare(`
        UPDATE time_records
        SET timestamp = ?, is_adjusted = 1, original_timestamp = timestamp
        WHERE id = ?
      `).run(request.requested_timestamp, request.record_id);
    } else {
      // Criar novo registro
      const dateStr = request.requested_timestamp.slice(0, 10);
      db.prepare(`
        INSERT INTO time_records (user_id, type, timestamp, date, notes, is_adjusted)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(request.user_id, request.record_type, request.requested_timestamp, dateStr, 'Criado por ajuste aprovado');
    }
  }

  // Notificar funcionário
  const statusMsg = status === 'approved' ? 'aprovada' : 'rejeitada';
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, ?, ?, ?)
  `).run(
    request.user_id,
    `Solicitação de ajuste ${statusMsg}`,
    `Sua solicitação de ajuste para ${request.date} foi ${statusMsg}.${admin_notes ? ` Observação: ${admin_notes}` : ''}`,
    status === 'approved' ? 'success' : 'error'
  );

  db.prepare(`
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (?, ?, ?)
  `).run(req.user.id, 'review_adjustment', `Ajuste #${requestId} ${statusMsg}`);

  const updated = db.prepare('SELECT * FROM adjustment_requests WHERE id = ?').get(requestId);
  res.json(updated);
});

module.exports = router;
