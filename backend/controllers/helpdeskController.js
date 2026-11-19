const HelpRequest = require('../models/HelpRequest');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { requireObjectId, pick, requireFields, validateEnum } = require('../utils/validation');
const editableFields = ['category', 'subject', 'description', 'priority', 'isAnonymous', 'submittedBy'];
const priorities = ['Low', 'Medium', 'High'];
const statuses = ['Submitted', 'In Progress', 'Resolved'];
const escaped = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalizeBody(body) {
  const value = pick(body, editableFields);
  if (value.isAnonymous !== undefined && typeof value.isAnonymous !== 'boolean') {
    const error = new Error('isAnonymous must be a boolean'); error.status = 400; throw error;
  }
  if (value.isAnonymous === true) value.submittedBy = null;
  else if (value.isAnonymous === false && (!value.submittedBy || !value.submittedBy.name || !value.submittedBy.email)) {
    const error = new Error('submittedBy.name and submittedBy.email are required for non-anonymous requests'); error.status = 400; throw error;
  }
  if (value.priority !== undefined) validateEnum(value.priority, priorities, 'priority');
  return value;
}

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  for (const key of ['category', 'priority', 'status']) if (req.query[key]) filter[key] = req.query[key];
  if (filter.priority) validateEnum(filter.priority, priorities, 'priority');
  if (filter.status) validateEnum(filter.status, statuses, 'status');
  if (req.query.search) filter.$or = ['subject', 'description'].map((key) => ({ [key]: new RegExp(escaped(req.query.search), 'i') }));
  success(res, 200, 'Help Desk requests fetched', await HelpRequest.find(filter).sort({ createdAt: -1 }));
});
exports.getOne = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await HelpRequest.findById(req.params.id);
  if (!record) return success(res, 404, 'Help Desk request not found', null);
  success(res, 200, 'Help Desk request fetched', record);
});
exports.create = asyncHandler(async (req, res) => {
  requireFields(req.body, ['category', 'subject', 'description']);
  const value = normalizeBody({ isAnonymous: false, ...req.body });
  success(res, 201, 'Help Desk request created', await HelpRequest.create(value));
});
exports.update = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id); requireFields(req.body, ['category', 'subject', 'description']);
  const record = await HelpRequest.findById(req.params.id);
  if (!record) return success(res, 404, 'Help Desk request not found', null);
  const changes = normalizeBody({ isAnonymous: record.isAnonymous, submittedBy: record.submittedBy, ...req.body });
  Object.assign(record, changes);
  await record.save();
  success(res, 200, 'Help Desk request updated', record);
});
exports.updateStatus = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id); requireFields(req.body, ['status']); validateEnum(req.body.status, statuses, 'status');
  const record = await HelpRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!record) return success(res, 404, 'Help Desk request not found', null);
  success(res, 200, 'Help Desk request status updated', record);
});
exports.remove = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await HelpRequest.findByIdAndDelete(req.params.id);
  if (!record) return success(res, 404, 'Help Desk request not found', null);
  success(res, 200, 'Help Desk request deleted', { _id: record._id });
});
