const fs = require("node:fs/promises");
const path = require("node:path");
const {randomUUID} = require("node:crypto");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");

const localStorePath = path.join(__dirname, "..", "data", "attendance-store.json");
const seedPath = path.join(__dirname, "..", "..", "data", "Attendance.json");
let storeQueue = Promise.resolve();

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}

function validateSubject(body, partial = false) {
    const result = {};
    if (!partial || body.subject !== undefined) {
        if (typeof body.subject !== "string" || !body.subject.trim() || body.subject.trim().length > 80) {
            throw new HttpError(400, "Subject name is required and must be 80 characters or fewer.");
        }
        result.subject = body.subject.trim();
        result.subjectKey = result.subject.toLocaleLowerCase();
    }
    if (!partial || body.totalClasses !== undefined) {
        if (!Number.isInteger(body.totalClasses) || body.totalClasses < 1) {
            throw new HttpError(400, "Total classes must be a positive whole number.");
        }
        result.totalClasses = body.totalClasses;
    }
    if (!partial || body.attendedClasses !== undefined) {
        if (!Number.isInteger(body.attendedClasses) || body.attendedClasses < 0) {
            throw new HttpError(400, "Attended classes must be a non-negative whole number.");
        }
        result.attendedClasses = body.attendedClasses;
    }
    if (result.totalClasses !== undefined && result.attendedClasses !== undefined
        && result.attendedClasses > result.totalClasses) {
        throw new HttpError(400, "Attended classes cannot exceed total classes.");
    }
    if (body.subjectCode !== undefined) {
        if (typeof body.subjectCode !== "string" || body.subjectCode.length > 30) {
            throw new HttpError(400, "Subject code must be a string of 30 characters or fewer.");
        }
        result.subjectCode = body.subjectCode.trim();
    } else if (!partial) {
        result.subjectCode = "";
    }

    ["theoryPerWeek", "practicalPerWeek"].forEach(field => {
        if (body[field] !== undefined) {
            if (!Number.isInteger(body[field]) || body[field] < 0) {
                throw new HttpError(400, `${field} must be a non-negative whole number.`);
            }
            result[field] = body[field];
        } else if (!partial) {
            result[field] = 0;
        }
    });

    if (body.image !== undefined) {
        if (typeof body.image !== "string") throw new HttpError(400, "Image must be a string.");
        result.image = body.image;
    } else if (!partial) {
        result.image = "";
    }
    if (partial && Object.keys(result).length === 0) {
        throw new HttpError(400, "Provide at least one attendance field to update.");
    }
    return result;
}

function initialStore(snapshot) {
    const recentAttendance = Array.isArray(snapshot.recentAttendance) ? snapshot.recentAttendance : [];
    return {
        weeklyClasses: Array.isArray(snapshot.weeklyClasses) ? snapshot.weeklyClasses : [],
        subjects: (Array.isArray(snapshot.subjects) ? snapshot.subjects : []).map(subject => ({
            _id: randomUUID(),
            subject: subject.name,
            subjectKey: subject.name.toLocaleLowerCase(),
            subjectCode: subject.subjectCode || "",
            totalClasses: subject.total,
            attendedClasses: subject.attended,
            theoryPerWeek: subject.theoryPerWeek || 0,
            practicalPerWeek: subject.practicalPerWeek || 0,
            image: subject.image || "",
            records: recentAttendance
                .filter(record => record.subject === subject.name)
                .map(record => ({
                    date: record.date,
                    time: record.time,
                    status: record.status
                }))
        }))
    };
}

async function ensureStore() {
    await fs.mkdir(path.dirname(localStorePath), {recursive: true});
    try {
        return JSON.parse(await fs.readFile(localStorePath, "utf8"));
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }

    let snapshot;
    try {
        snapshot = JSON.parse(await fs.readFile(seedPath, "utf8"));
    } catch (error) {
        throw new Error(`Could not load Attendance.json to initialize local storage: ${error.message}`);
    }
    const store = initialStore(snapshot);
    await saveStore(store);
    return store;
}

