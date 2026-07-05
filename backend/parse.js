require('dotenv').config();
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

const wait = (min, max) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)));

async function getFreeProxies() {
  console.log('Fetching free HTTP proxies from multiple sources...');
  
  const sources = [
    'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=3000&country=all&ssl=all&anonymity=all',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
    'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt'
  ];

  try {
    const responses = await Promise.allSettled(sources.map(url => fetch(url).then(res => res.text())));
    
    let allProxies = new Set();
    
    for (const result of responses) {
      if (result.status === 'fulfilled' && result.value) {
        const lines = result.value.split(/\r?\n/);
        for (const line of lines) {
          const p = line.trim();
          // basic validation for IP:PORT
          if (p && p.includes(':') && !p.startsWith('{') && !p.startsWith('<')) {
            allProxies.add(p);
          }
        }
      }
    }
    
    const proxiesArray = Array.from(allProxies);
    console.log(`Loaded ${proxiesArray.length} unique free proxies.`);
    
    // Shuffle the array so we don't always try the same proxies first
    for (let i = proxiesArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [proxiesArray[i], proxiesArray[j]] = [proxiesArray[j], proxiesArray[i]];
    }
    
    return proxiesArray;
  } catch (e) {
    console.error('Failed to fetch proxies, continuing without proxy', e);
    return [];
  }
}

// Proxy selection is handled inline to easily remove dead ones

