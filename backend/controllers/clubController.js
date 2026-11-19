const Club = require('../models/Club');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { requireObjectId, pick, requireFields } = require('../utils/validation');

const fields = ['name', 'category', 'description', 'members', 'venue', 'lead', 'icon', 'iconClass'];
const allowedIconClasses = ['purple', 'green', 'orange', 'pink', 'blue', 'yellow', 'teal'];

function validate(body, partial = false) {
  const values = pick(body, fields);
  if (!partial || body.members !== undefined) {
    const members = body.members === undefined ? 0 : body.members;
    if (!Number.isInteger(members) || members < 0) {
      const error = new Error('members must be a non-negative integer');
      error.status = 400;
      throw error;
    }
    values.members = members;
  }
  if (body.iconClass !== undefined && !allowedIconClasses.includes(body.iconClass)) {
    const error = new Error(`iconClass must be one of: ${allowedIconClasses.join(', ')}`);
    error.status = 400;
    throw error;
  }
  return values;
}

exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) filter.$text = { $search: String(req.query.search) };
  const clubs = await Club.find(filter).sort({ name: 1 });
  success(res, 200, 'Clubs fetched', clubs);
});

exports.getOne = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const club = await Club.findById(req.params.id);
  if (!club) return success(res, 404, 'Club not found', null);
  success(res, 200, 'Club fetched', club);
});

exports.create = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'category']);
  const values = validate(req.body);
  if (await Club.exists({ name: values.name })) {
    const error = new Error('A club with this name already exists.'); error.status = 409; throw error;
  }
  let club;
  try {
    club = await Club.create(values);
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = new Error('A club with this name already exists.'); duplicate.status = 409; throw duplicate;
    }
    throw error;
  }
  success(res, 201, 'Club created', club);
});

exports.update = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const values = validate(req.body, true);
  if (!Object.keys(values).length) {
    const error = new Error('Provide at least one club field to update.');
    error.status = 400;
    throw error;
  }
  if (values.name && await Club.exists({ name: values.name, _id: { $ne: req.params.id } })) {
    const error = new Error('A club with this name already exists.'); error.status = 409; throw error;
  }
  let club;
  try {
    club = await Club.findByIdAndUpdate(req.params.id, values, { new: true, runValidators: true });
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = new Error('A club with this name already exists.'); duplicate.status = 409; throw duplicate;
    }
    throw error;
  }
  if (!club) return success(res, 404, 'Club not found', null);
  success(res, 200, 'Club updated', club);
});

exports.remove = asyncHandler(async (req, res) => {
  requireObjectId(req.params.id);
  const club = await Club.findByIdAndDelete(req.params.id);
  if (!club) return success(res, 404, 'Club not found', null);
  success(res, 200, 'Club deleted', { _id: club._id });
});
