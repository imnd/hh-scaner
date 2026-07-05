const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/vacancies
router.get('/', async (req, res) => {
  try {
    const vacancies = await db.all('SELECT * FROM vacancies ORDER BY created_at DESC');
    res.json(vacancies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vacancies' });
  }
});

// GET /api/vacancies/:id
router.get('/:id', async (req, res) => {
  try {
    const vacancy = await db.get('SELECT * FROM vacancies WHERE id = ?', [req.params.id]);
    if (!vacancy) return res.status(404).json({ error: 'Vacancy not found' });
    res.json(vacancy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vacancy' });
  }
});

// PUT /api/vacancies/:id/status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    await db.run('UPDATE vacancies SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