async function saveStore(store) {
    const tempPath = `${localStorePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
    await fs.rename(tempPath, localStorePath);
}

function withStore(work) {
    const current = storeQueue.then(async () => work(await ensureStore()));
    storeQueue = current.catch(() => {});
    return current;
}

function idOf(subject) {
    return String(subject._id ?? subject.id);
}

function jsonSubject(subject) {
    const value = typeof subject.toObject === "function" ? subject.toObject() : subject;
    return {...value, _id: idOf(value)};
}

function history(subjects) {
    return subjects.flatMap(subject => (subject.records || []).map(record => ({
        subject: subject.subject,
        date: record.date,
        time: record.time,
        status: record.status
    }))).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0, 100);
}

function isValidId(id) {
    if (isMongoConnected()) return mongoose.Types.ObjectId.isValid(id);
    return typeof id === "string" && id.length > 0;
}

async function allSubjects() {
    if (isMongoConnected()) {
        const rows = await Attendance.find().sort({subject: 1}).lean();
        return {subjects: rows, weeklyClasses: [], recentAttendance: history(rows), storage: "mongodb"};
    }
    return withStore(store => ({
        subjects: [...store.subjects].sort((a, b) => a.subject.localeCompare(b.subject)),
        weeklyClasses: store.weeklyClasses || [],
        recentAttendance: history(store.subjects),
        storage: "local-json"
    }));
}

exports.list = async function list(req, res, next) {
    try {
        res.json(await allSubjects());
    } catch (error) {
        next(error);
    }
};

exports.get = async function get(req, res, next) {
    try {
        if (!isValidId(req.params.id)) throw new HttpError(400, "Invalid attendance record ID.");
        const subject = isMongoConnected()
            ? await Attendance.findById(req.params.id)
            : await withStore(store => store.subjects.find(item => idOf(item) === req.params.id) || null);
        if (!subject) throw new HttpError(404, "Attendance subject not found.");
        res.json({subject: jsonSubject(subject), storage: isMongoConnected() ? "mongodb" : "local-json"});
    } catch (error) {
        next(error);
    }
};

exports.create = async function create(req, res, next) {
    try {
        const fields = validateSubject(req.body);
        let subject;
        if (isMongoConnected()) {
            subject = await Attendance.create(fields);
        } else {
            subject = await withStore(async store => {
                if (store.subjects.some(item => item.subjectKey === fields.subjectKey)) {
                    throw new HttpError(409, "A subject with that name already exists.");
                }
                const created = {_id: randomUUID(), ...fields, records: []};
                store.subjects.push(created);
                await saveStore(store);
                return created;
            });
        }
        res.status(201).json({subject: jsonSubject(subject)});
    } catch (error) {
        if (error.code === 11000) return next(new HttpError(409, "A subject with that name already exists."));
        next(error);
    }
};

exports.update = async function update(req, res, next) {
    try {
        if (!isValidId(req.params.id)) throw new HttpError(400, "Invalid attendance record ID.");
        const fields = validateSubject(req.body, true);
        let subject;
        if (isMongoConnected()) {
            subject = await Attendance.findById(req.params.id);
            if (!subject) throw new HttpError(404, "Attendance subject not found.");
            Object.assign(subject, fields);
            await subject.save();
        } else {
            subject = await withStore(async store => {
                const index = store.subjects.findIndex(item => idOf(item) === req.params.id);
                if (index < 0) throw new HttpError(404, "Attendance subject not found.");
                const updated = {...store.subjects[index], ...fields};
                if (updated.attendedClasses > updated.totalClasses) {
                    throw new HttpError(400, "Attended classes cannot exceed total classes.");
                }
                if (store.subjects.some(item => idOf(item) !== req.params.id && item.subjectKey === updated.subjectKey)) {
                    throw new HttpError(409, "A subject with that name already exists.");
                }
                store.subjects[index] = updated;
                await saveStore(store);
                return updated;
            });
        }
        res.json({subject: jsonSubject(subject)});
    } catch (error) {
        if (error.code === 11000) return next(new HttpError(409, "A subject with that name already exists."));
        next(error);
    }
};

exports.mark = async function mark(req, res, next) {
    try {
        if (!isValidId(req.params.id)) throw new HttpError(400, "Invalid attendance record ID.");
        const {status} = req.body;
        if (status !== "Present" && status !== "Absent") {
            throw new HttpError(400, "Status must be Present or Absent.");
        }
        const now = new Date();
        const record = {
            date: now.toISOString().slice(0, 10),
            time: now.toLocaleTimeString("en-US", {hour: "2-digit", minute: "2-digit"})
        };
        let subject;
        if (isMongoConnected()) {
            subject = await Attendance.findById(req.params.id);
            if (!subject) throw new HttpError(404, "Attendance subject not found.");
            if (subject.records.some(item => item.date === record.date)) {
                throw new HttpError(409, "Attendance has already been marked for this subject today.");
            }
            subject.totalClasses += 1;
            if (status === "Present") subject.attendedClasses += 1;
            subject.records.push({...record, status});
            await subject.save();
        } else {
            subject = await withStore(async store => {
                const item = store.subjects.find(value => idOf(value) === req.params.id);
                if (!item) throw new HttpError(404, "Attendance subject not found.");
                if ((item.records || []).some(value => value.date === record.date)) {
                    throw new HttpError(409, "Attendance has already been marked for this subject today.");
                }
                item.totalClasses += 1;
                if (status === "Present") item.attendedClasses += 1;
                item.records = item.records || [];
                item.records.push({...record, status});
                await saveStore(store);
                return item;
            });
        }
        res.json({subject: jsonSubject(subject)});
    } catch (error) {
        next(error);
    }
};

exports.remove = async function remove(req, res, next) {
    try {
        if (!isValidId(req.params.id)) throw new HttpError(400, "Invalid attendance record ID.");
        const subject = isMongoConnected()
            ? await Attendance.findByIdAndDelete(req.params.id)
            : await withStore(async store => {
                const index = store.subjects.findIndex(item => idOf(item) === req.params.id);
                if (index < 0) return null;
                const [deleted] = store.subjects.splice(index, 1);
                await saveStore(store);
                return deleted;
            });
        if (!subject) throw new HttpError(404, "Attendance subject not found.");
        res.json({message: "Attendance subject deleted.", id: idOf(subject)});
    } catch (error) {
        next(error);
    }
};

exports.initializeMongo = async function initializeMongo() {
    if (!isMongoConnected() || await Attendance.countDocuments() > 0) return;

    let subjects;
    try {
        const savedStore = JSON.parse(await fs.readFile(localStorePath, "utf8"));
        subjects = savedStore.subjects.map(subject => ({
            subject: subject.subject,
            subjectKey: subject.subjectKey || subject.subject.toLocaleLowerCase(),
            subjectCode: subject.subjectCode || "",
            totalClasses: subject.totalClasses,
            attendedClasses: subject.attendedClasses,
            theoryPerWeek: subject.theoryPerWeek || 0,
            practicalPerWeek: subject.practicalPerWeek || 0,
            image: subject.image || "",
            records: subject.records || []
        }));
    } catch (error) {
        if (error.code !== "ENOENT") throw new Error(`Could not load the saved attendance store: ${error.message}`);
        let snapshot;
        try {
            snapshot = JSON.parse(await fs.readFile(seedPath, "utf8"));
        } catch (seedError) {
            throw new Error(`Could not load Attendance.json to initialize MongoDB: ${seedError.message}`);
        }
        subjects = initialStore(snapshot).subjects.map(({_id, ...subject}) => subject);
    }
    if (subjects.length) await Attendance.insertMany(subjects, {ordered: true});
};