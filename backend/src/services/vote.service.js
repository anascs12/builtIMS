const { query, withTransaction } = require('../config/database');
const ApiError = require('../utils/ApiError');

const castVote = async (projectId, voterId, voterRole) => {
  return withTransaction(async (client) => {
    // Check project exists and is approved
    const projectResult = await client.query(
      `SELECT id, submitted_by, status FROM projects WHERE id = $1 AND deleted_at IS NULL`,
      [projectId]
    );

    if (!projectResult.rows.length) throw ApiError.notFound('Project not found.');

    const project = projectResult.rows[0];

    if (project.status !== 'approved') {
      throw ApiError.badRequest('You can only vote on approved projects.', null, 'PROJECT_NOT_APPROVED');
    }

    // Can't vote on your own project
    if (project.submitted_by === voterId) {
      throw ApiError.badRequest('You cannot vote on your own project.', null, 'SELF_VOTE');
    }

    // Check already voted
    const existingVote = await client.query(
      'SELECT id FROM project_votes WHERE project_id = $1 AND voter_id = $2',
      [projectId, voterId]
    );

    if (existingVote.rows.length) {
      throw ApiError.conflict('You have already voted on this project.', 'ALREADY_VOTED');
    }

    // Weight: faculty/admin = 3, students = 1
    const weight = (voterRole === 'faculty' || voterRole === 'admin') ? 3 : 1;

    await client.query(
      `INSERT INTO project_votes (project_id, voter_id, voter_role, weight)
       VALUES ($1, $2, $3, $4)`,
      [projectId, voterId, voterRole, weight]
    );

    // Add to activity feed
    await client.query(
      `INSERT INTO activity_feed (actor_id, action, project_id, user_id)
       VALUES ($1, 'project_voted', $2, $3)`,
      [voterId, projectId, project.submitted_by]
    );

    // Refresh materialized views
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY project_vote_totals');
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY user_portfolio_stats');

    // Get updated vote count
    const countResult = await client.query(
      'SELECT weighted_votes, raw_vote_count FROM project_vote_totals WHERE project_id = $1',
      [projectId]
    );

    return {
      message: 'Vote cast successfully.',
      votes: countResult.rows[0] || { weighted_votes: weight, raw_vote_count: 1 },
    };
  });
};

const removeVote = async (projectId, voterId) => {
  return withTransaction(async (client) => {
    const result = await client.query(
      'DELETE FROM project_votes WHERE project_id = $1 AND voter_id = $2 RETURNING id',
      [projectId, voterId]
    );

    if (!result.rows.length) {
      throw ApiError.notFound('You have not voted on this project.');
    }

    // Refresh materialized views
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY project_vote_totals');
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY user_portfolio_stats');

    return { message: 'Vote removed successfully.' };
  });
};

const getProjectVotes = async (projectId, requesterId) => {
  const countResult = await query(
    `SELECT weighted_votes, raw_vote_count, showcase_rank
     FROM project_vote_totals WHERE project_id = $1`,
    [projectId]
  );

  // Check if requester has voted
  let hasVoted = false;
  if (requesterId) {
    const voteCheck = await query(
      'SELECT id FROM project_votes WHERE project_id = $1 AND voter_id = $2',
      [projectId, requesterId]
    );
    hasVoted = voteCheck.rows.length > 0;
  }

  return {
    projectId,
    weightedVotes: countResult.rows[0]?.weighted_votes || 0,
    rawVoteCount:  countResult.rows[0]?.raw_vote_count  || 0,
    showcaseRank:  countResult.rows[0]?.showcase_rank   || null,
    hasVoted,
  };
};

module.exports = { castVote, removeVote, getProjectVotes };