const showdownService = require('../services/showdown.service');
const ApiError        = require('../utils/ApiError');

const getShowdowns = async (req, res, next) => {
  try {
    const showdowns = await showdownService.getShowdowns();
    res.json({ success: true, showdowns });
  } catch (err) { next(err); }
};

const getShowdown = async (req, res, next) => {
  try {
    const showdown = await showdownService.getShowdown(req.params.id);
    if (!showdown) return next(ApiError.notFound('Showdown not found.'));
    res.json({ success: true, showdown });
  } catch (err) { next(err); }
};

const createShowdown = async (req, res, next) => {
  try {
    const showdown = await showdownService.createShowdown(req.user.userId, req.body);
    res.status(201).json({ success: true, showdown });
  } catch (err) { next(err); }
};

const submitEntry = async (req, res, next) => {
  try {
    const sub = await showdownService.submitEntry(req.user.userId, req.params.id, req.body);
    res.json({ success: true, submission: sub });
  } catch (err) { next(ApiError.badRequest(err.message)); }
};

const voteSubmission = async (req, res, next) => {
  try {
    const result = await showdownService.voteSubmission(
      req.user.userId, req.user.role, req.params.submissionId
    );
    res.json({ success: true, ...result });
  } catch (err) { next(ApiError.badRequest(err.message)); }
};

const getRecentActivity = async (req, res, next) => {
  try {
    const activity = await showdownService.getRecentActivity(req.params.id);
    res.json({ success: true, activity });
  } catch (err) { next(err); }
};

module.exports = {
  getShowdowns, getShowdown, createShowdown,
  submitEntry, voteSubmission, getRecentActivity,
};