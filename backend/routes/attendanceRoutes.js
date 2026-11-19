const express = require("express");
const controller = require("../controllers/attendanceController");

const router = express.Router();

router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.patch("/:id/mark", controller.mark);
router.delete("/:id", controller.remove);

module.exports = router;
const router = require('express').Router();
const controller = require('../controllers/attendanceController');
router.route('/').get(controller.list).post(controller.create);
router.patch('/:id/mark', controller.mark);
router.route('/:id').get(controller.getOne).put(controller.update).delete(controller.remove);
module.exports = router;
