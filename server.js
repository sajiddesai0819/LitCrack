const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Port configuration
const PORT = process.env.PORT || 3000;

const fs = require('fs');

// PostgreSQL Connection Pool Setup
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/litcrack';
const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 1000
});

let useLocalDb = false;

function readLocalDb() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {
      students: [],
      faculties: [],
      announcements: [],
      aptitudeQuestions: [],
      interviewQuestions: { hr: [], technical: [] }
    };
  }
}

function writeLocalDb(db) {
  try {
    fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error("Failed to write to local db.json:", e);
  }
}

async function runLocalQuery(text, params) {
  const db = readLocalDb();
  const textClean = text.replace(/\s+/g, ' ').trim();

  // SELECT id FROM students WHERE UPPER(usn) = $1
  if (textClean.includes("FROM students WHERE UPPER(usn) = $1")) {
    const usn = params[0].toUpperCase();
    const students = db.students.filter(s => (s.usn || '').toUpperCase() === usn);
    return { rows: students.map(s => ({ id: s.id || 1 })) };
  }

  // SELECT id FROM students WHERE LOWER(email) = $1
  if (textClean.includes("FROM students WHERE LOWER(email) = $1")) {
    const email = params[0].toLowerCase();
    const students = db.students.filter(s => (s.email || '').toLowerCase() === email);
    return { rows: students.map(s => ({ id: s.id || 1 })) };
  }

  // INSERT INTO students ... RETURNING
  if (textClean.startsWith("INSERT INTO students")) {
    const [name, usn, branch, email, password] = params;
    const newStudent = {
      id: db.students.length + 1,
      name,
      usn: usn.toUpperCase(),
      branch,
      email: email.toLowerCase(),
      password,
      scores: [],
      roadmapProgress: {},
      starAnswers: [],
      gdCount: 0
    };
    db.students.push(newStudent);
    writeLocalDb(db);
    return {
      rows: [{
        name: newStudent.name,
        usn: newStudent.usn,
        branch: newStudent.branch,
        email: newStudent.email,
        scores: newStudent.scores,
        roadmapProgress: newStudent.roadmapProgress,
        starAnswers: newStudent.starAnswers,
        gdCount: newStudent.gdCount
      }]
    };
  }

  // SELECT ... FROM students WHERE LOWER(email) = $1 AND password = $2
  if (textClean.includes("FROM students WHERE LOWER(email) = $1 AND password = $2")) {
    const email = params[0].toLowerCase();
    const password = params[1];
    const s = db.students.find(x => (x.email || '').toLowerCase() === email && x.password === password);
    if (s) {
      return {
        rows: [{
          name: s.name,
          usn: s.usn,
          branch: s.branch,
          email: s.email,
          scores: s.scores || [],
          roadmapProgress: s.roadmapProgress || s.roadmap_progress || {},
          starAnswers: s.starAnswers || s.star_answers || [],
          gdCount: s.gdCount || s.gd_count || 0
        }]
      };
    }
    return { rows: [] };
  }

  // SELECT id, name, role, image FROM faculties ORDER BY id ASC
  if (textClean.includes("FROM faculties ORDER BY id ASC") || textClean.includes("FROM faculties")) {
    return { rows: db.faculties || [] };
  }

  // SELECT name, usn, branch, email, scores FROM students ORDER BY id DESC
  if (textClean.includes("FROM students ORDER BY id DESC")) {
    return {
      rows: db.students.map(s => ({
        name: s.name,
        usn: s.usn,
        branch: s.branch,
        email: s.email,
        scores: s.scores || []
      }))
    };
  }

  // INSERT INTO faculties
  if (textClean.startsWith("INSERT INTO faculties")) {
    const [name, role, image] = params;
    const newFac = {
      id: db.faculties.length + 1,
      name,
      role,
      image: image || "assets/club_coord.png"
    };
    db.faculties.push(newFac);
    writeLocalDb(db);
    return { rows: [newFac] };
  }

  // DELETE FROM faculties WHERE id = $1
  if (textClean.startsWith("DELETE FROM faculties WHERE id = $1")) {
    const id = parseInt(params[0]);
    const idx = db.faculties.findIndex(f => f.id === id);
    if (idx !== -1) {
      const removed = db.faculties.splice(idx, 1)[0];
      writeLocalDb(db);
      return { rows: [removed] };
    }
    return { rows: [] };
  }

  // SELECT ... FROM announcements ORDER BY id DESC
  if (textClean.includes("FROM announcements ORDER BY id DESC") || textClean.includes("FROM announcements")) {
    return { rows: db.announcements || [] };
  }

  // SELECT COUNT(*) FROM students
  if (textClean.includes("SELECT COUNT(*) FROM students")) {
    return { rows: [{ count: db.students.length }] };
  }

  // SELECT COUNT(*) FROM faculties
  if (textClean.includes("SELECT COUNT(*) FROM faculties")) {
    return { rows: [{ count: db.faculties.length }] };
  }

  // SELECT COUNT(*) FROM aptitude_questions
  if (textClean.includes("SELECT COUNT(*) FROM aptitude_questions")) {
    return { rows: [{ count: db.aptitudeQuestions.length }] };
  }

  // SELECT COUNT(*) FROM interview_questions
  if (textClean.includes("SELECT COUNT(*) FROM interview_questions")) {
    const count = (db.interviewQuestions?.hr?.length || 0) + (db.interviewQuestions?.technical?.length || 0);
    return { rows: [{ count }] };
  }

  // INSERT INTO announcements
  if (textClean.startsWith("INSERT INTO announcements")) {
    const [id, date, title, tag, message, emailed_count] = params;
    const newAnn = { id, date, title, tag, message, emailedCount: emailed_count };
    db.announcements = db.announcements || [];
    db.announcements.push(newAnn);
    writeLocalDb(db);
    return { rows: [newAnn] };
  }

  // DELETE FROM announcements WHERE id = $1
  if (textClean.startsWith("DELETE FROM announcements WHERE id = $1")) {
    const id = parseInt(params[0]);
    db.announcements = db.announcements || [];
    const idx = db.announcements.findIndex(a => a.id === id);
    if (idx !== -1) {
      const removed = db.announcements.splice(idx, 1)[0];
      writeLocalDb(db);
      return { rows: [removed] };
    }
    return { rows: [] };
  }

  // SELECT id, question, options, answer, explanation FROM aptitude_questions ORDER BY id ASC
  if (textClean.includes("FROM aptitude_questions ORDER BY id ASC") || textClean.includes("FROM aptitude_questions")) {
    return { rows: db.aptitudeQuestions || [] };
  }

  // INSERT INTO aptitude_questions
  if (textClean.startsWith("INSERT INTO aptitude_questions")) {
    const [id, question, optionsRaw, answer, explanation] = params;
    const options = typeof optionsRaw === 'string' ? JSON.parse(optionsRaw) : optionsRaw;
    const newQ = { id, question, options, answer, explanation };
    db.aptitudeQuestions.push(newQ);
    writeLocalDb(db);
    return { rows: [newQ] };
  }

  // DELETE FROM aptitude_questions WHERE id = $1
  if (textClean.startsWith("DELETE FROM aptitude_questions WHERE id = $1")) {
    const id = parseInt(params[0]);
    const idx = db.aptitudeQuestions.findIndex(q => q.id === id);
    if (idx !== -1) {
      const removed = db.aptitudeQuestions.splice(idx, 1)[0];
      writeLocalDb(db);
      return { rows: [removed] };
    }
    return { rows: [] };
  }

  // SELECT id, question, keywords, good_phrasing AS "goodPhrasing" FROM interview_questions WHERE category = $1
  if (textClean.includes("FROM interview_questions WHERE category = $1") || textClean.includes("FROM interview_questions WHERE category = 'hr'") || textClean.includes("FROM interview_questions WHERE category = 'technical'")) {
    let cat = params[0] || (textClean.includes("category = 'hr'") ? 'hr' : 'technical');
    let questions = db.interviewQuestions?.[cat] || [];
    return {
      rows: questions.map(q => ({
        id: q.id,
        question: q.question,
        keywords: q.keywords,
        goodPhrasing: q.goodPhrasing || q.good_phrasing
      }))
    };
  }

  // INSERT INTO interview_questions
  if (textClean.startsWith("INSERT INTO interview_questions")) {
    const [id, category, question, keywordsRaw, good_phrasing] = params;
    const keywords = typeof keywordsRaw === 'string' ? JSON.parse(keywordsRaw) : keywordsRaw;
    const newQ = { id, question, keywords, goodPhrasing: good_phrasing };
    db.interviewQuestions = db.interviewQuestions || { hr: [], technical: [] };
    db.interviewQuestions[category] = db.interviewQuestions[category] || [];
    db.interviewQuestions[category].push(newQ);
    writeLocalDb(db);
    return { rows: [newQ] };
  }

  // DELETE FROM interview_questions WHERE category = $1 AND id = $2
  if (textClean.startsWith("DELETE FROM interview_questions WHERE category = $1 AND id = $2")) {
    const [category, id] = params;
    const qId = parseInt(id);
    db.interviewQuestions = db.interviewQuestions || { hr: [], technical: [] };
    db.interviewQuestions[category] = db.interviewQuestions[category] || [];
    const idx = db.interviewQuestions[category].findIndex(q => q.id === qId);
    if (idx !== -1) {
      const removed = db.interviewQuestions[category].splice(idx, 1)[0];
      writeLocalDb(db);
      return { rows: [removed] };
    }
    return { rows: [] };
  }

  // SELECT ... FROM students WHERE LOWER(email) = $1 (sync student progress)
  if (textClean.includes("FROM students WHERE LOWER(email) = $1")) {
    const email = params[0].toLowerCase();
    const s = db.students.find(x => (x.email || '').toLowerCase() === email);
    if (s) {
      return {
        rows: [{
          id: s.id,
          roadmap_progress: s.roadmapProgress || s.roadmap_progress || {},
          star_answers: s.starAnswers || s.star_answers || [],
          gd_count: s.gdCount || s.gd_count || 0,
          scores: s.scores || []
        }]
      };
    }
    return { rows: [] };
  }

  // UPDATE students SET roadmap_progress = $1, ... WHERE id = $5
  if (textClean.startsWith("UPDATE students SET roadmap_progress = $1")) {
    const [roadmapProgressRaw, starAnswersRaw, gdCount, scoresRaw, id] = params;
    const roadmapProgress = typeof roadmapProgressRaw === 'string' ? JSON.parse(roadmapProgressRaw) : roadmapProgressRaw;
    const starAnswers = typeof starAnswersRaw === 'string' ? JSON.parse(starAnswersRaw) : starAnswersRaw;
    const scores = typeof scoresRaw === 'string' ? JSON.parse(scoresRaw) : scoresRaw;

    const s = db.students.find(x => x.id === id);
    if (s) {
      s.roadmapProgress = roadmapProgress;
      s.starAnswers = starAnswers;
      s.gdCount = parseInt(gdCount);
      s.scores = scores;
      writeLocalDb(db);
    }
    return { rows: [] };
  }

  // UPDATE students SET scores = $1 WHERE id = $2
  if (textClean.startsWith("UPDATE students SET scores = $1 WHERE id = $2")) {
    const [scoresRaw, id] = params;
    const scores = typeof scoresRaw === 'string' ? JSON.parse(scoresRaw) : scoresRaw;
    const s = db.students.find(x => x.id === id);
    if (s) {
      s.scores = scores;
      writeLocalDb(db);
    }
    return { rows: [] };
  }

  console.warn("Unmatched local database query:", textClean);
  return { rows: [] };
}

