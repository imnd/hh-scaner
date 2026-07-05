const BASE_URL = '/api';

export async function getVacancies() {
  const res = await fetch(`${BASE_URL}/vacancies`);
  if (!res.ok) throw new Error('Failed to fetch vacancies');
  return res.json();
}

export async function updateVacancyStatus(id, status) {
  const res = await fetch(`${BASE_URL}/vacancies/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

export async function parseVacancies(keyword) {
  const res = await fetch(`${BASE_URL}/actions/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword })
  });
  if (!res.ok) throw new Error('Failed to start parsing');
  return res.json();
}

export async function getParseProgress() {
  const res = await fetch(`${BASE_URL}/actions/parse/progress`);
  if (!res.ok) throw new Error('Failed to fetch progress');
  return res.json();
}

export async function generateLetter(id) {
  const res = await fetch(`${BASE_URL}/actions/generate/${id}`, {
    method: 'POST'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg = errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || 'Failed to generate cover letter');
    throw new Error(msg);
  }
  return res.json();
}

export async function getResume() {
  const res = await fetch(`${BASE_URL}/settings/resume`);
  if (!res.ok) throw new Error('Failed to fetch resume');
  return res.json();
}

export async function updateResume(resumeText) {
  const res = await fetch(`${BASE_URL}/settings/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume: resumeText })
  });
  if (!res.ok) throw new Error('Failed to update resume');
  return res.json();
}
