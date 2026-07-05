const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/settings/resume
router.get('/resume', async (req, res) => {
  try {
    const row = await db.get('SELECT value FROM settings WHERE key = ?', ['resume']);
    res.json({ resume: row ? row.value : '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// POST /api/settings/resume
router.post('/resume', async (req, res) => {
  const { resume } = req.body;
  if (resume === undefined) return res.status(400).json({ error: 'Resume text is required' });

  try {
    await db.run(`
      INSERT INTO settings (key, value) VALUES ('resume', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [resume]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

module.exports = router;