const originalQuery = pool.query.bind(pool);
pool.query = async function(text, params) {
  if (useLocalDb) {
    return runLocalQuery(text, params);
  }
  try {
    return await originalQuery(text, params);
  } catch (err) {
    console.error("Postgres query failed. Falling back to local db.json store:", err.message);
    useLocalDb = true;
    return runLocalQuery(text, params);
  }
};

// Predefined fallback interview questions for seeding
const DEFAULT_INTERVIEW_QUESTIONS = {
  hr: [
    {
      id: 1,
      question: "Welcome! To start off, please tell me about a time you had to resolve a conflict with a team member during a college project. What steps did you take?",
      keywords: ["communicate", "talked", "conflict", "resolved", "understanding", "listened", "middle ground", "compromise"],
      goodPhrasing: "I initiated a private conversation to understand their perspective, reassessed our division of responsibilities, and aligned our goals to complete the milestone collectively."
    },
    {
      id: 2,
      question: "Thank you. How do you handle setbacks or personal failure? Can you share an example of a mistake you made and what you learned from it?",
      keywords: ["mistake", "learned", "feedback", "improved", "responsibility", "growth", "corrected", "setback"],
      goodPhrasing: "We encountered database instability which impacted our submission. Recognizing this gap, I took ownership, learned indexing optimization, and successfully stabilized the server for future builds."
    },
    {
      id: 3,
      question: "Excellent. Finally, why do you want to join an IT company, and how do you align your career goals with a fast-paced software team?",
      keywords: ["skills", "career", "growth", "learn", "passion", "contribute", "technology", "innovate", "adapt"],
      goodPhrasing: "I want to apply my logical foundations to build scalable systems while working in a collaborative team that challenges my technical skills and fuels continuous learning."
    }
  ],
  technical: [
    {
      id: 4,
      question: "Let's dive into some fundamentals. Can you explain what Object-Oriented Programming is and outline its four main pillars?",
      keywords: ["class", "object", "inheritance", "polymorphism", "encapsulation", "abstraction", "reusability", "data hiding"],
      goodPhrasing: "Object-Oriented Programming is a paradigm centered around objects and classes. Its four pillars—Encapsulation, Inheritance, Polymorphism, and Abstraction—help make software modular, reusable, and secure."
    },
    {
      id: 5,
      question: "Good. Now, what is a memory leak, and what are some strategies to identify and prevent leaks in languages like Javascript or C++?",
      keywords: ["leak", "garbage collector", "pointer", "allocation", "reference", "release", "profile", "cleanup", "destructor"],
      goodPhrasing: "A memory leak occurs when allocated memory is no longer needed but is not released back to the system. We can prevent this by deallocating pointers in C++ or removing unused global references and timers in JavaScript."
    },
    {
      id: 6,
      question: "Understood. Can you explain the main architectural differences between SQL and NoSQL databases, and when you would choose one over the other?",
      keywords: ["relational", "schema", "nosql", "unstructured", "scale", "document", "key-value", "acid", "mongodb", "mysql"],
      goodPhrasing: "SQL databases are relational, schema-based, and ensure strict ACID properties. NoSQL databases are non-relational, schema-less, and scale horizontally, making them ideal for unstructured data like real-time feeds."
    }
  ]
};

