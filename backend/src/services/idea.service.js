const { query, withTransaction } = require('../config/database');
const { safeRedis: redis } = require('../config/redis');

const IDEA_CACHE_TTL = 60;

const getIdeas = async ({ page = 1, limit = 20, status = 'active' }) => {
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT
       i.id, i.title, i.description, i.tech_stack, i.status,
       i.proof_url, i.proof_type, i.deadline, i.shipped_at, i.created_at,
       u.username, u.full_name, u.avatar_url,
       COUNT(DISTINCT ic.id) FILTER (WHERE ic.status = 'accepted') AS collaborator_count,
       ARRAY_AGG(DISTINCT jsonb_build_object(
         'username', cu.username,
         'full_name', cu.full_name,
         'avatar_url', cu.avatar_url
       )) FILTER (WHERE ic.status = 'accepted' AND cu.id IS NOT NULL) AS collaborators,
       EXTRACT(EPOCH FROM (i.deadline - NOW())) AS seconds_remaining
     FROM ideas i
     JOIN users u ON u.id = i.posted_by
     LEFT JOIN idea_collaborators ic ON ic.idea_id = i.id
     LEFT JOIN users cu ON cu.id = ic.user_id AND ic.status = 'accepted'
     WHERE i.deleted_at IS NULL
       AND ($1 = 'all' OR i.status::text = $1)
     GROUP BY i.id, u.username, u.full_name, u.avatar_url
     ORDER BY i.created_at DESC
     LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM ideas WHERE deleted_at IS NULL AND ($1 = 'all' OR status::text = $1)`,
    [status]
  );

  return {
    ideas: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page, limit,
      pages: Math.ceil(countResult.rows[0].count / limit),
    },
  };
};

const getIdea = async (ideaId) => {
  const result = await query(
    `SELECT
       i.id, i.title, i.description, i.tech_stack, i.status,
       i.proof_url, i.proof_type, i.proof_note, i.deadline,
       i.shipped_at, i.abandoned_at, i.created_at,
       u.id AS poster_id, u.username, u.full_name, u.avatar_url,
       EXTRACT(EPOCH FROM (i.deadline - NOW())) AS seconds_remaining
     FROM ideas i
     JOIN users u ON u.id = i.posted_by
     WHERE i.id = $1 AND i.deleted_at IS NULL`,
    [ideaId]
  );
  if (!result.rows.length) return null;

  const collaborators = await query(
    `SELECT
       ic.id, ic.status, ic.message, ic.created_at,
       u.username, u.full_name, u.avatar_url
     FROM idea_collaborators ic
     JOIN users u ON u.id = ic.user_id
     WHERE ic.idea_id = $1
     ORDER BY ic.created_at ASC`,
    [ideaId]
  );

  return { ...result.rows[0], collaborators: collaborators.rows };
};

const createIdea = async (userId, { title, description, techStack }) => {
  const deadline = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);

  const result = await query(
    `INSERT INTO ideas (posted_by, title, description, tech_stack, deadline)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, description, tech_stack, status, deadline, created_at`,
    [userId, title, description, techStack || [], deadline]
  );

  return result.rows[0];
};

const submitProof = async (userId, ideaId, { proofUrl, proofType, proofNote }) => {
  const idea = await query(
    'SELECT * FROM ideas WHERE id = $1 AND deleted_at IS NULL',
    [ideaId]
  );
  if (!idea.rows.length) throw new Error('Idea not found.');
  if (idea.rows[0].posted_by !== userId) throw new Error('Not your idea.');
  if (idea.rows[0].status !== 'active') throw new Error('Idea is no longer active.');

  const result = await query(
    `UPDATE ideas
     SET status = 'shipped', proof_url = $1, proof_type = $2,
         proof_note = $3, shipped_at = NOW(), updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [proofUrl, proofType, proofNote || null, ideaId]
  );

  return result.rows[0];
};

const requestCollaboration = async (userId, ideaId, message) => {
  const idea = await query(
    'SELECT * FROM ideas WHERE id = $1 AND deleted_at IS NULL',
    [ideaId]
  );
  if (!idea.rows.length) throw new Error('Idea not found.');
  if (idea.rows[0].posted_by === userId) throw new Error('Cannot collaborate on your own idea.');
  if (idea.rows[0].status !== 'active') throw new Error('Idea is no longer active.');

  // Check max collaborators
  const count = await query(
    `SELECT COUNT(*) FROM idea_collaborators WHERE idea_id = $1 AND status = 'accepted'`,
    [ideaId]
  );
  if (parseInt(count.rows[0].count) >= 3) throw new Error('Maximum collaborators reached.');

  const result = await query(
    `INSERT INTO idea_collaborators (idea_id, user_id, message)
     VALUES ($1, $2, $3)
     ON CONFLICT (idea_id, user_id) DO UPDATE SET message = $3, updated_at = NOW()
     RETURNING *`,
    [ideaId, userId, message || null]
  );

  return result.rows[0];
};

const respondToCollaboration = async (ownerId, ideaId, collaboratorId, accept) => {
  const idea = await query(
    'SELECT * FROM ideas WHERE id = $1 AND posted_by = $2',
    [ideaId, ownerId]
  );
  if (!idea.rows.length) throw new Error('Not your idea.');

  const result = await query(
    `UPDATE idea_collaborators
     SET status = $1, updated_at = NOW()
     WHERE idea_id = $2 AND user_id = $3
     RETURNING *`,
    [accept ? 'accepted' : 'rejected', ideaId, collaboratorId]
  );

  return result.rows[0];
};

const expireIdeas = async () => {
  const result = await query(
    `UPDATE ideas
     SET status = 'abandoned', abandoned_at = NOW(), updated_at = NOW()
     WHERE status = 'active'
       AND deadline < NOW()
       AND deleted_at IS NULL
     RETURNING id, posted_by, title`
  );
  return result.rows;
};

module.exports = {
  getIdeas, getIdea, createIdea, submitProof,
  requestCollaboration, respondToCollaboration, expireIdeas,
};