/* ===========================================================
   EQUATIO GAME SCRIPT
   -----------------------------------------------------------
   A math-puzzle game inspired by Wordle. Players must build
   an equation with numbers and operators that either evaluates
   correctly (easy mode) OR equals a fixed target (medium/hard).
   Feedback is provided on guesses (correct/present/absent).
   =========================================================== */

/* ========= Settings ========= */
const ROWS = 7; // Maximum attempts (number of rows in the board)
const COLS = 9; // 7 slots for tokens + "=" + result column

// Possible target values the equation should evaluate to
const targets = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100, 150, 175, 200, 250, 400, 625, 1000, 100000];

// Numbers available in easy mode
const easyNumbers = [1,2,3,4,5,6,7,8,9,10,15,20,25,30,40,50,60,75,100,150,200,250,400];

// Hard mode expands easy numbers with fractions & negatives
const hardNumbers = [
  ...easyNumbers,
  1000, "(1/2)", "(1/3)","(1/4)", "(1/5)",
  0, "(-1)", "(-2)", "(-5)", "(-10)"
];

// Operators per difficulty
const easyOps = ["+","-","*","/"];
const hardOps = ["+","-","*","/","%","**"];

/* ========= Score Store (localStorage) =========
   Handles persistence of scores between sessions.
   Keeps track of highscore, win count, total tries,
   and autosave preference.
-------------------------------------------------*/
const ScoreStore = (() => {
  const KEY = "equatio_scores_v1";
  const AUTO_KEY = "equatio_auto_save_v1";
  let data = { highscore: 0, wins: 0, tries: 0 };
  let auto = false;

  /** Load scores from localStorage */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = JSON.parse(raw);
      auto = localStorage.getItem(AUTO_KEY) === "1";
    } catch {}
    return data;
  }

  /** Save scores to localStorage */
  function save() {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  /** Enable or disable autosave */
  function setAuto(flag) {
    auto = !!flag;
    localStorage.setItem(AUTO_KEY, auto ? "1" : "0");
  }

  /** Export current scores as a downloadable text file */
  function exportToText() {
    const txt =
`highscore=${data.highscore}
wins=${data.wins}
tries=${data.tries}
`;
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scores.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Reset scores */
  function reset() {
    data = { highscore: 0, wins: 0, tries: 0 };
    save();
  }

  return { data, load, save, exportToText, reset, setAuto, get auto() { return auto; } };
})();

/* ========= Game State =========
   These variables represent the current round state.
-------------------------------------------------*/
let numbers = [];          // available numbers this round
let ops = [];              // available operators this round
let restrictToTarget = false; // medium/hard require strict equality
let currentRow = 0;        // current attempt row
let guess = [];            // active tokens in current guess
let secret = [];           // secret equation (solution)
let TARGET;                // target result
let finished = false;      // whether game is over
let currentMode = "easy";  // "easy" | "medium" | "hard"
let scores = ScoreStore.load(); // load persisted scores

/* ========= Init ========= */
window.onload = function () {
  ensureMediumCard(); // make sure "Medium" difficulty exists

  // Wire difficulty buttons
  document.getElementById("easyBtn").onclick   = () => startGame("easy");
  document.getElementById("mediumBtn").onclick = () => startGame("medium");
  document.getElementById("hardBtn").onclick   = () => startGame("hard");

  // Wire score controls
  const saveBtn = document.getElementById("saveScoresBtn");
  const resetBtn = document.getElementById("resetScoresBtn");
  const autoSave = document.getElementById("autoSave");
  if (saveBtn) saveBtn.onclick = () => ScoreStore.exportToText();
  if (resetBtn) resetBtn.onclick = () => { ScoreStore.reset(); scores = ScoreStore.load(); updateStats(); };
  if (autoSave) { autoSave.checked = ScoreStore.auto; autoSave.onchange = (e) => ScoreStore.setAuto(e.target.checked); }

  // Default game start
  startGame("easy");
  updateStats();
};

/**
 * Ensure a "Medium" difficulty card exists in UI.
 * Dynamically inserts if HTML doesn’t provide it.
 */
function ensureMediumCard() {
  const container = document.getElementById("difficultyContainer");
  if (!container) return;

  if (document.getElementById("mediumBtn")) return; // already present

  const cards = [...container.querySelectorAll(".difficulty-card")];
  const hardCard = cards.find(card => card.querySelector("#hardBtn"));

  const mediumCard = document.createElement("div");
  mediumCard.className = "difficulty-card";

  const mediumBtn = document.createElement("button");
  mediumBtn.id = "mediumBtn";
  mediumBtn.className = "difficulty-btn";
  mediumBtn.textContent = "Medium";

  const p = document.createElement("p");
  p.className = "desc";
  p.textContent = "This difficulty has 4 basic operators, restricted results (the equation must always equal the target), and a simple set of numbers.";

  mediumCard.appendChild(mediumBtn);
  mediumCard.appendChild(p);

  if (hardCard) container.insertBefore(mediumCard, hardCard);
  else container.appendChild(mediumCard);

  mediumBtn.onclick = () => startGame("medium");
}