// Sample placement aptitude question database
const APTITUDE_QUESTION_POOL = [
  {
    id: 1,
    question: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
    options: ["120 metres", "150 metres", "324 metres", "180 metres"],
    answer: 1,
    explanation: "Speed = 60 * (5/18) m/sec = 50/3 m/sec. Length of train = Speed * Time = (50/3) * 9 = 150 metres."
  },
  {
    id: 2,
    question: "If a developer writes a code block that runs in O(N log N) time, and another that runs in O(N^2) time. For N = 10^6, which one is faster and by what factor approximately?",
    options: ["O(N log N) is ~50,000 times faster", "O(N^2) is faster", "They are identical in speed", "O(N log N) is ~5 times faster"],
    answer: 0,
    explanation: "For N = 10^6, N log N is approx 10^6 * 20 = 2 * 10^7 operations. N^2 is 10^12 operations. 10^12 / (2 * 10^7) = 50,000 times faster."
  },
  {
    id: 3,
    question: "Find the odd man out: 3, 5, 11, 14, 17, 21",
    options: ["21", "14", "17", "11"],
    answer: 1,
    explanation: "All numbers except 14 are odd numbers. 14 is the only even number."
  },
  {
    id: 4,
    question: "Which data structure is best suited for implementing a LIFO (Last In, First Out) buffer?",
    options: ["Queue", "Stack", "Linked List", "Binary Search Tree"],
    answer: 1,
    explanation: "A Stack operates on the Last In First Out (LIFO) principle, where the last element inserted is the first one removed."
  },
  {
    id: 5,
    question: "Choose the word which is most nearly OPPOSITE in meaning to: 'OBSTINATE'",
    options: ["Stubborn", "Flexible", "Rigid", "Dogmatic"],
    answer: 1,
    explanation: "Obstinate means stubborn or refusing to change one's opinion. The opposite is flexible or compliant."
  }
];

