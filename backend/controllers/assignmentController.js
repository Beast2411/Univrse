const Assignment = require('../models/Assignment');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { requireObjectId, pick, requireFields, validateEnum } = require('../utils/validation');

const fields = ['title', 'subject', 'description', 'dueDate', 'priority', 'status'];
const priorities = ['Low', 'Medium', 'High'];
const statuses = ['Pending', 'Completed'];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  for (const key of ['subject', 'priority', 'status']) {
    if (req.query[key]) filter[key] = req.query[key];
  }
  if (filter.priority) validateEnum(filter.priority, priorities, 'priority');
  if (filter.status) validateEnum(filter.status, statuses, 'status');
  if (req.query.search) filter.$or = ['title', 'subject', 'description'].map((key) => ({ [key]: new RegExp(escapeRegex(String(req.query.search)), 'i') }));
  success(res, 200, 'Assignments fetched', await Assignment.find(filter).sort({ dueDate: 1, createdAt: -1 }));
});

exports.getOne = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await Assignment.findById(req.params.id);
  if (!record) return success(res, 404, 'Assignment not found', null);
  success(res, 200, 'Assignment fetched', record);
});

exports.create = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title', 'subject', 'dueDate']);
  if (req.body.priority !== undefined) validateEnum(req.body.priority, priorities, 'priority');
  if (req.body.status !== undefined) validateEnum(req.body.status, statuses, 'status');
  const record = await Assignment.create(pick(req.body, fields));
  success(res, 201, 'Assignment created', record);
});

exports.update = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  requireFields(req.body, ['title', 'subject', 'dueDate']);
  if (req.body.priority !== undefined) validateEnum(req.body.priority, priorities, 'priority');
  if (req.body.status !== undefined) validateEnum(req.body.status, statuses, 'status');
  const record = await Assignment.findByIdAndUpdate(req.params.id, pick(req.body, fields), { new: true, runValidators: true });
  if (!record) return success(res, 404, 'Assignment not found', null);
  success(res, 200, 'Assignment updated', record);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  requireFields(req.body, ['status']);
  validateEnum(req.body.status, statuses, 'status');
  const record = await Assignment.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!record) return success(res, 404, 'Assignment not found', null);
  success(res, 200, 'Assignment status updated', record);
});

exports.remove = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await Assignment.findByIdAndDelete(req.params.id);
  if (!record) return success(res, 404, 'Assignment not found', null);
  success(res, 200, 'Assignment deleted', { _id: record._id });
});
