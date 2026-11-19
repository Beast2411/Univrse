const router = require('express').Router();
const controller = require('../controllers/timetableController');
router.route('/').get(controller.get).put(controller.put);
module.exports = router;