// Initialize and Create Postgres tables
async function initPostgresDatabase() {
  try {
    // Test connection quickly on boot
    const client = await pool.connect();
    client.release();

    // 1. Create students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        usn VARCHAR(50) UNIQUE NOT NULL,
        branch VARCHAR(50) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        roadmap_progress JSONB DEFAULT '{}'::jsonb,
        star_answers JSONB DEFAULT '[]'::jsonb,
        gd_count INT DEFAULT 0,
        scores JSONB DEFAULT '[]'::jsonb
      );
    `);

    // 2. Create faculties table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        image VARCHAR(255)
      );
    `);

    // 3. Create announcements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id BIGINT PRIMARY KEY,
        date VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        tag VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        emailed_count INT DEFAULT 0
      );
    `);

    // 4. Create aptitude_questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS aptitude_questions (
        id BIGINT PRIMARY KEY,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        answer INT NOT NULL,
        explanation TEXT NOT NULL
      );
    `);

    // 5. Create interview_questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interview_questions (
        id BIGINT PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        keywords JSONB NOT NULL,
        good_phrasing TEXT NOT NULL
      );
    `);

    console.log("PostgreSQL schema validated/created successfully.");
    await seedPostgresDatabase();
  } catch (err) {
    console.error("Fatal error initializing PostgreSQL database tables:", err);
    useLocalDb = true;
  }
}

// Seed Postgres with Initial Fallback Assets
async function seedPostgresDatabase() {
  try {
    // 1. Seed faculties
    const facRes = await pool.query("SELECT COUNT(*) FROM faculties");
    if (parseInt(facRes.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO faculties (name, role, image) VALUES
        ('Dr. Darshankumar D. Billur', 'Principal, KLECET Chikodi', 'assets/principal.png'),
        ('Dr. Sandeep K.', 'Dean - Training & Placements', 'assets/placement_head.png'),
        ('Prof. Anita Patil', 'Literary Club Coordinator', 'assets/club_coord.png');
      `);
      console.log("Seeded faculty directory.");
    }

    // 2. Seed aptitude questions
    const aptRes = await pool.query("SELECT COUNT(*) FROM aptitude_questions");
    if (parseInt(aptRes.rows[0].count) === 0) {
      for (const q of APTITUDE_QUESTION_POOL) {
        await pool.query(`
          INSERT INTO aptitude_questions (id, question, options, answer, explanation)
          VALUES ($1, $2, $3, $4, $5);
        `, [q.id, q.question, JSON.stringify(q.options), q.answer, q.explanation]);
      }
      console.log("Seeded default aptitude questions.");
    }

    // 3. Seed interview prompts
    const intRes = await pool.query("SELECT COUNT(*) FROM interview_questions");
    if (parseInt(intRes.rows[0].count) === 0) {
      for (const q of DEFAULT_INTERVIEW_QUESTIONS.hr) {
        await pool.query(`
          INSERT INTO interview_questions (id, category, question, keywords, good_phrasing)
          VALUES ($1, $2, $3, $4, $5);
        `, [q.id, 'hr', q.question, JSON.stringify(q.keywords), q.goodPhrasing]);
      }
      for (const q of DEFAULT_INTERVIEW_QUESTIONS.technical) {
        await pool.query(`
          INSERT INTO interview_questions (id, category, question, keywords, good_phrasing)
          VALUES ($1, $2, $3, $4, $5);
        `, [q.id, 'technical', q.question, JSON.stringify(q.keywords), q.goodPhrasing]);
      }
      console.log("Seeded default interview prompts.");
    }
  } catch (err) {
    console.error("Error seeding default Postgres database tables:", err);
  }
}

