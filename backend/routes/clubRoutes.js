const router = require('express').Router();
const controller = require('../controllers/clubController');

router.route('/').get(controller.list).post(controller.create);
router.route('/:id').get(controller.getOne).put(controller.update).delete(controller.remove);

module.exports = router;
