const fs = require('fs');
const path = require('path');
require('dotenv').config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const MODEL_NAME = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

async function generateCoverLetter(vacancy, resume) {
  const prompt = `Напиши персонализированное сопроводительное письмо для отклика на вакансию.

Вакансия:
Название: ${vacancy.title}
Компания: ${vacancy.company}
Описание: ${vacancy.description}

Мое резюме:
${resume}

Требования к письму:
- Письмо должно быть вежливым, деловым и лаконичным.
- Не используй штампы и клише (например, "я быстро обучаюсь", "коммуникабельный").
- Выдели 2-3 моих сильных стороны из резюме, которые напрямую подходят под требования вакансии.
- Не придумывай опыт или навыки, которых нет в моем резюме.
- В конце укажи готовность к интервью.
- Верни только текст письма, без дополнительных комментариев.`;

  const requestBody = JSON.stringify({
    model: MODEL_NAME,
    prompt: prompt,
    stream: false
  });

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (err) {
    console.error('Error connecting to Ollama API. Make sure Ollama is running locally on port 11434.', err.message);
    throw err;
  }
}

// Preserve CLI functionality if run directly
if (require.main === module) {
  const vacancyId = process.argv[2];

  if (!vacancyId) {
    console.error('Please provide a vacancy ID. Usage: node generate.js <vacancy_id>');
    process.exit(1);
  }

  let vacancies = [];
  try {
    vacancies = JSON.parse(fs.readFileSync('vacancies.json', 'utf-8'));
  } catch (err) {
    console.error('Error reading vacancies.json. Make sure to run parse.js first.', err.message);
    process.exit(1);
  }

  const vacancy = vacancies.find(v => v.id === vacancyId);
  if (!vacancy) {
    console.error(`Vacancy with ID ${vacancyId} not found in vacancies.json`);
    process.exit(1);
  }

  let resume = '';
  try {
    resume = fs.readFileSync('resume.txt', 'utf-8');
  } catch (err) {
    console.error('Error reading resume.txt. Please create this file with your resume text.', err.message);
    process.exit(1);
  }

  console.log(`Generating cover letter for vacancy: ${vacancy.title} at ${vacancy.company}...`);

  generateCoverLetter(vacancy, resume).then(letter => {
    const draftsDir = path.join(__dirname, 'drafts');
    if (!fs.existsSync(draftsDir)) {
      fs.mkdirSync(draftsDir);
    }
    const filename = path.join(draftsDir, `${vacancyId}.txt`);
    fs.writeFileSync(filename, letter);

    console.log('\n--- Draft generated successfully ---');
    console.log(`Saved to: ${filename}`);
    console.log('\nPreview:\n' + letter);
  }).catch(console.error);
}

module.exports = { generateCoverLetter };