initPostgresDatabase();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Keep-alive / ping endpoint to prevent Render.com spin-downs
app.get('/ping', (req, res) => {
  res.json({ status: "alive", timestamp: new Date() });
});

// Memory storage for active rooms
const rooms = new Map();

// Helper to generate a unique 4-character uppercase code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

// ==========================================================================
// REST API ROUTES (AUTHENTICATION & DATABASE CONTROL)
// ==========================================================================

// 1. Student Registration
app.post('/api/register', async (req, res) => {
  const { name, usn, branch, email, password } = req.body;
  
  if (!name || !usn || !branch || !email || !password) {
    return res.status(400).json({ success: false, message: "Please fill out all registration fields." });
  }

  try {
    // Check if USN already exists
    const usnCheck = await pool.query("SELECT id FROM students WHERE UPPER(usn) = $1", [usn.toUpperCase()]);
    if (usnCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: "A student with this USN is already registered." });
    }

    // Check if Email already exists
    const emailCheck = await pool.query("SELECT id FROM students WHERE LOWER(email) = $1", [email.toLowerCase()]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: "A student with this Email is already registered." });
    }

    // Insert new student record
    const insertRes = await pool.query(`
      INSERT INTO students (name, usn, branch, email, password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING name, usn, branch, email, scores, roadmap_progress AS "roadmapProgress", star_answers AS "starAnswers", gd_count AS "gdCount";
    `, [name, usn.toUpperCase(), branch, email.toLowerCase(), password]);

    const student = insertRes.rows[0];

    res.status(201).json({ 
      success: true, 
      user: { ...student, role: 'student' } 
    });
  } catch (err) {
    console.error("Registration database error:", err);
    res.status(500).json({ success: false, message: "Server database error during registration." });
  }
});

// 2. Student & Admin Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Please provide both email and password." });
  }

  try {
    // Check if it matches Admin
    if (email.toLowerCase() === 'admin@klecet.edu.in' && password === 'admin123') {
      return res.json({
        success: true,
        user: { email: email.toLowerCase(), name: "System Admin", role: "admin" }
      });
    }

    // Check if it matches Student
    const studentCheck = await pool.query(`
      SELECT name, usn, branch, email, scores, roadmap_progress AS "roadmapProgress", star_answers AS "starAnswers", gd_count AS "gdCount"
      FROM students
      WHERE LOWER(email) = $1 AND password = $2;
    `, [email.toLowerCase(), password]);

    if (studentCheck.rows.length > 0) {
      const student = studentCheck.rows[0];
      return res.json({
        success: true,
        user: { ...student, role: "student" }
      });
    }

    res.status(401).json({ success: false, message: "Invalid email or password." });
  } catch (err) {
    console.error("Login database error:", err);
    res.status(500).json({ success: false, message: "Server database error during login." });
  }
});

// 3. Public get faculties list
app.get('/api/faculties', async (req, res) => {
  try {
    const facRes = await pool.query("SELECT id, name, role, image FROM faculties ORDER BY id ASC");
    res.json({ success: true, faculties: facRes.rows });
  } catch (err) {
    console.error("Error reading faculties:", err);
    res.status(500).json({ success: false, message: "Database read error." });
  }
});

// ==========================================================================
// ADMIN CONTROL PANELS APIS
// ==========================================================================

// Helper middleware to mock verify admin role (simple header check)
function adminVerify(req, res, next) {
  const adminEmail = req.headers['admin-email'];
  if (adminEmail === 'admin@klecet.edu.in') {
    next();
  } else {
    res.status(403).json({ success: false, message: "Unauthorized access. Admin role required." });
  }
}

// 4. Fetch all students (Admin)
app.get('/api/admin/students', adminVerify, async (req, res) => {
  try {
    const studentsRes = await pool.query(`
      SELECT name, usn, branch, email, scores
      FROM students
      ORDER BY id DESC;
    `);
    res.json({ success: true, students: studentsRes.rows });
  } catch (err) {
    console.error("Error fetching students roster:", err);
    res.status(500).json({ success: false, message: "Database read error." });
  }
});

// 5. Add Faculty Member (Admin)
app.post('/api/admin/faculty/add', adminVerify, async (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) {
    return res.status(400).json({ success: false, message: "Faculty name and role are required." });
  }

  try {
    const insertRes = await pool.query(`
      INSERT INTO faculties (name, role, image)
      VALUES ($1, $2, $3)
      RETURNING id, name, role, image;
    `, [name, role, "assets/club_coord.png"]);
    res.json({ success: true, faculty: insertRes.rows[0] });
  } catch (err) {
    console.error("Error adding faculty:", err);
    res.status(500).json({ success: false, message: "Database write error." });
  }
});

