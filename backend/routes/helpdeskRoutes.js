const router = require('express').Router();
const controller = require('../controllers/helpdeskController');
router.route('/').get(controller.list).post(controller.create);
router.patch('/:id/status', controller.updateStatus);
router.route('/:id').get(controller.getOne).put(controller.update).delete(controller.remove);
module.exports = router;
