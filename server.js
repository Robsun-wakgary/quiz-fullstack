// server.js
// Full-stack version: serves the frontend files AND the API,
// and now saves quiz results into a real database file (quiz.db).

const express = require("express");
const path = require("path");
const { Database } = require("node-sqlite3-wasm");

const app = express();
const PORT = 3000;

app.use(express.json());

// -----------------------------------------------------------
// SERVE THE FRONTEND
// Any file inside the "public" folder (index.html, script.js,
// style.css) gets sent to the browser automatically.
// -----------------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------------------------------------
// DATABASE SETUP
// This creates (or opens, if it already exists) a file called
// quiz.db sitting right next to server.js. Unlike the `devices`
// or `questions` arrays we used before, this data survives even
// after the server restarts, because it's saved to disk.
// -----------------------------------------------------------
const db = new Database(path.join(__dirname, "quiz.db"));

// Run once: make sure the "results" table exists.
// Think of a table like a spreadsheet: each row is one quiz attempt.
db.run(`
  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    played_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const questions = [
  { id: 1, question: "Which keyword declares a variable that can be reassigned?",
    answers: ["const", "let", "static", "final"], correctIndex: 1 },
  { id: 2, question: "What does '===' check that '==' does not?",
    answers: ["Nothing, they're the same", "Type AND value", "Only value", "Only type"], correctIndex: 1 },
  { id: 3, question: "Which method adds an item to the end of an array?",
    answers: ["push()", "pop()", "shift()", "unshift()"], correctIndex: 0 },
    { id: 4, question: "Which symbol is used for a single-line comment in JavaScript?",
    answers: ["#", "//", "<!--", "**"], correctIndex: 1 },
];

// GET /api/questions — same as before, no correctIndex sent
app.get("/api/questions", (req, res) => {
  const safeQuestions = questions.map(({ id, question, answers }) => ({ id, question, answers }));
  res.json(safeQuestions);
});

// POST /api/check-answer — same as before
app.post("/api/check-answer", (req, res) => {
  const { questionId, selectedIndex } = req.body;
  const question = questions.find((q) => q.id === questionId);
  if (!question) return res.status(404).json({ error: "Question not found" });
  const correct = selectedIndex === question.correctIndex;
  res.json({ correct, correctIndex: question.correctIndex });
});

// -----------------------------------------------------------
// POST /api/submit-score
// Browser sends { playerName, score, total } once the quiz ends.
// We INSERT a new row into the "results" table — permanently saved.
// -----------------------------------------------------------
app.post("/api/submit-score", (req, res) => {
  const { playerName, score, total } = req.body;

  if (!playerName || typeof score !== "number" || typeof total !== "number") {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  const result = db.run(
    "INSERT INTO results (player_name, score, total) VALUES (?, ?, ?)",
    [playerName, score, total]
  );

  res.json({ success: true, id: result.lastInsertRowid });
});

// -----------------------------------------------------------
// GET /api/leaderboard
// Reads the 10 best results back OUT of the database, best first.
// -----------------------------------------------------------
app.get("/api/leaderboard", (req, res) => {
  const rows = db.all(
    "SELECT player_name, score, total, played_at FROM results ORDER BY score DESC, played_at DESC LIMIT 10"
  );
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`Quiz full-stack app running at http://localhost:${PORT}`);
});