// 6. Delete Faculty Member (Admin)
app.delete('/api/admin/faculty/remove/:id', adminVerify, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const delRes = await pool.query("DELETE FROM faculties WHERE id = $1 RETURNING id", [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Faculty member not found." });
    }
    res.json({ success: true, message: "Faculty member successfully removed." });
  } catch (err) {
    console.error("Error deleting faculty:", err);
    res.status(500).json({ success: false, message: "Database write error." });
  }
});

// 7. Get public announcements list
app.get('/api/announcements', async (req, res) => {
  try {
    const anns = await pool.query("SELECT id, date, title, tag, message, emailed_count AS \"emailedCount\" FROM announcements ORDER BY id DESC");
    res.json({ success: true, announcements: anns.rows });
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ success: false, message: "Database read error." });
  }
});

// 8. Create & Broadcast announcement (Admin)
app.post('/api/admin/announcements', adminVerify, async (req, res) => {
  const { title, tag, message } = req.body;
  if (!title || !tag || !message) {
    return res.status(400).json({ success: false, message: "Announcement title, tag, and message are required." });
  }

  try {
    const studentCountRes = await pool.query("SELECT COUNT(*) FROM students");
    const emailedCount = parseInt(studentCountRes.rows[0].count);

    const newAnn = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title,
      tag,
      message,
      emailedCount
    };

    await pool.query(`
      INSERT INTO announcements (id, date, title, tag, message, emailed_count)
      VALUES ($1, $2, $3, $4, $5, $6);
    `, [newAnn.id, newAnn.date, newAnn.title, newAnn.tag, newAnn.message, newAnn.emailedCount]);

    // Simulate Email Dispatching to Console
    console.log(`\n============================================================`);
    console.log(`[SMTP EMAIL BROADCAST SYSTEM] Dispatching announcement...`);
    console.log(`Sender: KLECET Placement & Literary Wing <admin@klecet.edu.in>`);
    console.log(`Subject: [LitCrack Announcement] ${title}`);
    console.log(`Tag: [${tag}]`);
    console.log(`Message Body:\n------------------------------------------------------------\n${message}\n------------------------------------------------------------`);
    console.log(`Sending to ${emailedCount} registered students...`);
    console.log(`============================================================\n`);

    res.json({ success: true, announcement: newAnn });
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ success: false, message: "Database write error." });
  }
});

// 9. Remove announcement (Admin)
app.delete('/api/admin/announcements/:id', adminVerify, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const delRes = await pool.query("DELETE FROM announcements WHERE id = $1 RETURNING id", [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }
    res.json({ success: true, message: "Announcement successfully deleted." });
  } catch (err) {
    console.error("Error deleting announcement:", err);
    res.status(500).json({ success: false, message: "Database write error." });
  }
});

// 10. Get all aptitude questions (Admin/Public)
app.get('/api/admin/questions/aptitude', adminVerify, async (req, res) => {
  try {
    const questions = await pool.query("SELECT id, question, options, answer, explanation FROM aptitude_questions ORDER BY id ASC");
    res.json({ success: true, questions: questions.rows });
  } catch (err) {
    console.error("Error fetching aptitude questions:", err);
    res.status(500).json({ success: false, message: "Database read error." });
  }
});

// 11. Add new aptitude question (Admin)
app.post('/api/admin/questions/aptitude', adminVerify, async (req, res) => {
  const { question, options, answer, explanation } = req.body;
  if (!question || !options || options.length !== 4 || answer === undefined || !explanation) {
    return res.status(400).json({ success: false, message: "Provide question text, exactly 4 options, correct answer index, and an explanation." });
  }

  const newQ = {
    id: Date.now(),
    question,
    options,
    answer: parseInt(answer),
    explanation
  };

  try {
    await pool.query(`
      INSERT INTO aptitude_questions (id, question, options, answer, explanation)
      VALUES ($1, $2, $3, $4, $5);
    `, [newQ.id, newQ.question, JSON.stringify(newQ.options), newQ.answer, newQ.explanation]);
    res.json({ success: true, question: newQ });
  } catch (err) {
    console.error("Error adding aptitude question:", err);
    res.status(500).json({ success: false, message: "Database write error." });
  }
});

// 12. Delete aptitude question (Admin)
app.delete('/api/admin/questions/aptitude/:id', adminVerify, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const delRes = await pool.query("DELETE FROM aptitude_questions WHERE id = $1 RETURNING id", [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }
    res.json({ success: true, message: "Aptitude question successfully removed." });
  } catch (err) {
    console.error("Error deleting aptitude question:", err);
    res.status(500).json({ success: false, message: "Database write error." });
  }
});

// 13. Get all interview questions (Public)
app.get('/api/questions/interview', async (req, res) => {
  try {
    const hrQ = await pool.query("SELECT id, question, keywords, good_phrasing AS \"goodPhrasing\" FROM interview_questions WHERE category = 'hr' ORDER BY id ASC");
    const techQ = await pool.query("SELECT id, question, keywords, good_phrasing AS \"goodPhrasing\" FROM interview_questions WHERE category = 'technical' ORDER BY id ASC");
    res.json({
      success: true,
      interviewQuestions: {
        hr: hrQ.rows,
        technical: techQ.rows
      }
    });
  } catch (err) {
    console.error("Error reading interview questions:", err);
    res.status(500).json({ success: false, message: "Database read error." });
  }
});

