const express = require('express');
const router = express.Router();
const db = require('../database');
const { parseVacancies } = require('../parse');
const { generateCoverLetter } = require('../generate');

let parseState = {
  isRunning: false,
  keyword: '',
  step: '',
  current: 0,
  total: 0
};

// POST /api/actions/parse
router.post('/parse', async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  // Respond immediately so frontend doesn't timeout, run parsing in background
  res.json({ success: true, message: 'Parsing started in the background.' });

  if (parseState.isRunning) {
    console.log('[API] Parsing is already running.');
    return;
  }

  parseState = { isRunning: true, keyword, step: 'Starting...', current: 0, total: 0 };

  try {
    console.log(`[API] Started parsing for: ${keyword}`);
    
    // Clear the DB upon a new search
    await db.run('DELETE FROM vacancies');

    const results = await parseVacancies(keyword, (progress) => {
      parseState.step = progress.step;
      parseState.current = progress.current;
      parseState.total = progress.total;
    });

    // Insert/upsert into DB
    for (const vac of results) {
      await db.run(`
        INSERT INTO vacancies (id, title, link, company, salary, published_at, description, contacts, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title,
          link=excluded.link,
          company=excluded.company,
          salary=excluded.salary,
          published_at=excluded.published_at,
          description=excluded.description,
          contacts=excluded.contacts
      `, [vac.id, vac.title, vac.link, vac.company, vac.salary, vac.published_at, vac.description, vac.contacts]);
    }
    console.log(`[API] Parsing finished for: ${keyword}. Saved ${results.length} vacancies.`);
  } catch (err) {
    console.error(`[API] Parsing failed:`, err);
  } finally {
    parseState.isRunning = false;
  }
});

// GET /api/actions/parse/progress
router.get('/parse/progress', (req, res) => {
  res.json(parseState);
});

// POST /api/actions/generate/:id
router.post('/generate/:id', async (req, res) => {
  try {
    const vacancy = await db.get('SELECT * FROM vacancies WHERE id = ?', [req.params.id]);
    if (!vacancy) return res.status(404).json({ error: 'Vacancy not found' });

    const resumeRow = await db.get('SELECT value FROM settings WHERE key = ?', ['resume']);
    if (!resumeRow || !resumeRow.value) {
      return res.status(400).json({ error: 'Resume not found. Please upload a resume first.' });
    }

    const letter = await generateCoverLetter(vacancy, resumeRow.value);

    // Save the letter and optionally update status to draft_ready
    const newStatus = vacancy.status === 'new' ? 'draft_ready' : vacancy.status;
    await db.run('UPDATE vacancies SET status = ?, letter = ? WHERE id = ?', [newStatus, letter, req.params.id]);

    res.json({ success: true, letter });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate cover letter', details: err.message });
  }
});

module.exports = router;
