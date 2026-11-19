const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160, index: true },
  club: { type: String, trim: true, default: '', maxlength: 120, index: true },
  description: { type: String, trim: true, default: '', maxlength: 5000 },
  date: { type: Date, required: true, index: true },
  time: { type: String, trim: true, default: '', maxlength: 40 },
  venue: { type: String, trim: true, default: '', maxlength: 200 },
  category: { type: String, trim: true, default: '', maxlength: 80, index: true },
  capacity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  registeredCount: { type: Number, min: 0, default: 0, validate: Number.isInteger }
}, { timestamps: true });

eventSchema.path('registeredCount').validate(function (value) {
  return value <= this.capacity;
}, 'registeredCount cannot exceed capacity');
module.exports = mongoose.model('Event', eventSchema);
