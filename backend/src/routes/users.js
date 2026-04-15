const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Listar todos os funcionários (admin)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, full_name, role, active, created_at
    FROM users ORDER BY full_name
  `).all();
  res.json(users);
});

// Buscar funcionário por ID
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, full_name, role, active, created_at
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(user);
});

// Criar funcionário (admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, full_name, role = 'employee' } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Usuário, senha e nome completo são obrigatórios' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Nome de usuário já existe' });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role)
    VALUES (?, ?, ?, ?)
  `).run(username, password_hash, full_name, role);

  db.prepare(`
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (?, ?, ?)
  `).run(req.user.id, 'create_user', `Usuário criado: ${username} (${full_name})`);

  res.status(201).json({
    id: result.lastInsertRowid,
    username,
    full_name,
    role,
    active: 1
  });
});

// Atualizar funcionário (admin)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { full_name, password, active, role } = req.body;
  const userId = req.params.id;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  let password_hash = user.password_hash;
  if (password) {
    password_hash = bcrypt.hashSync(password, 10);
  }

  db.prepare(`
    UPDATE users SET
      full_name = COALESCE(?, full_name),
      password_hash = ?,
      active = COALESCE(?, active),
      role = COALESCE(?, role),
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(full_name || null, password_hash, active !== undefined ? active : null, role || null, userId);

  db.prepare(`
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (?, ?, ?)
  `).run(req.user.id, 'update_user', `Usuário atualizado: ID ${userId}`);

  const updated = db.prepare('SELECT id, username, full_name, role, active FROM users WHERE id = ?').get(userId);
  res.json(updated);
});

// Excluir funcionário (admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.id;

  if (parseInt(userId) === req.user.id) {
    return res.status(400).json({ error: 'Não é possível excluir sua própria conta' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  db.prepare(`
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (?, ?, ?)
  `).run(req.user.id, 'delete_user', `Usuário excluído: ${user.username} (${user.full_name})`);

  res.json({ message: 'Usuário excluído com sucesso' });
});

module.exports = router;
