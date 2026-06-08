const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

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

// JSON Database Path
const DB_PATH = path.join(__dirname, 'db.json');

// Predefined fallback interview questions for the database
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

// Initialize database file if it doesn't exist
function initDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData = {
      students: [],
      faculties: [
        { id: 1, name: "Dr. Darshankumar D. Billur", role: "Principal, KLECET Chikodi", image: "assets/principal.png" },
        { id: 2, name: "Dr. Sandeep K.", role: "Dean - Training & Placements", image: "assets/placement_head.png" },
        { id: 3, name: "Prof. Anita Patil", role: "Literary Club Coordinator", image: "assets/club_coord.png" }
      ],
      admin: {
        email: "admin@klecet.edu.in",
        password: "admin123"
      },
      announcements: [],
      aptitudeQuestions: [...APTITUDE_QUESTION_POOL],
      interviewQuestions: DEFAULT_INTERVIEW_QUESTIONS
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    console.log("Initialized new database file: db.json");
  }
}
initDatabase();

// Helper to read database
function readDatabase() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    
    let updated = false;
    if (!db.announcements) {
      db.announcements = [];
      updated = true;
    }
    if (!db.aptitudeQuestions || db.aptitudeQuestions.length === 0) {
      db.aptitudeQuestions = [...APTITUDE_QUESTION_POOL];
      updated = true;
    }
    if (!db.interviewQuestions || !db.interviewQuestions.hr || db.interviewQuestions.hr.length === 0) {
      db.interviewQuestions = DEFAULT_INTERVIEW_QUESTIONS;
      updated = true;
    }
    
    if (updated) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    }
    return db;
  } catch (err) {
    console.error("Error reading database, resetting.", err);
    return { 
      students: [], 
      faculties: [], 
      admin: { email: "admin@klecet.edu.in", password: "admin123" }, 
      announcements: [], 
      aptitudeQuestions: [...APTITUDE_QUESTION_POOL], 
      interviewQuestions: DEFAULT_INTERVIEW_QUESTIONS 
    };
  }
}

// Helper to write database
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database", err);
  }
}


// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Memory storage for active rooms
// roomCode -> { code, adminId, status, students: [{id, name, score, finished, timeTaken}], questions, duration, timeLeft }
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

// ==========================================================================
// REST API ROUTES (AUTHENTICATION & DATABASE CONTROL)
// ==========================================================================

// 1. Student Registration
app.post('/api/register', (req, res) => {
  const { name, usn, branch, email, password } = req.body;
  
  if (!name || !usn || !branch || !email || !password) {
    return res.status(400).json({ success: false, message: "Please fill out all registration fields." });
  }

  const db = readDatabase();
  
  // Check if USN already exists
  if (db.students.some(s => s.usn.toUpperCase() === usn.toUpperCase())) {
    return res.status(400).json({ success: false, message: "A student with this USN is already registered." });
  }

  // Check if Email already exists
  if (db.students.some(s => s.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ success: false, message: "A student with this Email is already registered." });
  }

  const newStudent = {
    name,
    usn: usn.toUpperCase(),
    branch,
    email: email.toLowerCase(),
    password, // Stored as plain text for simplicity in local demo deployment
    scores: [],
    roadmapProgress: {}
  };

  db.students.push(newStudent);
  writeDatabase(db);

  res.status(201).json({ 
    success: true, 
    user: { name: newStudent.name, usn: newStudent.usn, branch: newStudent.branch, email: newStudent.email, role: 'student' } 
  });
});

// 2. Student & Admin Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Please provide both email and password." });
  }

  const db = readDatabase();

  // Check if it matches Admin
  if (db.admin.email.toLowerCase() === email.toLowerCase() && db.admin.password === password) {
    return res.json({
      success: true,
      user: { email: db.admin.email, name: "System Admin", role: "admin" }
    });
  }

  // Check if it matches Student
  const student = db.students.find(s => s.email.toLowerCase() === email.toLowerCase() && s.password === password);
  if (student) {
    return res.json({
      success: true,
      user: { name: student.name, usn: student.usn, branch: student.branch, email: student.email, role: "student" }
    });
  }

  res.status(401).json({ success: false, message: "Invalid email or password." });
});

