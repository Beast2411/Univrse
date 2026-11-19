const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { requireObjectId, pick, requireFields, validateEnum } = require('../utils/validation');
const fields = ['title', 'description', 'category', 'price', 'sellerName', 'contact', 'imageUrl', 'status'];
const statuses = ['Available', 'Sold'];
const escaped = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) { validateEnum(req.query.status, statuses, 'status'); filter.status = req.query.status; }
  if (req.query.search) filter.title = new RegExp(escaped(req.query.search), 'i');
  let sort = { createdAt: -1 };
  if (req.query.sort === 'price_asc') sort = { price: 1 };
  if (req.query.sort === 'price_desc') sort = { price: -1 };
  if (req.query.sort && !['price_asc', 'price_desc', 'newest'].includes(req.query.sort)) { const error = new Error('sort must be price_asc, price_desc, or newest'); error.status = 400; throw error; }
  success(res, 200, 'Marketplace listings fetched', await Product.find(filter).sort(sort));
});
exports.getOne = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await Product.findById(req.params.id);
  if (!record) return success(res, 404, 'Marketplace listing not found', null);
  success(res, 200, 'Marketplace listing fetched', record);
});
exports.create = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title', 'category', 'price', 'sellerName']);
  if (req.body.status !== undefined) validateEnum(req.body.status, statuses, 'status');
  if (typeof req.body.price !== 'number' || !Number.isFinite(req.body.price)) { const error = new Error('price must be a number'); error.status = 400; throw error; }
  success(res, 201, 'Marketplace listing created', await Product.create(pick(req.body, fields)));
});
exports.update = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  requireFields(req.body, ['title', 'category', 'price', 'sellerName']);
  if (req.body.status !== undefined) validateEnum(req.body.status, statuses, 'status');
  if (typeof req.body.price !== 'number' || !Number.isFinite(req.body.price)) { const error = new Error('price must be a number'); error.status = 400; throw error; }
  const record = await Product.findByIdAndUpdate(req.params.id, pick(req.body, fields), { new: true, runValidators: true });
  if (!record) return success(res, 404, 'Marketplace listing not found', null);
  success(res, 200, 'Marketplace listing updated', record);
});
exports.updateStatus = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id); requireFields(req.body, ['status']); validateEnum(req.body.status, statuses, 'status');
  const record = await Product.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!record) return success(res, 404, 'Marketplace listing not found', null);
  success(res, 200, 'Marketplace listing status updated', record);
});
exports.remove = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const record = await Product.findByIdAndDelete(req.params.id);
  if (!record) return success(res, 404, 'Marketplace listing not found', null);
  success(res, 200, 'Marketplace listing deleted', { _id: record._id });
});
