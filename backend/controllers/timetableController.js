const fs = require('node:fs/promises');
const path = require('node:path');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');

const timetablePath = path.resolve(__dirname, '../../data/timetable.json');
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function validateTimetable(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.keys(value).length !== days.length || Object.keys(value).some((day) => !days.includes(day))) return false;
  return days.every((day) => Array.isArray(value[day]) && value[day].every((item) => (
    item && typeof item === 'object' && !Array.isArray(item)
    && Object.keys(item).length === 5
    && ['start', 'end', 'name', 'instructor', 'room'].every((field) => typeof item[field] === 'string')
  )));
}

exports.get = asyncHandler(async (req, res) => {
  let contents;
  try {
    contents = await fs.readFile(timetablePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') { error.status = 500; error.message = 'The configured timetable file is missing'; }
    throw error;
  }
  let timetable;
  try { timetable = JSON.parse(contents); }
  catch { const error = new Error('The timetable file contains invalid JSON'); error.status = 500; throw error; }
  if (!validateTimetable(timetable)) { const error = new Error('The timetable file has an invalid structure'); error.status = 500; throw error; }
  success(res, 200, 'Timetable fetched', timetable);
});

exports.put = asyncHandler(async (req, res) => {
  if (!validateTimetable(req.body)) { const error = new Error(`Timetable must contain only weekday arrays (${days.join(', ')}) with class objects containing exactly start, end, name, instructor, and room string fields`); error.status = 400; throw error; }
  const contents = `${JSON.stringify(req.body, null, 2)}\n`;
  await fs.writeFile(timetablePath, contents, 'utf8');
  success(res, 200, 'Timetable updated', req.body);
});
