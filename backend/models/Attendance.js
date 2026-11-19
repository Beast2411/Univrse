const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema({
    date: {type: String, required: true},
    time: {type: String, required: true},
    status: {type: String, enum: ["Present", "Absent"], required: true}
}, {_id: false});

const attendanceSchema = new mongoose.Schema({
    subject: {type: String, required: true, trim: true},
    subjectKey: {type: String, required: true, unique: true, trim: true},
    subjectCode: {type: String, default: "", trim: true},
    totalClasses: {type: Number, required: true, min: 1},
    attendedClasses: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator(value) {
                return value <= this.totalClasses;
            },
            message: "Attended classes cannot exceed total classes."
        }
    },
    theoryPerWeek: {type: Number, default: 0, min: 0},
    practicalPerWeek: {type: Number, default: 0, min: 0},
    image: {type: String, default: ""},
    records: {type: [recordSchema], default: []}
}, {timestamps: true});

module.exports = mongoose.models.Attendance
    || mongoose.model("Attendance", attendanceSchema);