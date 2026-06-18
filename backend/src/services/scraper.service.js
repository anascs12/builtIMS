const axios  = require('axios');
const { query, withTransaction } = require('../config/database');
const logger = require('../utils/logger');

const SKILL_KEYWORDS = {
  'python':       ['python', 'django', 'flask', 'fastapi'],
  'javascript':   ['javascript', 'js', 'node.js', 'nodejs', 'react', 'vue', 'angular', 'express'],
  'typescript':   ['typescript', 'ts'],
  'java':         ['java', 'spring', 'hibernate'],
  'cpp':          ['c++', 'c plus plus'],
  'react':        ['react', 'reactjs', 'react.js'],
  'vue':          ['vue', 'vuejs', 'vue.js'],
  'nodejs':       ['node', 'nodejs', 'node.js', 'express'],
  'express':      ['express', 'expressjs'],
  'django':       ['django'],
  'flask':        ['flask'],
  'postgresql':   ['postgresql', 'postgres', 'psql'],
  'mysql':        ['mysql'],
  'mongodb':      ['mongodb', 'mongo'],
  'firebase':     ['firebase'],
  'tensorflow':   ['tensorflow', 'tf'],
  'pytorch':      ['pytorch', 'torch'],
  'sklearn':      ['scikit-learn', 'sklearn'],
  'flutter':      ['flutter'],
  'react-native': ['react native', 'react-native'],
  'android':      ['android', 'kotlin'],
  'docker':       ['docker', 'kubernetes', 'k8s'],
  'aws':          ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
  'git':          ['git', 'github', 'gitlab'],
  'html-css':     ['html', 'css', 'bootstrap', 'tailwind'],
  'tailwind':     ['tailwind'],
};

const getTagIds = async () => {
  const result = await query('SELECT id, slug FROM tech_tags WHERE is_active = TRUE');
  const map = {};
  result.rows.forEach((row) => { map[row.slug] = row.id; });
  return map;
};

const extractSkills = (text, tagIdMap) => {
  const lower    = (text || '').toLowerCase();
  const detected = new Set();
  for (const [slug, keywords] of Object.entries(SKILL_KEYWORDS)) {
    const tagId = tagIdMap[slug];
    if (!tagId) continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) { detected.add(tagId); break; }
    }
  }
  return [...detected];
};

const searchJSearch = async (query_str, location = 'Pakistan') => {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) throw new Error('JSEARCH_API_KEY not set in .env');

  const { data } = await axios.get('https://jsearch.p.rapidapi.com/search', {
    params: {
      query:      `${query_str} in ${location}`,
      num_pages:  '1',
      date_posted: 'week',
    },
    headers: {
      'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      'x-rapidapi-key':  apiKey,
    },
    timeout: 20000,
  });

  return (data.data || []).map((job) => ({
    source:      'jsearch',
    title:       job.job_title        || '',
    company:     job.employer_name    || '',
    location:    job.job_city         ? `${job.job_city}, ${job.job_country}` : (job.job_country || location),
    description: job.job_description  || job.job_title || '',
    jobUrl:      job.job_apply_link   || job.job_google_link || '',
    is_remote:   job.job_is_remote    || false,
  }));
};

const getMonday = (date) => {
  const d    = new Date(date);
  const day  = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

const saveJobsAndComputeDemand = async (jobs) => {
  const tagIdMap  = await getTagIds();
  const weekStart = getMonday(new Date());
  const demandMap = {};

  for (const job of jobs) {
    const text   = `${job.title} ${job.description || ''}`;
    const skills = extractSkills(text, tagIdMap);
    job.skills   = skills;

    for (const tagId of skills) {
      const key = `${tagId}:${job.source}`;
      if (!demandMap[key]) {
        demandMap[key] = { tagId, source: job.source, count: 0, urls: [] };
      }
      demandMap[key].count++;
      if (demandMap[key].urls.length < 5 && job.jobUrl) {
        demandMap[key].urls.push(job.jobUrl);
      }
    }
  }

  await withTransaction(async (client) => {
    await client.query(
      "DELETE FROM job_postings WHERE scraped_at < NOW() - INTERVAL '14 days'"
    );

    for (const job of jobs) {
      await client.query(
        `INSERT INTO job_postings
           (source, title, company, location, description, skills_detected, job_url, is_remote)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          job.source, job.title, job.company || null, job.location || null,
          (job.description || '').slice(0, 2000),
          job.skills || [], job.jobUrl || null, job.is_remote || false,
        ]
      );
    }

    for (const { tagId, source, count, urls } of Object.values(demandMap)) {
      await client.query(
        `INSERT INTO market_skill_demand
           (tag_id, week_start, job_count, source, location_scope, sample_urls)
         VALUES ($1,$2,$3,$4,'pakistan',$5)
         ON CONFLICT (tag_id, week_start, source, location_scope)
         DO UPDATE SET
           job_count   = market_skill_demand.job_count + EXCLUDED.job_count,
           sample_urls = EXCLUDED.sample_urls`,
        [tagId, weekStart, count, source, urls]
      );
    }
  });

  logger.info(`Saved ${jobs.length} jobs, ${Object.keys(demandMap).length} skill demand records`);
};

const runScraper = async () => {
  logger.info('Starting Skills Gap Radar scraper via JSearch...');
  try {
    const searches = [
      'software engineer',
      'web developer',
      'python developer',
      'react developer',
      'data scientist',
      'mobile developer',
    ];

    const allJobs = [];

    for (const search of searches) {
      try {
        logger.info(`Searching: ${search}`);
        const jobs = await searchJSearch(search, 'Pakistan');
        allJobs.push(...jobs);
        logger.info(`  → ${jobs.length} jobs found`);
        await new Promise((r) => setTimeout(r, 1000)); // Rate limit
      } catch (err) {
        logger.warn(`JSearch failed for "${search}"`, { error: err.message });
      }
    }

    if (allJobs.length > 0) {
      await saveJobsAndComputeDemand(allJobs);
      logger.info(`Scraper complete. Total jobs: ${allJobs.length}`);
    } else {
      logger.warn('No jobs returned from JSearch');
    }

    return allJobs.length;
  } catch (err) {
    logger.error('Scraper failed', { error: err.message });
    throw err;
  }
};

module.exports = { runScraper };