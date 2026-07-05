const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function test() {
  const url = process.argv[2] || 'https://hh.ru/vacancy/134809772';
  console.log('Testing URL:', url);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const descLoc = page.locator('[data-qa="vacancy-description"]');
  const count = await descLoc.count();
  console.log('Count [vacancy-description]:', count);
  if (count > 0) {
    console.log('Text:', (await descLoc.first().textContent()).substring(0, 100));
  } else {
    console.log('Not found. Available data-qa containing "description" or "branded":');
    const qas = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-qa]'))
        .map(el => el.getAttribute('data-qa'))
        .filter(q => q && (q.includes('desc') || q.includes('branded') || q.includes('vacancy')));
    });
    console.log([...new Set(qas)]);
  }
  await browser.close();
}
test().catch(console.error);
