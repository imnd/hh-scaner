const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('./database');

const vacanciesRouter = require('./routes/vacancies');
const actionsRouter = require('./routes/actions');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Register API routes
app.use('/api/vacancies', vacanciesRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/settings', settingsRouter);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
