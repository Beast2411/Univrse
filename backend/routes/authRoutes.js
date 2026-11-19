const router = require('express').Router();
const controller = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', requireAuth, controller.me);
router.post('/logout', controller.logout);

module.exports = router;
