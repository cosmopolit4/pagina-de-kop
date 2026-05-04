require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ── TRUST PROXY (Railway) ──
app.set('trust proxy', 1);

// ── CSP PERMISIVO (permite inline scripts) ──
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'");
  next();
});

// ── SEGURIDAD ──
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.SITE_URL || '*']
    : '*',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const generalLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones, esperá un momento' }
});

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login' }
});

const submitLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiadas postulaciones desde esta IP' }
});

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

// ── STATIC FILES ──
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// ── RUTAS ──
app.use('/api', generalLimit, apiRoutes);
app.use('/api/admin/login', loginLimit);
app.use('/api/admin/applications', submitLimit);
app.use('/api/admin', adminRoutes);

// ── HEALTH CHECK ──
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── FALLBACK → index.html ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── MANEJO DE ERRORES ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🎭 KOP Producciones corriendo en puerto ${PORT}`);
});
