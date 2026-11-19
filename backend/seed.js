const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const crypto = require('node:crypto');
const mongoose = require('mongoose');
const connectDatabase = require('./config/db');
const Assignment = require('./models/Assignment');
const Attendance = require('./models/Attendance');
const Product = require('./models/Product');
const Event = require('./models/Event');
const HelpRequest = require('./models/HelpRequest');
const Club = require('./models/Club');
const clubDirectory = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/clubs.json'), 'utf8'));

const seedVersion = 'univrse-demo-v1';
const dayOffset = (offset, hour = 12) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
};
const dateString = (date) => date.toISOString().slice(0, 10);
const stableId = (collection, key) => new mongoose.Types.ObjectId(
  crypto.createHash('sha256').update(`${seedVersion}:${collection}:${key}`).digest('hex').slice(0, 24)
);

function makeAttendanceRecords() {
  const classDays = [];
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  while (classDays.length < 5) {
    date.setDate(date.getDate() - 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) classDays.push(new Date(date));
  }
  return classDays.reverse().map((date, index) => ({
    date: dateString(date),
    time: ['09:00 AM', '11:00 AM', '10:00 AM', '02:00 PM', '09:00 AM'][index],
    status: index === 2 ? 'Absent' : 'Present'
  }));
}

const attendanceRows = [
  ['Data Structures', 'CS201', 36, 32, 3, 1],
  ['Web Development', 'CS202', 32, 28, 2, 2],
  ['Engineering Mathematics', 'MA101', 34, 25, 4, 0],
  ['Engineering Physics', 'PH101', 30, 24, 3, 1],
  ['Database Systems', 'CS301', 25, 21, 2, 2],
  ['Communication Skills', 'HS102', 20, 17, 2, 0],
  ['Discrete Mathematics', 'MA203', 24, 18, 3, 0]
];

