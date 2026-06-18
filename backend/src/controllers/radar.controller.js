const radarService   = require('../services/radar.service');
const scraperService = require('../services/scraper.service');
const ApiError       = require('../utils/ApiError');

const getPlatformRadar = async (req, res, next) => {
  try {
    const data = await radarService.getPlatformRadar();
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

const getPersonalGap = async (req, res, next) => {
  try {
    const data = await radarService.getPersonalGap(req.user.userId);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

const getLastScrapeInfo = async (req, res, next) => {
  try {
    const info = await radarService.getLastScrapeInfo();
    res.json({ success: true, info });
  } catch (err) { next(err); }
};

const triggerScrape = async (req, res, next) => {
  try {
    const count = await scraperService.runScraper();
    // Invalidate cache
    const { redis } = require('../config/redis');
    await redis.del('radar:platform');
    res.json({ success: true, message: `Scraper complete. ${count} jobs processed.` });
  } catch (err) { next(err); }
};

module.exports = { getPlatformRadar, getPersonalGap, getLastScrapeInfo, triggerScrape };