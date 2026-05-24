require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const activitiesRouter = require('./routes/activities');
const activityCommentsRouter = require('./routes/activityComments');
const adminRouter = require('./routes/admin');
const skillsRouter         = require('./routes/skills');
const notificationsRouter  = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 4000;

// ---- middleware ----
app.use(helmet());
app.use(express.json({ limit: '4mb' })); // raised to support base64 avatar uploads (~2 MB image → ~2.7 MB base64)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);          // allow curl / same-origin
    if (allowedOrigins.includes(origin)) return cb(null, true);
    const err = new Error(`CORS: origin ${origin} not allowed`);
    err.status = 403;
    cb(err);
  },
  credentials: true,
}));

// ---- static uploads ----
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ---- routes ----
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'ai-skills-portal' }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/activities', activityCommentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/skills',        skillsRouter);
app.use('/api/notifications', notificationsRouter);

// 404
app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.path}` }));

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

if (!process.env.JWT_SECRET) {
  console.warn('[warn] JWT_SECRET not set — using insecure default. Set it in .env before deploying.');
  process.env.JWT_SECRET = 'dev-only-insecure-secret';
}

app.listen(PORT, () => {
  console.log(`AI Skills Portal API listening on http://localhost:${PORT}`);
});
