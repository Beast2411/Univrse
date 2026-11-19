const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { requireObjectId, pick, requireFields } = require('../utils/validation');
const fields = ['title', 'club', 'description', 'date', 'time', 'venue', 'category', 'capacity'];
const escaped = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.club) filter.club = req.query.club;
  if (req.query.search) filter.$or = ['title', 'club', 'description', 'venue'].map((key) => ({ [key]: new RegExp(escaped(req.query.search), 'i') }));
  if (req.query.period && !['upcoming', 'past'].includes(req.query.period)) { const error = new Error('period must be upcoming or past'); error.status = 400; throw error; }
  if (req.query.period === 'upcoming') filter.date = { $gte: new Date() };
  if (req.query.period === 'past') filter.date = { $lt: new Date() };
  success(res, 200, 'Events fetched', await Event.find(filter).sort({ date: 1 }));
});
exports.getOne = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await Event.findById(req.params.id);
  if (!record) return success(res, 404, 'Event not found', null);
  success(res, 200, 'Event fetched', record);
});
exports.create = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title', 'date', 'capacity']);
  if (!Number.isInteger(req.body.capacity) || req.body.capacity < 1) { const error = new Error('capacity must be a positive integer'); error.status = 400; throw error; }
  const record = await Event.create(pick(req.body, fields));
  success(res, 201, 'Event created', record);
});
exports.update = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id); requireFields(req.body, ['title', 'date', 'capacity']);
  if (!Number.isInteger(req.body.capacity) || req.body.capacity < 1) { const error = new Error('capacity must be a positive integer'); error.status = 400; throw error; }
  const record = await Event.findOneAndUpdate(
    { _id: req.params.id, registeredCount: { $lte: req.body.capacity } },
    pick(req.body, fields),
    { new: true, runValidators: true }
  );
  if (!record) {
    const exists = await Event.exists({ _id: req.params.id });
    if (!exists) return success(res, 404, 'Event not found', null);
    const error = new Error('capacity cannot be lower than registeredCount'); error.status = 400; throw error;
  }
  success(res, 200, 'Event updated', record);
});
exports.register = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  // No identity or duplicate-registration claim: this endpoint increments aggregate registrations only.
  const record = await Event.findOneAndUpdate(
    { _id: req.params.id, $expr: { $lt: ['$registeredCount', '$capacity'] } },
    { $inc: { registeredCount: 1 } },
    { new: true, runValidators: true }
  );
  if (!record) {
    const exists = await Event.exists({ _id: req.params.id });
    if (!exists) return success(res, 404, 'Event not found', null);
    const error = new Error('Event is at capacity'); error.status = 409; throw error;
  }
  success(res, 200, 'Event registration count updated', record);
});
exports.remove = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await Event.findByIdAndDelete(req.params.id);
  if (!record) return success(res, 404, 'Event not found', null);
  success(res, 200, 'Event deleted', { _id: record._id });
});
