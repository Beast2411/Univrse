const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true, maxlength: 120, index: true },
  subjectCode: { type: String, trim: true, default: '', maxlength: 40 },
  totalClasses: { type: Number, min: 0, default: 0, validate: Number.isInteger },
  attendedClasses: { type: Number, min: 0, default: 0, validate: Number.isInteger }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

attendanceSchema.pre('validate', function () {
  if (this.attendedClasses > this.totalClasses) {
    this.invalidate('attendedClasses', 'attendedClasses cannot exceed totalClasses');
  }
});
attendanceSchema.virtual('attendancePercentage').get(function () {
  return this.totalClasses === 0 ? 0 : Number(((this.attendedClasses / this.totalClasses) * 100).toFixed(2));
});

module.exports = mongoose.model('Attendance', attendanceSchema);
