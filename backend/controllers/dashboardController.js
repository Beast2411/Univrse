const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');
const Event = require('../models/Event');
const HelpRequest = require('../models/HelpRequest');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

exports.stats = asyncHandler(async (req, res) => {
  const now = new Date();
  const [totalAssignments, pendingAssignments, completedAssignments, attendance, upcomingEvents] = await Promise.all([
    Assignment.countDocuments(),
    Assignment.countDocuments({ status: 'Pending' }),
    Assignment.countDocuments({ status: 'Completed' }),
    Attendance.aggregate([{ $group: { _id: null, attended: { $sum: '$attendedClasses' }, total: { $sum: '$totalClasses' } } }]),
    Event.countDocuments({ date: { $gte: now } })
  ]);
  const totals = attendance[0] || { attended: 0, total: 0 };
  const averageAttendance = totals.total === 0 ? 0 : Number(((totals.attended / totals.total) * 100).toFixed(2));
  success(res, 200, 'Dashboard statistics fetched', { totalAssignments, pendingAssignments, completedAssignments, averageAttendance, upcomingEvents });
});

exports.recentActivity = asyncHandler(async (req, res) => {
  const [assignments, events, requests, products] = await Promise.all([
    Assignment.find().sort({ updatedAt: -1 }).limit(5).select('title status updatedAt createdAt'),
    Event.find().sort({ updatedAt: -1 }).limit(5).select('title date updatedAt createdAt'),
    HelpRequest.find().sort({ updatedAt: -1 }).limit(5).select('subject status updatedAt createdAt'),
    Product.find().sort({ updatedAt: -1 }).limit(5).select('title status updatedAt createdAt')
  ]);
  const data = [
    ...assignments.map((item) => ({ type: 'assignment', id: item._id, title: item.title, details: item.status, date: item.updatedAt || item.createdAt })),
    ...events.map((item) => ({ type: 'event', id: item._id, title: item.title, details: 'Event record updated', date: item.updatedAt || item.createdAt })),
    ...requests.map((item) => ({ type: 'helpdesk', id: item._id, title: item.subject, details: item.status, date: item.updatedAt || item.createdAt })),
    ...products.map((item) => ({ type: 'marketplace', id: item._id, title: item.title, details: item.status, date: item.updatedAt || item.createdAt }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  success(res, 200, 'Recent activity fetched', data);
});
