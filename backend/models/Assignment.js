const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  subject: { type: String, required: true, trim: true, maxlength: 120, index: true },
  description: { type: String, trim: true, default: '', maxlength: 5000 },
  dueDate: { type: Date, required: true, index: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium', index: true },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending', index: true }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

module.exports = mongoose.model('Assignment', assignmentSchema);
