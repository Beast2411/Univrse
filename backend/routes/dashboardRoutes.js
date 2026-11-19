const router = require('express').Router();
const controller = require('../controllers/dashboardController');
router.get('/stats', controller.stats);
router.get('/recent-activity', controller.recentActivity);
module.exports = router;