/* ========= Start =========
   Initializes a game round for given difficulty.
-------------------------------------------------*/
function startGame(mode) {
  finished = false;
  currentRow = 0;
  guess = [];
  currentMode = mode;
  document.getElementById("answer").innerText = "";
  document.getElementById("board").innerHTML = "";

  const keypad = document.getElementById("keypad");

  if (mode === "easy") {
    numbers = easyNumbers.slice();
    ops = easyOps.slice();
    restrictToTarget = false;
    keypad.classList.remove("hard");
    updateDifficultyIndicator("Easy", "easy");
  } else if (mode === "medium") {
    numbers = easyNumbers.slice();
    ops = easyOps.slice();
    restrictToTarget = true;
    keypad.classList.remove("hard");
    updateDifficultyIndicator("Medium", "medium");
  } else {
    numbers = hardNumbers.slice();
    ops = hardOps.slice();
    restrictToTarget = true;
    keypad.classList.add("hard");
    updateDifficultyIndicator("Hard", "hard");
  }

  TARGET = targets[Math.floor(Math.random() * targets.length)];
  pickSecret(); // generate secret solution

  document.getElementById("target").innerText = "Target: " + TARGET;
  document.getElementById("choices").innerText = "Pattern: NUM OP NUM OP NUM OP NUM = RESULT";

  buildBoard();
  buildKeypad();
  render();
}

/* ========= Mini Indicator ========= */
function updateDifficultyIndicator(text, cssClass) {
  const indicator = document.getElementById("difficultyIndicator");
  indicator.innerText = "Mode: " + text;
  indicator.className = "";
  indicator.id = "difficultyIndicator"; 
  indicator.classList.add(cssClass);
}

/* ========= Secret =========
   Generates the secret solution expression that
   evaluates exactly to TARGET.
-------------------------------------------------*/
function pickSecret() {
  const tries = 60000;

  for (let i = 0; i < tries; i++) {
    const nums = [ randFrom(numbers), randFrom(numbers), randFrom(numbers), randFrom(numbers) ];
    const opsPicked = [ randFrom(ops), randFrom(ops), randFrom(ops) ];
    const expr = `${nums[0]}${opsPicked[0]}${nums[1]}${opsPicked[1]}${nums[2]}${opsPicked[2]}${nums[3]}`;

    try {
      const v = eval(expr);
      if (Number.isFinite(v) && v === TARGET) {
        secret = [ String(nums[0]), opsPicked[0], String(nums[1]), opsPicked[1], String(nums[2]), opsPicked[2], String(nums[3]) ];
        return;
      }
    } catch {}
  }

  // fallback guaranteed to equal TARGET
  secret = [String(TARGET), "+", "1", "-", "1", "*", "1"];
}

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ========= Board =========
   Constructs the grid of tiles (ROWS x COLS).
-------------------------------------------------*/
function buildBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = document.createElement("div");
      tile.id = `${r}-${c}`;
      tile.className = "tile";

      if (c === 7) { tile.innerText = "="; tile.classList.add("red-tile"); }
      if (c === 8) { tile.classList.add("red-tile", "result-tile"); }

      board.appendChild(tile);
    }
  }

  // Keyboard bindings
  document.onkeydown = (e) => {
    if (finished) return;
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    if (e.key === "Backspace") { e.preventDefault(); backspace(); }
  };
}

/* ========= Keypad =========
   Creates number/operator/action buttons dynamically.
-------------------------------------------------*/
function buildKeypad() {
  const numWrap = document.getElementById("numberChoices");
  const opWrap = document.getElementById("operatorChoices");

  numWrap.innerHTML = "";
  opWrap.innerHTML = "";

  numbers.forEach(n => numWrap.appendChild(makeBtn("choice-btn", n, () => add(n))));
  ops.forEach(o => opWrap.appendChild(makeBtn("op-btn", o, () => add(o))));

  document.getElementById("backspaceBtn").onclick = backspace;
  document.getElementById("clearBtn").onclick = clearRow;
  document.getElementById("submitBtn").onclick = submit;

  document.querySelectorAll("#keypad button").forEach(b => b.disabled = false);
}

function makeBtn(cls, text, fn) {
  const btn = document.createElement("button");
  btn.className = cls;
  btn.innerText = text;
  btn.onclick = fn;
  return btn;
}

/* ========= Input ========= */
function isOp(t) { return ["+","-","*","/","%","**"].includes(t); }

function add(token) {
  if (finished) return;
  if (guess.length >= 7) return; // limit 7 slots
  if (guess.length === 0 && isOp(token)) return; // cannot start with operator
  if (isOp(token) && isOp(guess[guess.length - 1])) return; // no two operators in a row
  if (!isOp(token) && guess.length > 0 && !isOp(guess[guess.length - 1])) return; // no two numbers in a row
  guess.push(String(token));
  render();
}

function backspace() {
  if (!finished && guess.length > 0) {
    guess.pop();
    render();
  }
}

function clearRow() {
  if (!finished) {
    guess = [];
    render();
  }
}

