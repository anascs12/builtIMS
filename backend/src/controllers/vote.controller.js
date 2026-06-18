const voteService = require('../services/vote.service');

const castVote = async (req, res, next) => {
  try {
    const result = await voteService.castVote(
      req.params.id,
      req.user.userId,
      req.user.role
    );
    res.status(201).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const removeVote = async (req, res, next) => {
  try {
    const result = await voteService.removeVote(req.params.id, req.user.userId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getProjectVotes = async (req, res, next) => {
  try {
    const result = await voteService.getProjectVotes(
      req.params.id,
      req.user?.userId || null
    );
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

module.exports = { castVote, removeVote, getProjectVotes };