// 3. Public get faculties list
app.get('/api/faculties', (req, res) => {
  const db = readDatabase();
  res.json({ success: true, faculties: db.faculties });
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
app.get('/api/admin/students', adminVerify, (req, res) => {
  const db = readDatabase();
  // Return students list without passwords
  const cleanStudents = db.students.map(s => ({
    name: s.name,
    usn: s.usn,
    branch: s.branch,
    email: s.email,
    scores: s.scores
  }));
  res.json({ success: true, students: cleanStudents });
});

// 5. Add Faculty Member (Admin)
app.post('/api/admin/faculty/add', adminVerify, (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) {
    return res.status(400).json({ success: false, message: "Faculty name and role are required." });
  }

  const db = readDatabase();
  const newFaculty = {
    id: Date.now(),
    name,
    role,
    image: "assets/club_coord.png" // default generated fallback avatar
  };

  db.faculties.push(newFaculty);
  writeDatabase(db);

  res.json({ success: true, faculty: newFaculty });
});

// 6. Delete Faculty Member (Admin)
app.delete('/api/admin/faculty/remove/:id', adminVerify, (req, res) => {
  const id = parseInt(req.params.id);
  const db = readDatabase();

  const initialCount = db.faculties.length;
  db.faculties = db.faculties.filter(f => f.id !== id);

  if (db.faculties.length === initialCount) {
    return res.status(404).json({ success: false, message: "Faculty member not found." });
  }

  writeDatabase(db);
  res.json({ success: true, message: "Faculty member successfully removed." });
});

// 7. Get public announcements list
app.get('/api/announcements', (req, res) => {
  const db = readDatabase();
  const sortedAnnouncements = [...db.announcements].sort((a, b) => b.id - a.id);
  res.json({ success: true, announcements: sortedAnnouncements });
});

// 8. Create & Broadcast announcement (Admin)
app.post('/api/admin/announcements', adminVerify, (req, res) => {
  const { title, tag, message } = req.body;
  if (!title || !tag || !message) {
    return res.status(400).json({ success: false, message: "Announcement title, tag, and message are required." });
  }

  const db = readDatabase();

  const newAnn = {
    id: Date.now(),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    title,
    tag,
    message,
    emailedCount: db.students.length
  };

  db.announcements.push(newAnn);
  writeDatabase(db);

  // Simulate Email Dispatching to Console
  console.log(`\n============================================================`);
  console.log(`[SMTP EMAIL BROADCAST SYSTEM] Dispatching announcement...`);
  console.log(`Sender: KLECET Placement & Literary Wing <admin@klecet.edu.in>`);
  console.log(`Subject: [LitCrack Announcement] ${title}`);
  console.log(`Tag: [${tag}]`);
  console.log(`Message Body:\n------------------------------------------------------------\n${message}\n------------------------------------------------------------`);
  console.log(`Sending to ${db.students.length} registered students:`);
  db.students.forEach((s, idx) => {
    console.log(`  [${idx + 1}/${db.students.length}] Sent email to ${s.name} (${s.email})`);
  });
  console.log(`============================================================\n`);

  res.json({ success: true, announcement: newAnn });
});

// 9. Remove announcement (Admin)
app.delete('/api/admin/announcements/:id', adminVerify, (req, res) => {
  const id = parseInt(req.params.id);
  const db = readDatabase();

  const initialCount = db.announcements.length;
  db.announcements = db.announcements.filter(a => a.id !== id);

  if (db.announcements.length === initialCount) {
    return res.status(404).json({ success: false, message: "Announcement not found." });
  }

  writeDatabase(db);
  res.json({ success: true, message: "Announcement successfully deleted." });
});

// 10. Get all aptitude questions (Admin/Public)
app.get('/api/admin/questions/aptitude', adminVerify, (req, res) => {
  const db = readDatabase();
  res.json({ success: true, questions: db.aptitudeQuestions });
});

// 11. Add new aptitude question (Admin)
app.post('/api/admin/questions/aptitude', adminVerify, (req, res) => {
  const { question, options, answer, explanation } = req.body;
  if (!question || !options || options.length !== 4 || answer === undefined || !explanation) {
    return res.status(400).json({ success: false, message: "Provide question text, exactly 4 options, correct answer index, and an explanation." });
  }

  const db = readDatabase();
  const newQ = {
    id: Date.now(),
    question,
    options,
    answer: parseInt(answer),
    explanation
  };

  db.aptitudeQuestions.push(newQ);
  writeDatabase(db);
  res.json({ success: true, question: newQ });
});

// 12. Delete aptitude question (Admin)
app.delete('/api/admin/questions/aptitude/:id', adminVerify, (req, res) => {
  const id = parseInt(req.params.id);
  const db = readDatabase();

  const initialCount = db.aptitudeQuestions.length;
  db.aptitudeQuestions = db.aptitudeQuestions.filter(q => q.id !== id);

  if (db.aptitudeQuestions.length === initialCount) {
    return res.status(404).json({ success: false, message: "Question not found." });
  }

  writeDatabase(db);
  res.json({ success: true, message: "Aptitude question successfully removed." });
});

// 13. Get all interview questions (Public)
app.get('/api/questions/interview', (req, res) => {
  const db = readDatabase();
  res.json({ success: true, interviewQuestions: db.interviewQuestions });
});

// 14. Add new mock interview question (Admin)
app.post('/api/admin/questions/interview', adminVerify, (req, res) => {
  const { category, question, keywords, goodPhrasing } = req.body;
  if (!category || !question || !keywords || !goodPhrasing) {
    return res.status(400).json({ success: false, message: "Category (hr/technical), question text, keywords, and model phrasing are required." });
  }

  const db = readDatabase();
  if (!db.interviewQuestions[category]) {
    db.interviewQuestions[category] = [];
  }

  const kwArr = keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
  const newQ = {
    id: Date.now(),
    question,
    keywords: kwArr,
    goodPhrasing
  };

  db.interviewQuestions[category].push(newQ);
  writeDatabase(db);
  res.json({ success: true, question: newQ });
});

// 15. Delete mock interview question (Admin)
app.delete('/api/admin/questions/interview/:category/:id', adminVerify, (req, res) => {
  const { category, id } = req.params;
  const qId = parseInt(id);
  const db = readDatabase();

  if (!db.interviewQuestions[category]) {
    return res.status(404).json({ success: false, message: "Interview category not found." });
  }

  const initialCount = db.interviewQuestions[category].length;
  db.interviewQuestions[category] = db.interviewQuestions[category].filter(q => q.id !== qId);

  if (db.interviewQuestions[category].length === initialCount) {
    return res.status(404).json({ success: false, message: "Interview question not found." });
  }

  writeDatabase(db);
  res.json({ success: true, message: "Interview question successfully removed." });
});

// ==========================================================================
// SOCKET.IO REAL-TIME APTITUDE ACTIONS
// ==========================================================================

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('create_room', (data, callback) => {
    const roomCode = generateRoomCode();
    const duration = data.duration || 300;
    const roomType = data.roomType || 'aptitude';
    const interviewFocus = data.interviewFocus || 'hr';
    const db = readDatabase();

    let selectedQuestions = [];
    if (roomType === 'interview') {
      selectedQuestions = db.interviewQuestions[interviewFocus] || [];
    } else {
      selectedQuestions = db.aptitudeQuestions || [];
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

  socket.on('submit_answers', (data, callback) => {
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

    // Save score directly to user database profile if logged in
    if (email) {
      const db = readDatabase();
      const dbStudent = db.students.find(s => s.email.toLowerCase() === email.toLowerCase());
      if (dbStudent) {
        if (!dbStudent.scores) dbStudent.scores = [];
        dbStudent.scores.push({
          score,
          correctCount,
          totalQuestions: room.questions.length,
          timeTaken,
          date: new Date().toLocaleDateString(),
          type: room.roomType === 'interview' ? 'interview' : 'aptitude'
        });
        writeDatabase(db);
        console.log(`Saved ${room.roomType} score ${score}% in database for ${dbStudent.name}`);
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
