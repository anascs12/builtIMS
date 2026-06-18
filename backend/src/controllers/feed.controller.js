const feedService = require('../services/feed.service');

const getFeed = async (req, res, next) => {
  try {
    const result = await feedService.getFeed({
      page:  parseInt(req.query.page)  || 1,
      limit: parseInt(req.query.limit) || 20,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getUserFeed = async (req, res, next) => {
  try {
    const result = await feedService.getUserFeed(req.params.username, {
      page:  parseInt(req.query.page)  || 1,
      limit: parseInt(req.query.limit) || 20,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

module.exports = { getFeed, getUserFeed };