const datasets = [
  {
    label: 'Assignments', model: Assignment, filter: (record) => ({ _id: record._id }),
    records: [
      { key: 'data-structures-trees', title: 'Binary Search Tree Lab', subject: 'Data Structures', dueDate: dayOffset(-8), priority: 'Medium', status: 'Completed', description: 'Implement insertion, search, and traversal operations for a binary search tree.' },
      { key: 'web-responsive-layout', title: 'Responsive Campus Club Page', subject: 'Web Development', dueDate: dayOffset(-3), priority: 'High', status: 'Completed', description: 'Build an accessible responsive page using semantic HTML and CSS.' },
      { key: 'engineering-math-series', title: 'Fourier Series Problem Set', subject: 'Engineering Mathematics', dueDate: dayOffset(1), priority: 'High', status: 'Pending', description: 'Solve the assigned Fourier series problems and show the working.' },
      { key: 'physics-optics-report', title: 'Optics Laboratory Report', subject: 'Engineering Physics', dueDate: dayOffset(3), priority: 'Medium', status: 'Pending', description: 'Summarize the diffraction experiment, observations, and calculations.' },
      { key: 'database-normalization', title: 'Database Normalization Exercise', subject: 'Database Systems', dueDate: dayOffset(5), priority: 'High', status: 'Pending', description: 'Normalize the supplied relations and identify candidate keys.' },
      { key: 'communication-presentation', title: 'Technical Presentation Outline', subject: 'Communication Skills', dueDate: dayOffset(8), priority: 'Low', status: 'Pending', description: 'Prepare a short outline for the technical communication presentation.' },
      { key: 'discrete-graph-theory', title: 'Graph Theory Worksheet', subject: 'Discrete Mathematics', dueDate: dayOffset(11), priority: 'Medium', status: 'Pending', description: 'Complete the graph traversal and connectivity questions.' },
      { key: 'web-api-project', title: 'Campus Events API Client', subject: 'Web Development', dueDate: dayOffset(15), priority: 'High', status: 'Pending', description: 'Connect the course project interface to its documented JSON API.' },
      { key: 'data-hashing-quiz', title: 'Hashing and Collision Analysis', subject: 'Data Structures', dueDate: dayOffset(20), priority: 'Low', status: 'Pending', description: 'Compare collision-resolution strategies for the given workloads.' }
    ]
  },
  {
    label: 'Attendance', model: Attendance, filter: (record) => ({ subjectKey: record.subjectKey }),
    records: attendanceRows.map(([subject, subjectCode, totalClasses, attendedClasses, theoryPerWeek, practicalPerWeek]) => ({
      key: subject.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      subject,
      subjectKey: subject.toLowerCase(),
      subjectCode,
      totalClasses,
      attendedClasses,
      theoryPerWeek,
      practicalPerWeek,
      image: '',
      records: makeAttendanceRecords()
    }))
  },
  {
    label: 'Marketplace', model: Product, filter: (record) => ({ _id: record._id }),
    records: [
      { key: 'market-data-structures', title: 'Data Structures in C++', description: 'Good-condition course reference book with a few pencil notes.', category: 'Books', price: 420, sellerName: 'Riya Mehta', contact: 'riya.mehta@example.invalid', imageUrl: 'images/bookss.jpg', status: 'Available' },
      { key: 'market-calculus-text', title: 'Engineering Mathematics Textbook', description: 'Second-hand textbook; cover and pages are intact.', category: 'Books', price: 350, sellerName: 'Kabir Sethi', contact: 'kabir.sethi@example.invalid', imageUrl: 'images/bookss.jpg', status: 'Available' },
      { key: 'market-usb-keyboard', title: 'Compact USB Keyboard', description: 'Working wired keyboard suitable for a hostel desk.', category: 'Electronics', price: 550, sellerName: 'Anaya Kapoor', contact: 'anaya.kapoor@example.invalid', imageUrl: 'images/laptop.jpg', status: 'Available' },
      { key: 'market-calculator', title: 'Scientific Calculator', description: 'Scientific calculator with protective case.', category: 'Electronics', price: 700, sellerName: 'Dev Malhotra', contact: 'dev.malhotra@example.invalid', imageUrl: 'images/calculator.jpg', status: 'Sold' },
      { key: 'market-lab-coat', title: 'Laboratory Coat, Size M', description: 'Clean white lab coat used for one semester.', category: 'Other', price: 300, sellerName: 'Isha Nair', contact: 'isha.nair@example.invalid', imageUrl: 'images/bag.jpg', status: 'Available' },
      { key: 'market-notebook-set', title: 'A4 Engineering Notebooks Set', description: 'Three ruled notebooks with unused pages.', category: 'Other', price: 120, sellerName: 'Arjun Rao', contact: 'arjun.rao@example.invalid', imageUrl: 'images/bookss.jpg', status: 'Available' },
      { key: 'market-desk-lamp', title: 'Adjustable LED Desk Lamp', description: 'USB-powered desk lamp with flexible neck.', category: 'Furniture', price: 480, sellerName: 'Mira Joshi', contact: 'mira.joshi@example.invalid', imageUrl: 'images/chair.jpg', status: 'Sold' },
      { key: 'market-badminton-racket', title: 'Badminton Racket', description: 'Entry-level racket in good condition; grip recently replaced.', category: 'Other', price: 650, sellerName: 'Nikhil Verma', contact: 'nikhil.verma@example.invalid', imageUrl: 'images/cycle.jpg', status: 'Available' },
      { key: 'market-drawing-set', title: 'Engineering Drawing Set', description: 'Compass, scale, set squares, and pencil case.', category: 'Other', price: 260, sellerName: 'Tara Sen', contact: 'tara.sen@example.invalid', imageUrl: 'images/bookss.jpg', status: 'Available' }
    ]
  },
  {
    label: 'Events', model: Event, filter: (record) => ({ _id: record._id }),
    records: [
      { key: 'event-build-night', title: 'Open Source Build Night', club: 'Coding Society', description: 'Bring a laptop and work in small groups on beginner-friendly open-source tasks.', date: dayOffset(2), time: '4:30 PM', venue: 'Innovation Lab', category: 'Technical', capacity: 80, registeredCount: 34 },
      { key: 'event-web-workshop', title: 'Frontend Accessibility Workshop', club: 'Web Development Club', description: 'A practical session on keyboard access, contrast, and semantic markup.', date: dayOffset(5), time: '3:00 PM', venue: 'Block B, Lab 2', category: 'Workshop', capacity: 45, registeredCount: 28 },
      { key: 'event-cultural-evening', title: 'Campus Cultural Evening', club: 'Cultural Society', description: 'Student performances, music, and an open stage for campus groups.', date: dayOffset(9), time: '6:00 PM', venue: 'Main Auditorium', category: 'Cultural', capacity: 250, registeredCount: 146 },
      { key: 'event-basketball', title: 'Inter-Department Basketball', club: 'Sports Council', description: 'Friendly inter-department matches. Spectators are welcome.', date: dayOffset(13), time: '4:00 PM', venue: 'Indoor Sports Hall', category: 'Other', capacity: 120, registeredCount: 61 },
      { key: 'event-robotics', title: 'Robotics Prototyping Session', club: 'Robotics Club', description: 'Prototype review and sensor integration for current student projects.', date: dayOffset(18), time: '2:30 PM', venue: 'Engineering Workshop', category: 'Technical', capacity: 36, registeredCount: 22 },
      { key: 'event-career', title: 'Preparing for Technical Interviews', club: 'Career Development Cell', description: 'A peer-led practice session covering problem-solving and interview structure.', date: dayOffset(24), time: '11:00 AM', venue: 'Seminar Hall A', category: 'Workshop', capacity: 60, registeredCount: 41 },
      { key: 'event-photowalk', title: 'Campus Photography Walk', club: 'Photography Club', description: 'A relaxed photo walk around campus; bring a phone or camera.', date: dayOffset(30), time: '4:00 PM', venue: 'Central Courtyard', category: 'Cultural', capacity: 40, registeredCount: 17 }
    ]
  },
  {
    // Club names are the business key: match an existing directory entry even
    // if it was created before stable seed IDs were introduced.
    label: 'Clubs', model: Club, filter: (record) => ({ name: record.name }),
    records: clubDirectory.map((club) => ({
      key: `club-${club.id}`,
      legacyId: club.id,
      name: club.name,
      category: club.category,
      description: club.description,
      members: club.members,
      venue: club.venue,
      lead: club.lead,
      icon: club.icon,
      iconClass: club.iconClass
    }))
  },
  {
    label: 'Help Desk', model: HelpRequest, filter: (record) => ({ _id: record._id }),
    records: [
      { key: 'helpdesk-wifi-library', category: 'Technical Issue', subject: 'Library Wi-Fi drops during video calls', description: 'The connection disconnects repeatedly in the second-floor study area during online classes.', priority: 'High', isAnonymous: false, submittedBy: { name: 'Aditi Sharma', email: 'aditi.sharma@example.invalid' }, status: 'In Progress' },
      { key: 'helpdesk-lab-access', category: 'Academic Help', subject: 'Request for an additional lab practice slot', description: 'Could an extra practice slot be considered before the upcoming programming lab assessment?', priority: 'Medium', isAnonymous: false, submittedBy: { name: 'Rahul Iyer', email: 'rahul.iyer@example.invalid' }, status: 'Submitted' },
      { key: 'helpdesk-water-cooler', category: 'Campus Issue', subject: 'Water cooler near Block A needs attention', description: 'The cooler beside the first-floor common area has not been cooling water consistently.', priority: 'Low', isAnonymous: true, submittedBy: null, status: 'Submitted' },
      { key: 'helpdesk-club-room', category: 'Event or Club', subject: 'Room booking confirmation for club meeting', description: 'Please confirm the seminar room booking process for a student club planning meeting.', priority: 'Medium', isAnonymous: false, submittedBy: { name: 'Meera Das', email: 'meera.das@example.invalid' }, status: 'Resolved' },
      { key: 'helpdesk-ramp-light', category: 'Campus Issue', subject: 'Lighting near the accessible ramp', description: 'The path light by the east entrance ramp appears dim after sunset.', priority: 'High', isAnonymous: true, submittedBy: null, status: 'In Progress' },
      { key: 'helpdesk-portal-feedback', category: 'Suggestion / Feedback', subject: 'Suggestion for clearer portal deadlines', description: 'Showing the due date and remaining days together would make assignment planning easier.', priority: 'Low', isAnonymous: false, submittedBy: { name: 'Vivaan Khanna', email: 'vivaan.khanna@example.invalid' }, status: 'Submitted' }
    ]
  }
].map((dataset) => ({
  ...dataset,
  records: dataset.records.map((record) => ({ ...record, _id: stableId(dataset.label, record.key) }))
}));

