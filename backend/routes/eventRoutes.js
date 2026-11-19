const router = require('express').Router();
const controller = require('../controllers/eventController');
router.route('/').get(controller.list).post(controller.create);
router.patch('/:id/register', controller.register);
router.route('/:id').get(controller.getOne).put(controller.update).delete(controller.remove);
module.exports = router;