// 14. Add new mock interview question (Admin)
app.post('/api/admin/questions/interview', adminVerify, async (req, res) => {
  const { category, question, keywords, goodPhrasing } = req.body;
  if (!category || !question || !keywords || !goodPhrasing) {
    return res.status(400).json({ success: false, message: "Category (hr/technical), question text, keywords, and model phrasing are required." });
  }

  const kwArr = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
  const newQ = {
    id: Date.now(),
    question,
    keywords: kwArr,
    goodPhrasing
  };

  try {
    await pool.query(`
      INSERT INTO interview_questions (id, category, question, keywords, good_phrasing)
      VALUES ($1, $2, $3, $4, $5);
    `, [newQ.id, category, newQ.question, JSON.stringify(newQ.keywords), newQ.goodPhrasing]);
    res.json({ success: true, question: newQ });
  } catch (err) {
    console.error("Error adding interview question:", err);
    res.status(500).json({ success: false, message: "Database write error." });
  }
});

// 15. Delete mock interview question (Admin)
app.delete('/api/admin/questions/interview/:category/:id', adminVerify, async (req, res) => {
  const { category, id } = req.params;
  const qId = parseInt(id);
  try {
    const delRes = await pool.query("DELETE FROM interview_questions WHERE category = $1 AND id = $2 RETURNING id", [category, qId]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Interview question not found." });
    }
    res.json({ success: true, message: "Interview question successfully removed." });
  } catch (err) {
    console.error("Error deleting interview question:", err);
    res.status(500).json({ success: false, message: "Database write error." });
  }
});