const activitySources = ['Assignments', 'Events', 'Help Desk', 'Marketplace'];
const activityDatasets = new Map(datasets.map((dataset) => [dataset.label, dataset]));
let activityAgeMinutes = 0;
for (let index = 0; index < Math.max(...activitySources.map((label) => activityDatasets.get(label).records.length)); index += 1) {
  for (const label of activitySources) {
    const record = activityDatasets.get(label).records[index];
    if (!record) continue;
    const seededAt = new Date(Date.now() - activityAgeMinutes * 60 * 1000);
    record.createdAt = seededAt;
    record.updatedAt = seededAt;
    activityAgeMinutes += 1;
  }
}

async function seedDataset(dataset) {
  let inserted = 0;
  let existing = 0;
  for (const record of dataset.records) {
    await new dataset.model(record).validate();
    const stableRecordExists = await dataset.model.exists({ _id: record._id });
    if (stableRecordExists) {
      existing += 1;
      // Preserve edited seed records. Only fill the intentionally added image field when blank.
      if (dataset.label === 'Marketplace' && record.imageUrl) {
        await dataset.model.updateOne(
          { _id: record._id, $or: [{ imageUrl: '' }, { imageUrl: { $exists: false } }, { imageUrl: null }] },
          { $set: { imageUrl: record.imageUrl } },
          { timestamps: false }
        );
      }
      continue;
    }
    const createdAt = record.createdAt || new Date();
    const result = await dataset.model.updateOne(
      dataset.filter(record),
      { $setOnInsert: { ...record, createdAt, updatedAt: record.updatedAt || createdAt } },
      { upsert: true, setDefaultsOnInsert: true, timestamps: false }
    );
    if (result.upsertedCount === 1) inserted += 1;
    else existing += 1;
  }
  return { inserted, existing };
}

