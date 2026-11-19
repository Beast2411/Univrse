const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  legacyId: { type: Number, min: 1, validate: Number.isInteger },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 80, index: true },
  description: { type: String, trim: true, default: '', maxlength: 3000 },
  members: { type: Number, min: 0, default: 0, validate: Number.isInteger },
  venue: { type: String, trim: true, default: '', maxlength: 200 },
  lead: { type: String, trim: true, default: '', maxlength: 120 },
  icon: { type: String, trim: true, default: '✦', maxlength: 24 },
  iconClass: { type: String, trim: true, default: 'purple', enum: ['purple', 'green', 'orange', 'pink', 'blue', 'yellow', 'teal'] }
}, { timestamps: true });

clubSchema.index({ name: 1 }, { unique: true });
clubSchema.index({ name: 'text', category: 'text', description: 'text' });

module.exports = mongoose.model('Club', clubSchema);
