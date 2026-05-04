const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../middleware/auth');
const supabase = require('../supabase');

// ── LOGIN ──
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Contraseña requerida' });

  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH || '')
    || password === process.env.ADMIN_PASSWORD;

  if (!valid) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const token = jwt.sign(
    { role: 'admin', iat: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, expiresIn: '24h' });
});

// ── ANALYTICS: resumen general ──
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const day7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const day30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: totalVisits },
      { count: visits7d },
      { count: totalApps },
      { count: pendingApps },
      { count: totalRaffles },
      { count: totalTrivia },
      visitsPerDay,
      recentApps,
      triviaAvg,
      raffleRecent
    ] = await Promise.all([
      supabase.from('visits').select('*', { count: 'exact', head: true }),
      supabase.from('visits').select('*', { count: 'exact', head: true }).gte('created_at', day7),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('raffles').select('*', { count: 'exact', head: true }),
      supabase.from('trivia_results').select('*', { count: 'exact', head: true }),
      supabase.from('visits').select('created_at').gte('created_at', day30).order('created_at'),
      supabase.from('applications').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('trivia_results').select('score, total'),
      supabase.from('raffles').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    // Agrupar visitas por día
    const visitsByDay = {};
    (visitsPerDay.data || []).forEach(v => {
      const day = v.created_at.slice(0, 10);
      visitsByDay[day] = (visitsByDay[day] || 0) + 1;
    });

    // Promedio trivia
    const triviaData = triviaAvg.data || [];
    const avgScore = triviaData.length
      ? (triviaData.reduce((a, b) => a + (b.score / b.total) * 100, 0) / triviaData.length).toFixed(1)
      : 0;

    res.json({
      summary: {
        totalVisits,
        visits7d,
        totalApplications: totalApps,
        pendingApplications: pendingApps,
        totalRaffles,
        totalTrivia,
        triviaAvgScore: avgScore + '%'
      },
      visitsByDay,
      recentApplications: recentApps.data || [],
      recentRaffles: raffleRecent.data || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── APPLICATIONS: listar y cambiar estado ──
router.get('/applications', requireAdmin, async (req, res) => {
  const { status } = req.query;
  let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/applications/:id', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido' });

  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── TOGGLE POSTULACIONES (guardar estado en una tabla simple) ──
router.get('/settings', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('settings').select('*').eq('key', 'applications_open').single();
  res.json({ applicationsOpen: data?.value === 'true' });
});

router.post('/settings', requireAdmin, async (req, res) => {
  const { applicationsOpen } = req.body;
  await supabase.from('settings').upsert({ key: 'applications_open', value: String(applicationsOpen) });
  res.json({ ok: true });
});

module.exports = router;
