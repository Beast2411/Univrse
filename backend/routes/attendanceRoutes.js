const router = require('express').Router();
const controller = require('../controllers/attendanceController');
router.route('/').get(controller.list).post(controller.create);
router.patch('/:id/mark', controller.mark);
router.route('/:id').get(controller.getOne).put(controller.update).delete(controller.remove);
module.exports = router;
