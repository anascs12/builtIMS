const express = require('express');
const router  = express.Router();
const { getFeed, getUserFeed } = require('../controllers/feed.controller');

router.get('/',                getFeed);
router.get('/user/:username',  getUserFeed);

module.exports = router;