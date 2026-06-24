// script.js (FRONTEND — runs in the browser)
// This file no longer contains questions or correctIndex at all.
// Instead, it ASKS the server for everything using fetch().

const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const nameInput = document.getElementById("name-input");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const questionText = document.getElementById("question-text");
const answerButtonsEl = document.getElementById("answer-buttons");
const scoreText = document.getElementById("score-text");
const leaderboardEl = document.getElementById("leaderboard");

let questions = [];        // will be FILLED BY fetch(), not hard-coded
let currentQuestionIndex = 0;
let score = 0;
let playerName = "";

function showScreen(screen) {
  [startScreen, quizScreen, resultScreen].forEach((s) => s.classList.remove("active"));
  screen.classList.add("active");
}

// -----------------------------------------------------------
// Load the leaderboard the moment the page opens.
// GET /api/leaderboard -> array of past results from quiz.db
// -----------------------------------------------------------
async function loadLeaderboard() {
  const res = await fetch("/api/leaderboard");
  const rows = await res.json();

  leaderboardEl.innerHTML = "";
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.textContent = `${row.player_name}: ${row.score}/${row.total}`;
    leaderboardEl.appendChild(li);
  });
}
loadLeaderboard();

// -----------------------------------------------------------
// Start button: fetch the questions from the server, THEN begin.
// -----------------------------------------------------------
startBtn.addEventListener("click", async () => {
  playerName = nameInput.value.trim() || "Anonymous";

  const res = await fetch("/api/questions");   // ask the server for questions
  questions = await res.json();                // wait for + parse the response

  currentQuestionIndex = 0;
  score = 0;
  showScreen(quizScreen);
  showQuestion();
});

function showQuestion() {
  const current = questions[currentQuestionIndex];
  questionText.textContent = current.question;
  answerButtonsEl.innerHTML = "";

  current.answers.forEach((answer, index) => {
    const btn = document.createElement("button");
    btn.textContent = answer;
    btn.addEventListener("click", () => selectAnswer(index, btn));
    answerButtonsEl.appendChild(btn);
  });
}

// -----------------------------------------------------------
// selectAnswer is now ASYNC — it has to ask the server
// "was this right?" instead of checking locally, because
// the browser was never told the correct answer.
// -----------------------------------------------------------
async function selectAnswer(selectedIndex, clickedBtn) {
  const buttons = Array.from(answerButtonsEl.children);
  buttons.forEach((btn) => (btn.disabled = true));

  const current = questions[currentQuestionIndex];

  const res = await fetch("/api/check-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionId: current.id,
      selectedIndex: selectedIndex,
    }),
  });
  const result = await res.json();   // { correct: true/false, correctIndex: N }

  buttons[result.correctIndex].classList.add("correct");
  if (result.correct) {
    score++;
  } else {
    clickedBtn.classList.add("wrong");
  }

  setTimeout(async () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      await showResult();
    }
  }, 800);
}

// -----------------------------------------------------------
// Quiz finished: tell the server to SAVE this result,
// then refresh the leaderboard so it shows up.
// -----------------------------------------------------------
async function showResult() {
  showScreen(resultScreen);
  scoreText.textContent = `${playerName}, you scored ${score} / ${questions.length}`;

  await fetch("/api/submit-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerName: playerName,
      score: score,
      total: questions.length,
    }),
  });

  await loadLeaderboard();   // reload so the new score appears immediately
}

restartBtn.addEventListener("click", () => {
  showScreen(startScreen);
});
