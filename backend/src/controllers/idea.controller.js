const ideaService = require('../services/idea.service');
const ApiError    = require('../utils/ApiError');

const getIdeas = async (req, res, next) => {
  try {
    const data = await ideaService.getIdeas({
      page:   parseInt(req.query.page)  || 1,
      limit:  parseInt(req.query.limit) || 20,
      status: req.query.status || 'all',
    });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

const getIdea = async (req, res, next) => {
  try {
    const idea = await ideaService.getIdea(req.params.id);
    if (!idea) return next(ApiError.notFound('Idea not found.'));
    res.json({ success: true, idea });
  } catch (err) { next(err); }
};

const createIdea = async (req, res, next) => {
  try {
    const idea = await ideaService.createIdea(req.user.userId, {
      title:       req.body.title,
      description: req.body.description,
      techStack:   req.body.techStack,
    });
    res.status(201).json({ success: true, idea });
  } catch (err) { next(err); }
};

const submitProof = async (req, res, next) => {
  try {
    const idea = await ideaService.submitProof(req.user.userId, req.params.id, {
      proofUrl:  req.body.proofUrl,
      proofType: req.body.proofType,
      proofNote: req.body.proofNote,
    });
    res.json({ success: true, idea });
  } catch (err) { next(ApiError.badRequest(err.message)); }
};

const requestCollaboration = async (req, res, next) => {
  try {
    const collab = await ideaService.requestCollaboration(
      req.user.userId, req.params.id, req.body.message
    );
    res.json({ success: true, collab });
  } catch (err) { next(ApiError.badRequest(err.message)); }
};

const respondToCollaboration = async (req, res, next) => {
  try {
    const collab = await ideaService.respondToCollaboration(
      req.user.userId, req.params.id, req.body.collaboratorId, req.body.accept
    );
    res.json({ success: true, collab });
  } catch (err) { next(ApiError.badRequest(err.message)); }
};

module.exports = {
  getIdeas, getIdea, createIdea, submitProof,
  requestCollaboration, respondToCollaboration,
};