/* ========= Render =========
   Updates tiles with current guess + live eval result.
-------------------------------------------------*/
function render() {
  for (let c = 0; c < COLS; c++) {
    const tile = document.getElementById(`${currentRow}-${c}`);
    if (!tile) continue;

    if (c < 7) {
      tile.innerText = guess[c] || "";
    } else if (c === 7) {
      tile.innerText = "=";
    } else if (c === 8) {
      const expr = guess.slice(0, 7).join("");
      try { tile.innerText = expr ? eval(expr) : ""; }
      catch { tile.innerText = ""; }
    }
  }
}

/* ========= Guess Validate & Submit =========
   Submits a guess, validates against secret,
   applies feedback, handles scoring and end states.
-------------------------------------------------*/
function validGuess(tokens) {
  if (tokens.length !== 7) return false;
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) { if (isOp(tokens[i])) return false; }
    else { if (!isOp(tokens[i])) return false; }
  }
  return true;
}

function basePointsForMode() {
  if (currentMode === "hard")   return 50;
  if (currentMode === "medium") return 25;
  return 10; // easy
}

function submit() {
  if (finished) return;

  if (!validGuess(guess)) {
    showMsg("⚠️ Follow pattern NUM OP NUM OP NUM OP NUM");
    return;
  }

  const expr = guess.join("");
  let val;
  try { val = eval(expr); } catch { val = "invalid"; }

  if (restrictToTarget && val !== TARGET) {
    showMsg(`⚠️ This mode requires your equation to equal ${TARGET}. You got ${val}.`);
    return;
  }

  // Feedback (Wordle style)
  const feedback = Array(7).fill("absent");
  const secretCopy = secret.slice();

  // Step 1: Mark exact matches
  for (let i = 0; i < 7; i++) {
    if (guess[i] === secretCopy[i]) {
      feedback[i] = "correct";
      secretCopy[i] = null;
    }
  }
  // Step 2: Mark present (misplaced) tokens
  for (let i = 0; i < 7; i++) {
    if (feedback[i] !== "correct") {
      const idx = secretCopy.indexOf(guess[i]);
      if (idx !== -1) {
        feedback[i] = "present";
        secretCopy[idx] = null;
      }
    }
  }

  // Animate + apply styles
  for (let c = 0; c < 7; c++) {
    const tile = document.getElementById(`${currentRow}-${c}`);
    const state = feedback[c];
    const token = guess[c];
    tile.classList.remove("correct","present","absent");
    tile.classList.add("flip");
    const delay = 120 * c;
    setTimeout(() => {
      tile.classList.remove("flip");
      tile.classList.add(state);
      updateKeypad(token, state);
    }, 200 + delay);
  }

  const allCorrect = feedback.every(s => s === "correct");

  if (allCorrect) {
    const base = basePointsForMode();
    const multiplier = ROWS - currentRow;
    const earned = base * multiplier;

    scores.tries++;
    scores.wins++;
    if (earned > scores.highscore) scores.highscore = earned;
    ScoreStore.save();
    updateStats();

    showMsg(`🎉 Correct! ${expr} = ${TARGET} | +${earned} points`);
    finished = true;
    document.querySelectorAll("#keypad button").forEach(b => b.disabled = true);

    if (ScoreStore.auto) ScoreStore.exportToText();
    return;
  }

  // If not correct, provide feedback
  if (!restrictToTarget) {
    showMsg(`✅ ${expr} = ${val}`);
  } else {
    showMsg(`❌ ${expr} = ${val} — keep trying for ${TARGET}`);
  }

  nextRow();
}

/** Update keypad button colors based on token feedback */
function updateKeypad(token, state) {
  const buttons = document.querySelectorAll("#keypad button");
  buttons.forEach(btn => {
    if (btn.innerText === token) {
      if (state === "correct") {
        btn.classList.remove("present", "absent");
        btn.classList.add("correct");
      } else if (state === "present" && !btn.classList.contains("correct")) {
        btn.classList.remove("absent");
        btn.classList.add("present");
      } else if (state === "absent" && !btn.classList.contains("correct") && !btn.classList.contains("present")) {
        btn.classList.add("absent");
      }
    }
  });
}

/** Advance to next row, handle loss state */
function nextRow() {
  currentRow++;
  guess = [];
  if (currentRow >= ROWS) {
    showMsg(`Game Over! Secret was: ${secret.join("    ")} = ${TARGET}`);
    finished = true;
    document.querySelectorAll("#keypad button").forEach(b => b.disabled = true);

    scores.tries++;
    ScoreStore.save();
    updateStats();
    if (ScoreStore.auto) ScoreStore.exportToText();
  } else {
    render();
  }
}

/** Show status messages below board */
function showMsg(msg) {
  document.getElementById("answer").innerText = msg;
}

/** Refresh stats panel in UI */
function updateStats() {
  const s = scores;
  document.getElementById("highscore").innerText = s.highscore;
  document.getElementById("wins").innerText = s.wins;
  document.getElementById("tries").innerText = s.tries;
}