async function parseVacancies(keyword = '', onProgress = () => {}) {
  console.log(`Starting parse for keyword: ${keyword}`);

  onProgress({ step: 'Initializing', current: 0, total: 0 });
  const proxies = await getFreeProxies();

  const browser = await chromium.launch({ headless: true });

  // Wrapper to execute page actions with a random proxy and retries
  async function runWithProxy(action, retries = 200) {
    for (let i = 0; i < retries; i++) {
      if (proxies.length === 0) {
         console.error('  [!] Proxy pool is empty. Stopping.');
         return null;
      }
      
      const rawProxy = proxies[Math.floor(Math.random() * proxies.length)];
      const proxy = { server: `http://${rawProxy}` };
      console.log(`  [Proxy: ${proxy.server}] (Attempt ${i + 1}/${retries})`);
      
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        proxy: proxy,
        ignoreHTTPSErrors: true // Free proxies often have SSL issues
      });
      
      const page = await context.newPage();
      // Block images and media to save bandwidth and speed up free proxies
      await page.route('**/*.{png,jpg,jpeg,webp,gif,svg,css,woff2,woff}', route => route.abort());

      try {
        const result = await action(page);
        await context.close();
        return result;
      } catch (err) {
        console.error(`  [!] Error: ${err.message.split('\n')[0]}`);
        await context.close();
        
        // Remove dead proxy from the pool
        const idx = proxies.indexOf(rawProxy);
        if (idx !== -1) {
          proxies.splice(idx, 1);
          console.log(`  [!] Removed proxy. ${proxies.length} proxies left.`);
        }

        if (i === retries - 1) {
          console.error(`  [!] Failed after ${retries} attempts.`);
          return null; // Don't crash, just return null so we can skip this item
        }
      }
    }
  }

  let vacancies = [];

  const searchUrl = `https://hh.ru/search/vacancy?text=${encodeURIComponent(keyword)}&area=113`;
  
  onProgress({ step: 'Fetching search results', current: 0, total: 0 });
  console.log('Fetching main search page...');
  const searchResult = await runWithProxy(async (page) => {
    // 35 seconds timeout to give slow free proxies a chance
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await wait(2000, 4000);

    if (await page.locator('form[action="/account/captcha"]').count() > 0 || await page.title() === 'Ой!') {
      throw new Error('CAPTCHA blocked the proxy');
    }

    const vacancyCards = page.locator('[data-qa="vacancy-serp__vacancy"]');
    const count = await vacancyCards.count();
    console.log(`  Found ${count} vacancies on page 1`);
    
    let items = [];
    for (let i = 0; i < count; i++) {
      const card = vacancyCards.nth(i);
      const titleLoc = card.locator('[data-qa="serp-item__title"], [data-qa="vacancy-title"]');
      const companyLoc = card.locator('[data-qa="vacancy-serp__vacancy-employer"]');
      const salaryLoc = card.locator('[data-qa="vacancy-serp__vacancy-compensation"]');
      const dateLoc = card.locator('[data-qa="vacancy-serp__vacancy-date"]');

      let title = '', link = '', company = '', companyLink = '', salary = '', publishedAt = '';

      if (await titleLoc.count() > 0) {
        title = await titleLoc.textContent();
        link = await titleLoc.getAttribute('href');
      }
      if (await companyLoc.count() > 0) {
        company = await companyLoc.textContent();
        companyLink = await companyLoc.getAttribute('href');
      }
      if (await salaryLoc.count() > 0) salary = await salaryLoc.textContent();
      if (await dateLoc.count() > 0) publishedAt = await dateLoc.textContent();

      title = title ? title.trim() : '';
      publishedAt = publishedAt ? publishedAt.trim().replace(/\u00A0/g, ' ') : '';
      company = company ? company.trim().replace(/\u00A0/g, ' ') : '';
      salary = salary ? salary.trim().replace(/\u202F/g, ' ') : '';

      let idMatch = link ? link.split('?')[0].match(/\/vacancy\/(\d+)/) : null;
      let id = idMatch ? idMatch[1] : `unknown-${Math.floor(Math.random()*10000)}`;

      items.push({
        id,
        title,
        link: link ? link.split('?')[0] : '',
        company,
        companyLink: companyLink ? (companyLink.startsWith('http') ? companyLink : `https://hh.ru${companyLink}`).split('?')[0] : '',
        salary,
        published_at: publishedAt,
        description: '',
        contacts: ''
      });
    }
    return items;
  });

  if (searchResult) {
    vacancies = searchResult;
  }

  console.log('\nFetching details for each vacancy...');
  for (let i = 0; i < vacancies.length; i++) {
    const vac = vacancies[i];
    if (!vac.link) continue;

    onProgress({ step: 'Fetching vacancy details', current: i + 1, total: vacancies.length });
    console.log(`\nVisiting (${i + 1}/${vacancies.length}): ${vac.title}`);
    
    const details = await runWithProxy(async (page) => {
      // 35 seconds timeout for slow proxies
      await page.goto(vac.link, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await wait(2000, 4000);

      if (await page.locator('form[action="/account/captcha"]').count() > 0 || await page.title() === 'Ой!') {
         throw new Error('CAPTCHA blocked the proxy');
      }

      let description = '', contacts = '';
      
      const descLoc = page.locator('[data-qa="vacancy-description"]');
      if (await descLoc.count() > 0) {
        description = (await descLoc.textContent()).trim();
      }

      if (!description) {
         throw new Error('Description not found - proxy likely blocked or Cloudflare challenge shown');
      }

      const contactsLoc = page.locator('[data-qa="vacancy-contacts-element"]');
      if (await contactsLoc.count() > 0) {
        const contactTexts = await contactsLoc.allTextContents();
        contacts = contactTexts.map(t => t.trim()).join(' | ');
      }
      
      // Try finding contacts on the company profile if nothing on the vacancy page
      if (!contacts && vac.companyLink) {
         try {
           await page.goto(vac.companyLink, { waitUntil: 'domcontentloaded', timeout: 35000 });
           await wait(2000, 4000);
           
           // Search for company website link directly by qa attribute
           const siteLoc = page.locator('[data-qa="sidebar-company-site"]');
           if (await siteLoc.count() > 0) {
             const siteHref = await siteLoc.first().getAttribute('href');
             if (siteHref) contacts = `Сайт компании: ${siteHref}`;
           }
           
           // Fallback evaluating links
           if (!contacts) {
             const extLinks = await page.evaluate(() => {
               return Array.from(document.querySelectorAll('a'))
                 .map(a => a.href)
                 .filter(href => href && href.startsWith('http') && !href.includes('hh.ru') && !href.includes('vk.com') && !href.includes('t.me'));
             });
             if (extLinks.length > 0) {
               contacts = `Сайт компании: ${extLinks[0]}`;
             }
           }
         } catch(e) {
           console.log(`    Failed to fetch company profile for ${vac.company}`);
         }
      }
      
      return { description, contacts };
    });

    if (details) {
      vac.description = details.description;
      vac.contacts = details.contacts;
    }
  }

  await browser.close();

  // Clean up companyLink before saving to JSON as requested
  const finalVacancies = vacancies.map(v => {
    const { companyLink, ...rest } = v;
    return rest;
  });

  return finalVacancies;
}

// Preserve CLI functionality if run directly
if (require.main === module) {
  const keyword = process.argv[2] || 'Node.js';
  parseVacancies(keyword).then(async (finalVacancies) => {
    // Save results
    fs.writeFileSync('vacancies.json', JSON.stringify(finalVacancies, null, 2));
    
    if (finalVacancies.length > 0) {
      const csvWriter = createObjectCsvWriter({
        path: 'vacancies.csv',
        header: [
          {id: 'id', title: 'ID'},
          {id: 'title', title: 'Title'},
          {id: 'company', title: 'Company'},
          {id: 'salary', title: 'Salary'},
          {id: 'link', title: 'Link'},
          {id: 'contacts', title: 'Contacts'},
        ]
      });
      await csvWriter.writeRecords(finalVacancies);
      console.log('\nResults saved to vacancies.json and vacancies.csv');
    } else {
      console.log('\nNo vacancies found to save.');
    }
  }).catch(console.error);
}

module.exports = { parseVacancies };
