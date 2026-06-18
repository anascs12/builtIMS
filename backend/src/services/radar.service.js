const { query } = require('../config/database');
const { safeRedis: redis } = require('../config/redis');

const CACHE_TTL = 60 * 60; // 1 hour

const getMonday = (date) => {
  const d    = new Date(date);
  const day  = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

const getPlatformRadar = async () => {
  const cacheKey = 'radar:platform';
  const cached   = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const weekStart = getMonday(new Date());

  // Get top demanded skills this week
  const demandResult = await query(
    `SELECT
       tt.id, tt.slug, tt.label, tt.category,
       SUM(msd.job_count)   AS total_jobs,
       ARRAY_AGG(DISTINCT msd.source) AS sources,
       ARRAY_AGG(msd.sample_urls) AS all_urls
     FROM market_skill_demand msd
     JOIN tech_tags tt ON tt.id = msd.tag_id
     WHERE msd.week_start = $1
     GROUP BY tt.id, tt.slug, tt.label, tt.category
     ORDER BY total_jobs DESC
     LIMIT 20`,
    [weekStart]
  );

  // Get total student skill demonstrations
  const studentSkillsResult = await query(
    `SELECT
       pt.tag_id,
       COUNT(DISTINCT p.submitted_by) AS student_count
     FROM project_tags pt
     JOIN projects p ON p.id = pt.project_id
     WHERE p.status IN ('approved','archived')
     GROUP BY pt.tag_id`
  );

  const studentSkillMap = {};
  studentSkillsResult.rows.forEach((r) => {
    studentSkillMap[r.tag_id] = parseInt(r.student_count);
  });

  // Get total active students
  const totalStudents = await query(
    "SELECT COUNT(*) FROM users WHERE role = 'student' AND status = 'active' AND deleted_at IS NULL"
  );
  const activeCount = parseInt(totalStudents.rows[0].count) || 1;

  const radar = demandResult.rows.map((skill) => {
    // Flatten sample URLs
    const urls = (skill.all_urls || [])
      .flat()
      .filter(Boolean)
      .slice(0, 5);

    const studentCount    = studentSkillMap[skill.id] || 0;
    const adoptionRate    = Math.round((studentCount / activeCount) * 100);
    const demandScore     = parseInt(skill.total_jobs);
    const gapScore        = Math.max(0, demandScore - adoptionRate);

    return {
      tagId:        skill.id,
      slug:         skill.slug,
      label:        skill.label,
      category:     skill.category,
      demandScore,
      adoptionRate,
      gapScore,
      studentCount,
      sources:      skill.sources,
      sampleUrls:   urls,
      searchUrl:    `https://www.rozee.pk/job/jsearch/q/${encodeURIComponent(skill.label)}`,
    };
  });

  const response = {
    radar,
    weekStart,
    lastUpdated: new Date().toISOString(),
    totalJobsScanned: radar.reduce((sum, s) => sum + s.demandScore, 0),
  };

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
  return response;
};

const getPersonalGap = async (userId) => {
  const cacheKey = `radar:personal:${userId}`;
  const cached   = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Get skills the user has demonstrated (via projects)
  const projectSkills = await query(
    `SELECT DISTINCT pt.tag_id
     FROM project_tags pt
     JOIN projects p ON p.id = pt.project_id
     WHERE p.submitted_by = $1
       AND p.status IN ('approved','archived','pending_moderation')`,
    [userId]
  );

  // Get skills from challenge completions
  const challengeSkills = await query(
    `SELECT DISTINCT unnest(c.tech_tags) AS tag_id
     FROM challenge_submissions cs
     JOIN challenges c ON c.id = cs.challenge_id
     WHERE cs.user_id = $1`,
    [userId]
  );

  const demonstratedSkills = new Set([
    ...projectSkills.rows.map((r) => r.tag_id),
    ...challengeSkills.rows.map((r) => r.tag_id),
  ]);

  // Get market demand
  const weekStart     = getMonday(new Date());
  const demandResult  = await query(
    `SELECT
       tt.id, tt.slug, tt.label, tt.category,
       SUM(msd.job_count) AS total_jobs,
       ARRAY_AGG(msd.sample_urls) AS all_urls
     FROM market_skill_demand msd
     JOIN tech_tags tt ON tt.id = msd.tag_id
     WHERE msd.week_start = $1
     GROUP BY tt.id, tt.slug, tt.label, tt.category
     ORDER BY total_jobs DESC
     LIMIT 20`,
    [weekStart]
  );

  const gaps = demandResult.rows.map((skill) => {
    const demonstrated = demonstratedSkills.has(skill.id);
    const urls = (skill.all_urls || []).flat().filter(Boolean).slice(0, 3);
    const demandScore  = parseInt(skill.total_jobs);

    // Estimate weeks to close gap based on challenge frequency
    // Rough estimate: 2 challenges per skill area per week
    const weeksToClose = demonstrated ? 0 : Math.ceil(demandScore / 5);

    return {
      tagId:        skill.id,
      slug:         skill.slug,
      label:        skill.label,
      category:     skill.category,
      demandScore,
      demonstrated,
      weeksToClose,
      sampleUrls:   urls,
      searchUrl:    `https://www.rozee.pk/job/jsearch/q/${encodeURIComponent(skill.label)}`,
    };
  });

  const response = {
    gaps,
    demonstratedCount: demonstratedSkills.size,
    gapCount:          gaps.filter((g) => !g.demonstrated).length,
    weekStart,
  };

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
  return response;
};

const getLastScrapeInfo = async () => {
  const result = await query(
    `SELECT
       COUNT(*) AS total_jobs,
       MAX(scraped_at) AS last_scraped,
       COUNT(DISTINCT source) AS sources
     FROM job_postings
     WHERE scraped_at >= NOW() - INTERVAL '7 days'`
  );
  return result.rows[0];
};

module.exports = { getPlatformRadar, getPersonalGap, getLastScrapeInfo };