const mongoose = require('mongoose');

const submittedBySchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
}, { _id: false });

const helpRequestSchema = new mongoose.Schema({
  category: { type: String, required: true, trim: true, maxlength: 100, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium', index: true },
  isAnonymous: { type: Boolean, default: false },
  submittedBy: { type: submittedBySchema, default: null },
  status: { type: String, enum: ['Submitted', 'In Progress', 'Resolved'], default: 'Submitted', index: true }
}, { timestamps: true });

helpRequestSchema.pre('validate', function () {
  if (this.isAnonymous) this.submittedBy = null;
  else if (!this.submittedBy || !this.submittedBy.name || !this.submittedBy.email) {
    this.invalidate('submittedBy', 'Name and email are required for non-anonymous requests');
  }
});
helpRequestSchema.index({ subject: 'text', description: 'text' });
module.exports = mongoose.model('HelpRequest', helpRequestSchema);
