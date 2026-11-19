const router = require('express').Router();
const controller = require('../controllers/weatherController');
router.get('/', controller.get);
module.exports = router;
