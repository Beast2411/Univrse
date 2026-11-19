const router = require('express').Router();
const controller = require('../controllers/assignmentController');
router.route('/').get(controller.list).post(controller.create);
router.route('/:id').get(controller.getOne).put(controller.update).delete(controller.remove);
router.patch('/:id/status', controller.updateStatus);
module.exports = router;
