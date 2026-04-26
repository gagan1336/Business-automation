// server/index.js — Premium Booking Platform Express Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Startup Validation ───────────────────────────────────────────────────────
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required env vars: ${missingVars.join(', ')}`);
  console.error('   Copy server/.env.example to server/.env and configure.');
}

// ── Security & Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
  credentials: true,
}));

// Raw body for Stripe + Meta webhooks (MUST be before JSON parse)
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID for tracing
app.use((req, res, next) => {
  req.requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/bookings',    require('./routes/bookings'));
app.use('/api/customers',   require('./routes/customers'));
app.use('/api/walkins',     require('./routes/walkins'));
app.use('/api/services',    require('./routes/services'));
app.use('/api/staff',       require('./routes/staff'));
app.use('/api/conversations', require('./routes/inbox'));
app.use('/api/channels',    require('./routes/channels'));
app.use('/api/automations', require('./routes/automation'));
app.use('/api/analytics',   require('./routes/analytics'));
app.use('/api/webhooks',    require('./routes/webhooks'));
app.use('/api/billing',     require('./routes/billing'));
app.use('/api/public',      require('./routes/public'));
app.use('/api/compliance',  require('./routes/compliance'));

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] [${req.requestId}]`, err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    requestId: req.requestId,
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Gemini LLM: ${process.env.GEMINI_API_KEY ? 'configured ✅' : 'not configured (using fallback templates)'}`);

  // Start the task scheduler (replaces BullMQ)
  try {
    const { startScheduler } = require('./services/scheduler');
    startScheduler();
  } catch (err) {
    console.error('   Scheduler failed to start:', err.message);
  }
});

module.exports = app;
