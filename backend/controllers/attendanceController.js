const Attendance = require('../models/Attendance');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { requireObjectId, pick, requireFields } = require('../utils/validation');
const fields = ['subject', 'subjectCode', 'totalClasses', 'attendedClasses'];

function validateCounts(body, existing = {}) {
  const total = body.totalClasses === undefined ? existing.totalClasses : body.totalClasses;
  const attended = body.attendedClasses === undefined ? existing.attendedClasses : body.attendedClasses;
  for (const [name, value] of [['totalClasses', total], ['attendedClasses', attended]]) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      const error = new Error(`${name} must be a non-negative integer`); error.status = 400; throw error;
    }
  }
  if (attended > total) { const error = new Error('attendedClasses cannot exceed totalClasses'); error.status = 400; throw error; }
}

exports.list = asyncHandler(async (req, res) => {
  const filter = req.query.subject ? { subject: new RegExp(String(req.query.subject).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {};
  success(res, 200, 'Attendance records fetched', await Attendance.find(filter).sort({ subject: 1 }));
});
exports.getOne = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await Attendance.findById(req.params.id);
  if (!record) return success(res, 404, 'Attendance record not found', null);
  success(res, 200, 'Attendance record fetched', record);
});
exports.create = asyncHandler(async (req, res) => {
  requireFields(req.body, ['subject']);
  validateCounts({ totalClasses: req.body.totalClasses ?? 0, attendedClasses: req.body.attendedClasses ?? 0 });
  success(res, 201, 'Attendance record created', await Attendance.create(pick(req.body, fields)));
});
exports.update = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  requireFields(req.body, ['subject']);
  const current = await Attendance.findById(req.params.id);
  if (!current) return success(res, 404, 'Attendance record not found', null);
  validateCounts(req.body, current);
  const record = await Attendance.findByIdAndUpdate(req.params.id, pick(req.body, fields), { new: true, runValidators: true });
  success(res, 200, 'Attendance record updated', record);
});
exports.mark = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  if (typeof req.body.attended !== 'boolean') { const error = new Error('attended must be a boolean'); error.status = 400; throw error; }
  const increment = req.body.attended ? { totalClasses: 1, attendedClasses: 1 } : { totalClasses: 1 };
  const record = await Attendance.findByIdAndUpdate(req.params.id, { $inc: increment }, { new: true, runValidators: true });
  if (!record) return success(res, 404, 'Attendance record not found', null);
  success(res, 200, 'Attendance marked', record);
});
exports.remove = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await Attendance.findByIdAndDelete(req.params.id);
  if (!record) return success(res, 404, 'Attendance record not found', null);
  success(res, 200, 'Attendance record deleted', { _id: record._id });
});