async function clearSeedData(selectedDatasets = datasets) {
  for (const dataset of selectedDatasets) {
    const ids = dataset.records.map((record) => record._id);
    const result = await dataset.model.deleteMany({ _id: { $in: ids } });
    console.log(`${dataset.label}: removed ${result.deletedCount} seed record(s); unrelated records were not matched.`);
  }
}

async function ensureClubNameIndex() {
  const duplicateNames = await Club.aggregate([
    { $group: { _id: '$name', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $project: { _id: 1, count: 1 } },
    { $limit: 10 }
  ]);
  if (duplicateNames.length) {
    const names = duplicateNames.map((item) => `${item._id} (${item.count})`).join(', ');
    throw new Error(`Cannot add the unique club-name index while duplicate club names exist: ${names}. Resolve duplicates without deleting user data, then rerun the club seed.`);
  }

  const indexes = await Club.collection.indexes();
  const nameIndex = indexes.find((index) => index.key?.name === 1 && Object.keys(index.key).length === 1);
  if (nameIndex?.unique) return;
  if (nameIndex) await Club.collection.dropIndex(nameIndex.name);
  await Club.collection.createIndex({ name: 1 }, { unique: true, name: 'name_1' });
  console.log('Clubs: ensured unique club-name index without changing club records.');
}

async function main() {
  const clearOnly = process.argv.includes('--clear');
  const onlyArgs = process.argv.slice(2).filter((arg) => arg.startsWith('--only='));
  const unknownArgs = process.argv.slice(2).filter((arg) => arg !== '--clear' && !arg.startsWith('--only='));
  if (unknownArgs.length || process.argv.filter((arg) => arg === '--clear').length > 1 || onlyArgs.length > 1) {
    throw new Error('Usage: npm run seed [-- --only=Clubs] OR npm run seed:clear [-- --only=Clubs]');
  }
  const selectedDatasets = onlyArgs.length
    ? datasets.filter((dataset) => dataset.label === onlyArgs[0].slice('--only='.length))
    : datasets;
  if (!selectedDatasets.length) throw new Error('Unknown seed dataset. Available datasets: ' + datasets.map((dataset) => dataset.label).join(', '));
  await connectDatabase();
  try {
    if (clearOnly) {
      await clearSeedData(selectedDatasets);
      return;
    }
    if (selectedDatasets.some((dataset) => dataset.label === 'Clubs')) await ensureClubNameIndex();
    console.log('Adding demo records with insert-only upserts. Existing records will not be changed.');
    for (const dataset of selectedDatasets) {
      const result = await seedDataset(dataset);
      console.log(`${dataset.label}: inserted ${result.inserted}; already present ${result.existing}; total seed records ${dataset.records.length}.`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(`Database seed failed: ${error.message}`);
  process.exitCode = 1;
});
