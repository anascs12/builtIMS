const { query, withTransaction } = require('../config/database');
const ApiError = require('../utils/ApiError');

const submitProject = async (userId, { title, description, programId, semester, githubUrl, demoUrl, techTags, teamMembers }) => {
  return withTransaction(async (client) => {
    // Insert project
    const projectResult = await client.query(
      `INSERT INTO projects
         (title, description, program_id, semester, github_url, demo_url, submitted_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_moderation')
       RETURNING *`,
      [title, description, programId, semester, githubUrl || null, demoUrl || null, userId]
    );

    const project = projectResult.rows[0];

    // Insert tech tags
    if (techTags && techTags.length > 0) {
      for (const tagId of techTags) {
        await client.query(
          'INSERT INTO project_tags (project_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [project.id, tagId]
        );
      }
    }

    // Insert team members
    if (teamMembers && teamMembers.length > 0) {
      for (const memberId of teamMembers) {
        if (memberId !== userId) {
          await client.query(
            'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [project.id, memberId]
          );
        }
      }
    }

    // Add to activity feed
    await client.query(
      `INSERT INTO activity_feed (actor_id, action, project_id)
       VALUES ($1, 'project_submitted', $2)`,
      [userId, project.id]
    );

    return project;
  });
};

const getProjects = async ({ search, programId, semester, tagId, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conditions = ["p.status IN ('approved', 'archived')", 'p.deleted_at IS NULL'];
  const params = [];
  let paramCount = 1;

  if (search) {
    conditions.push(`to_tsvector('english', p.title || ' ' || p.description) @@ plainto_tsquery('english', $${paramCount})`);
    params.push(search);
    paramCount++;
  }

  if (programId) {
    conditions.push(`p.program_id = $${paramCount}`);
    params.push(programId);
    paramCount++;
  }

  if (semester) {
    conditions.push(`p.semester = $${paramCount}`);
    params.push(semester);
    paramCount++;
  }

  if (tagId) {
    conditions.push(`EXISTS (SELECT 1 FROM project_tags pt WHERE pt.project_id = p.id AND pt.tag_id = $${paramCount})`);
    params.push(tagId);
    paramCount++;
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await query(
    `SELECT COUNT(*) FROM projects p ${whereClause}`,
    params
  );

  const projectsResult = await query(
    `SELECT p.id, p.title, p.description, p.semester, p.github_url, p.demo_url,
            p.created_at, p.status, p.cover_image,
            u.username, u.full_name, u.avatar_url,
            pr.code AS program_code,
            COALESCE(pvt.weighted_votes, 0) AS votes,
            ARRAY_AGG(DISTINCT tt.label) FILTER (WHERE tt.label IS NOT NULL) AS tech_tags
     FROM projects p
     JOIN users u                        ON u.id  = p.submitted_by
     JOIN programs pr                    ON pr.id = p.program_id
     LEFT JOIN project_vote_totals pvt   ON pvt.project_id = p.id
     LEFT JOIN project_tags pt           ON pt.project_id  = p.id
     LEFT JOIN tech_tags tt              ON tt.id          = pt.tag_id
     ${whereClause}
     GROUP BY p.id, u.username, u.full_name, u.avatar_url, pr.code, pvt.weighted_votes
     ORDER BY pvt.weighted_votes DESC NULLS LAST, p.created_at DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    [...params, limit, offset]
  );

  return {
    projects: projectsResult.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
      pages: Math.ceil(countResult.rows[0].count / limit),
    },
  };
};

const getProjectById = async (projectId) => {
  const result = await query(
    `SELECT p.id, p.title, p.description, p.semester, p.github_url, p.demo_url,
            p.status, p.created_at, p.ai_evaluation, p.cover_image,
            u.username, u.full_name, u.avatar_url,
            pr.code AS program_code, pr.name AS program_name,
            COALESCE(pvt.weighted_votes, 0) AS votes,
            ARRAY_AGG(DISTINCT tt.label) FILTER (WHERE tt.label IS NOT NULL) AS tech_tags
     FROM projects p
     JOIN users u                        ON u.id  = p.submitted_by
     JOIN programs pr                    ON pr.id = p.program_id
     LEFT JOIN project_vote_totals pvt   ON pvt.project_id = p.id
     LEFT JOIN project_tags pt           ON pt.project_id  = p.id
     LEFT JOIN tech_tags tt              ON tt.id          = pt.tag_id
     WHERE p.id = $1 AND p.deleted_at IS NULL
     GROUP BY p.id, u.username, u.full_name, u.avatar_url, pr.code, pr.name, pvt.weighted_votes`,
    [projectId]
  );

  if (!result.rows.length) throw ApiError.notFound('Project not found.');

  // Get team members
  const membersResult = await query(
    `SELECT u.username, u.full_name, u.avatar_url, pm.role
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1`,
    [projectId]
  );

  // Get screenshots
  const screenshotsResult = await query(
    'SELECT id, url, sort_order FROM project_screenshots WHERE project_id = $1 ORDER BY sort_order',
    [projectId]
  );

  return {
    ...result.rows[0],
    team:        membersResult.rows,
    screenshots: screenshotsResult.rows,
  };
};

const getMyProjects = async (userId) => {
  const result = await query(
    `SELECT p.id, p.title, p.description, p.semester, p.status,
            p.github_url, p.demo_url, p.created_at, p.rejection_reason,
            COALESCE(pvt.weighted_votes, 0) AS votes,
            ARRAY_AGG(DISTINCT tt.label) FILTER (WHERE tt.label IS NOT NULL) AS tech_tags
     FROM projects p
     LEFT JOIN project_vote_totals pvt ON pvt.project_id = p.id
     LEFT JOIN project_tags pt         ON pt.project_id  = p.id
     LEFT JOIN tech_tags tt            ON tt.id          = pt.tag_id
     WHERE p.submitted_by = $1 AND p.deleted_at IS NULL
     GROUP BY p.id, pvt.weighted_votes
     ORDER BY p.created_at DESC`,
    [userId]
  );

  return result.rows;
};

const getPendingProjects = async () => {
  const result = await query(
    `SELECT p.id, p.title, p.description, p.semester, p.github_url,
            p.created_at, u.username, u.full_name, pr.code AS program_code,
            ARRAY_AGG(DISTINCT tt.label) FILTER (WHERE tt.label IS NOT NULL) AS tech_tags
     FROM projects p
     JOIN users u    ON u.id  = p.submitted_by
     JOIN programs pr ON pr.id = p.program_id
     LEFT JOIN project_tags pt ON pt.project_id = p.id
     LEFT JOIN tech_tags tt    ON tt.id         = pt.tag_id
     WHERE p.status = 'pending_moderation' AND p.deleted_at IS NULL
     GROUP BY p.id, u.username, u.full_name, pr.code
     ORDER BY p.created_at ASC`
  );

  return result.rows;
};

const moderateProject = async (projectId, moderatorId, { action, rejectionReason }) => {
  if (!['approved', 'rejected'].includes(action)) {
    throw ApiError.badRequest('Action must be approved or rejected.');
  }

  if (action === 'rejected' && !rejectionReason) {
    throw ApiError.badRequest('Rejection reason is required.', null, 'REASON_REQUIRED');
  }

  const result = await withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE projects
       SET status           = $1,
           moderated_by     = $2,
           moderated_at     = NOW(),
           rejection_reason = $3
       WHERE id = $4 AND status = 'pending_moderation'
       RETURNING *`,
      [action, moderatorId, rejectionReason || null, projectId]
    );

    if (!updated.rows.length) {
      throw ApiError.notFound('Project not found or already moderated.');
    }

    if (action === 'approved') {
      await client.query(
        `INSERT INTO activity_feed (actor_id, action, project_id)
         VALUES ($1, 'project_approved', $2)`,
        [updated.rows[0].submitted_by, projectId]
      );

      // Refresh materialized views
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY project_vote_totals');
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY user_portfolio_stats');
    }

    return updated.rows[0];
  });

  return result;
};

module.exports = {
  submitProject,
  getProjects,
  getProjectById,
  getMyProjects,
  getPendingProjects,
  moderateProject,
};