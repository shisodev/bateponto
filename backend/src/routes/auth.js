const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  db.prepare(`
    INSERT INTO activity_logs (user_id, action, details, ip_address)
    VALUES (?, ?, ?, ?)
  `).run(user.id, 'login', `Login realizado por ${user.full_name}`, req.ip);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role
    }
  });
});

router.post('/logout', authenticateToken, (req, res) => {
  db.prepare(`
    INSERT INTO activity_logs (user_id, action, details, ip_address)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, 'logout', `Logout realizado por ${req.user.full_name}`, req.ip);

  res.json({ message: 'Logout realizado com sucesso' });
});

router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, full_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(user);
});

module.exports = router;
