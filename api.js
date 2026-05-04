const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// ── REGISTRAR VISITA ──
router.post('/visit', async (req, res) => {
  const { page, referrer } = req.body;
  const userAgent = req.headers['user-agent'] || '';
  await supabase.from('visits').insert({ page: page || '/', referrer, user_agent: userAgent });
  res.json({ ok: true });
});

// ── ESTADO POSTULACIONES (público, para saber si mostrar el form) ──
router.get('/applications/status', async (req, res) => {
  const { data } = await supabase.from('settings').select('value').eq('key', 'applications_open').single();
  res.json({ open: data?.value !== 'false' });
});

// ── ENVIAR POSTULACIÓN ──
router.post('/applications', async (req, res) => {
  const { roblox_user, discord, role, motivation, experience } = req.body;

  if (!roblox_user || !discord || !role) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // Verificar si está abierto
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'applications_open').single();
  if (setting?.value === 'false') {
    return res.status(403).json({ error: 'Las postulaciones están cerradas' });
  }

  const { error } = await supabase.from('applications').insert({
    roblox_user, discord, role, motivation, experience
  });

  if (error) return res.status(500).json({ error: 'Error al guardar' });
  res.json({ ok: true, message: '¡Postulación enviada!' });
});

// ── GUARDAR SORTEO ──
router.post('/raffle', async (req, res) => {
  const { participants, winner } = req.body;
  if (!winner || !participants?.length) return res.status(400).json({ error: 'Datos inválidos' });

  await supabase.from('raffles').insert({
    participants,
    winner,
    total_participants: participants.length
  });

  res.json({ ok: true });
});

// ── GUARDAR RESULTADO TRIVIA ──
router.post('/trivia', async (req, res) => {
  const { score, total } = req.body;
  if (score === undefined || !total) return res.status(400).json({ error: 'Datos inválidos' });

  await supabase.from('trivia_results').insert({ score, total });
  res.json({ ok: true });
});

module.exports = router;