// 16. Student Progress Synchronization (NEW)
app.post('/api/student/sync', async (req, res) => {
  const { email, roadmapProgress, starAnswers, gdCount, practiceScores } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  try {
    const studentRes = await pool.query("SELECT id, roadmap_progress, star_answers, gd_count, scores FROM students WHERE LOWER(email) = $1", [email.toLowerCase()]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const currentStudent = studentRes.rows[0];

    const newRoadmap = roadmapProgress !== undefined ? JSON.stringify(roadmapProgress) : JSON.stringify(currentStudent.roadmap_progress);
    const newStar = starAnswers !== undefined ? JSON.stringify(starAnswers) : JSON.stringify(currentStudent.star_answers);
    const newGdCount = gdCount !== undefined ? parseInt(gdCount) : currentStudent.gd_count;
    const newScores = practiceScores !== undefined ? JSON.stringify(practiceScores) : JSON.stringify(currentStudent.scores);

    await pool.query(`
      UPDATE students
      SET roadmap_progress = $1, star_answers = $2, gd_count = $3, scores = $4
      WHERE id = $5;
    `, [newRoadmap, newStar, newGdCount, newScores, currentStudent.id]);

    res.json({ success: true });
  } catch (err) {
    console.error("Error synchronizing student progress profile:", err);
    res.status(500).json({ success: false, message: "Database write error." });
  }
});

// ==========================================================================
// SOCKET.IO REAL-TIME APTITUDE & INTERVIEW LOBBIES
// ==========================================================================

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('create_room', async (data, callback) => {
    const roomCode = generateRoomCode();
    const duration = data.duration || 300;
    const roomType = data.roomType || 'aptitude';
    const interviewFocus = data.interviewFocus || 'hr';

    let selectedQuestions = [];
    try {
      if (roomType === 'interview') {
        const qRes = await pool.query("SELECT id, question, keywords, good_phrasing AS \"goodPhrasing\" FROM interview_questions WHERE category = $1 ORDER BY id ASC", [interviewFocus]);
        selectedQuestions = qRes.rows;
      } else {
        const qRes = await pool.query("SELECT id, question, options, answer, explanation FROM aptitude_questions ORDER BY id ASC");
        selectedQuestions = qRes.rows;
      }
    } catch (err) {
      console.error("Error fetching room questions from database:", err);
    }

    const room = {
      code: roomCode,
      adminId: socket.id,
      status: 'lobby',
      students: [],
      questions: selectedQuestions,
      roomType: roomType,
      interviewFocus: interviewFocus,
      duration: duration,
      timeLeft: duration,
      timerInterval: null
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);

    console.log(`Room created: ${roomCode} (${roomType} - ${interviewFocus}) by Admin: ${socket.id}`);
    callback({ success: true, roomCode, questionsCount: selectedQuestions.length, roomType });
  });

  socket.on('join_room', (data, callback) => {
    const { name, roomCode, usn } = data;
    const room = rooms.get(roomCode?.toUpperCase());

    if (!room) {
      return callback({ success: false, message: "Room not found. Please check the code." });
    }

    if (room.status !== 'lobby') {
      return callback({ success: false, message: "Test has already started or finished." });
    }

    // Check if USN or socket is already in room
    if (room.students.some(s => s.usn === usn || s.id === socket.id)) {
      return callback({ success: false, message: "You have already joined this room." });
    }

    const newStudent = {
      id: socket.id,
      name: name,
      usn: usn || "GUEST",
      score: 0,
      correctCount: 0,
      finished: false,
      timeTaken: 0
    };

    room.students.push(newStudent);
    socket.join(room.code);

    io.to(room.code).emit('lobby_update', {
      students: room.students.map(s => ({ name: s.name, id: s.id }))
    });

    console.log(`Student ${name} (${usn}) joined room ${room.code}`);
    callback({ success: true, roomCode: room.code, duration: room.duration, roomType: room.roomType });
  });

  socket.on('start_test', (data) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);

    if (!room || room.adminId !== socket.id) {
      return;
    }

    room.status = 'active';
    io.to(roomCode).emit('test_started', {
      roomType: room.roomType,
      questions: room.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options || null,
        keywords: q.keywords || null,
        goodPhrasing: q.goodPhrasing || null
      })),
      duration: room.duration
    });

    room.timeLeft = room.duration;
    room.timerInterval = setInterval(() => {
      room.timeLeft--;

      if (room.timeLeft <= 0) {
        clearInterval(room.timerInterval);
        room.status = 'finished';
        io.to(roomCode).emit('timer_out');
        io.to(roomCode).emit('test_finished', { leaderboard: getLeaderboard(room) });
      } else {
        io.to(roomCode).emit('timer_update', { timeLeft: room.timeLeft });
      }
    }, 1000);
  });

  socket.on('submit_live_interview_score', (data) => {
    const { roomCode, score } = data;
    const room = rooms.get(roomCode);
    if (!room) return;

    const student = room.students.find(s => s.id === socket.id);
    if (student) {
      student.score = Math.round(score);
      io.to(roomCode).emit('leaderboard_update', {
        leaderboard: getLeaderboard(room)
      });
    }
  });

  socket.on('submit_answers', async (data, callback) => {
    const { roomCode, answers, email } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      return callback ? callback({ success: false, message: "Room not found." }) : null;
    }

    const student = room.students.find(s => s.id === socket.id);
    if (!student) {
      return callback ? callback({ success: false, message: "Student not found in this room." }) : null;
    }

    if (student.finished) {
      return callback ? callback({ success: true, alreadySubmitted: true }) : null;
    }

    let score = 0;
    let correctCount = 0;
    const timeTaken = room.duration - room.timeLeft;

    if (room.roomType === 'interview') {
      score = data.score || 0;
      correctCount = Math.round((score / 100) * room.questions.length);
    } else {
      room.questions.forEach((q) => {
        if (answers[q.id] === q.answer) {
          correctCount++;
        }
      });
      score = Math.round((correctCount / room.questions.length) * 100);
    }

    student.score = score;
    student.correctCount = correctCount;
    student.finished = true;
    student.timeTaken = timeTaken;

    if (email) {
      try {
        const studentRes = await pool.query("SELECT id, scores FROM students WHERE LOWER(email) = $1", [email.toLowerCase()]);
        if (studentRes.rows.length > 0) {
          const dbStudent = studentRes.rows[0];
          const dbScores = dbStudent.scores || [];
          dbScores.push({
            score,
            correctCount,
            totalQuestions: room.questions.length,
            timeTaken,
            date: new Date().toLocaleDateString(),
            type: room.roomType === 'interview' ? 'interview' : 'aptitude'
          });
          await pool.query("UPDATE students SET scores = $1 WHERE id = $2", [JSON.stringify(dbScores), dbStudent.id]);
          console.log(`Saved ${room.roomType} score ${score}% in database for ${email}`);
        }
      } catch (err) {
        console.error("Error saving student test score to Postgres:", err);
      }
    }

    if (callback) {
      callback({
        success: true,
        score,
        correctCount,
        totalQuestions: room.questions.length,
        timeTaken
      });
    }

    io.to(roomCode).emit('leaderboard_update', {
      leaderboard: getLeaderboard(room)
    });

    const allFinished = room.students.every(s => s.finished);
    if (allFinished) {
      clearInterval(room.timerInterval);
      room.status = 'finished';
      io.to(roomCode).emit('test_finished', { leaderboard: getLeaderboard(room) });
    }
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms.entries()) {
      const studentIdx = room.students.findIndex(s => s.id === socket.id);
      if (studentIdx !== -1) {
        if (room.status === 'lobby') {
          room.students.splice(studentIdx, 1);
          io.to(code).emit('lobby_update', {
            students: room.students.map(s => ({ name: s.name, id: s.id }))
          });
        }
        break;
      }

      if (room.adminId === socket.id) {
        if (room.status === 'lobby') {
          clearInterval(room.timerInterval);
          io.to(code).emit('room_disbanded', { message: "Admin closed the room." });
          rooms.delete(code);
        }
      }
    }
  });
});

function getLeaderboard(room) {
  return room.students
    .map(s => ({
      name: s.name,
      score: s.score,
      correctCount: s.correctCount,
      finished: s.finished,
      timeTaken: s.timeTaken
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.timeTaken - b.timeTaken;
    });
}

// Start Server
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`LitCrack Server running on http://localhost:${PORT}`);
  console.log(`===================================================`);
});
