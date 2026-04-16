process.env.TZ = 'America/Sao_Paulo';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

require('./database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const timeRecordRoutes = require('./routes/timeRecords');
const scheduleRoutes = require('./routes/schedules');
const adjustmentRoutes = require('./routes/adjustments');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const dailyScheduleRoutes = require('./routes/dailySchedules');
const scheduleTemplateRoutes = require('./routes/scheduleTemplates');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/time-records', timeRecordRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/daily-schedules', dailyScheduleRoutes);
app.use('/api/schedule-templates', scheduleTemplateRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MG Bate-Ponto API funcionando!' });
});

app.listen(PORT, () => {
  console.log(`\n🌸 MG Bate-Ponto API rodando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}/api/health\n`);
});
