/* ========= Configuration ========= */
const HEIGHT = 7;             // Number of rows (guesses allowed) = 6
const WIDTH = 7;              // Equation format: NUM OP NUM OP NUM (7 tokens)
const targets = [10, 20, 40, 50, 60, 80, 100, 150, 200];  // Possible target values to hit
const numberPool = [1, 2, 3, 4, 5, 10, 12, 15, 20, 25, 35, 60, 80, 100, 200]; // Available numbers to choose from
const operators = ["+", "-", "*", "/", "**", "%"]; // Allowed operators

/* ========= State ========= */
let row = 0;                  // Current attempt row
let currentTokens = [];       // Stores the tokens (numbers/operators) typed for the current row
let gameOver = false;         // Whether the game has ended
let secretTokens = [];        // Secret correct equation (array of tokens)
let TARGET;                   // The target number (secret result)

/* ========= Init ========= */
window.onload = function () { // Run this when the page loads
  chooseSecretEquation();     // Pick a random target + secret equation
  document.getElementById("target").innerText = `🎯 Target: ${TARGET}`; // Show target to player
  document.getElementById("choices").innerText =
    "Equation pattern: NUM OP NUM OP NUM OP NUM"; // Show hint

  buildBoard();               // Build the game board
  buildKeypad();              // Build the keypad (buttons)
};

function buildBoard() {
  const board = document.getElementById("board"); // Get board container
  board.style.setProperty("--cols", WIDTH.toString()); // Set CSS columns
  board.innerHTML = "";       // Clear board first

  // Create rows × columns tiles
  for (let r = 0; r < HEIGHT; r++) {
    for (let c = 0; c < WIDTH; c++) {
      const tile = document.createElement("div"); // Each square tile
      tile.id = `${r}-${c}`;                      // Unique id row-col
      tile.className = "tile";                    // Style as tile
      tile.innerText = "";                        // Empty initially
      board.appendChild(tile);                    // Add to board
    }
  }

  // Listen to keyboard events
  document.addEventListener("keydown", (e) => {
    if (gameOver) return;       // Ignore if game ended
    if (e.key === "Enter") {    // If Enter pressed
      e.preventDefault();
      submitGuess();            // Submit guess
    } else if (e.key === "Backspace") { // If Backspace pressed
      e.preventDefault();
      backspaceToken();         // Remove last token
    }
  });
}

function buildKeypad() {
  const numWrap = document.getElementById("numberChoices"); // Numbers container
  const opWrap = document.getElementById("operatorChoices"); // Operators container

  numWrap.innerHTML = "";       // Clear numbers
  numberPool.forEach((n) => {   // Create button for each number
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerText = String(n);
    btn.addEventListener("click", () => addNumber(String(n))); // On click add number
    numWrap.appendChild(btn);
  });

  opWrap.innerHTML = "";        // Clear operators
  operators.forEach((op) => {   // Create button for each operator
    const btn = document.createElement("button");
    btn.className = "op-btn";
    btn.innerText = op;
    btn.addEventListener("click", () => addOperator(op)); // On click add operator
    opWrap.appendChild(btn);
  });

  // Extra buttons: backspace, clear, submit
  document.getElementById("backspaceBtn").addEventListener("click", backspaceToken);
  document.getElementById("clearBtn").addEventListener("click", clearRow);
  document.getElementById("submitBtn").addEventListener("click", submitGuess);
}

/* ========= Secret selection ========= */
function chooseSecretEquation() {
  TARGET = targets[Math.floor(Math.random() * targets.length)]; // Pick random target
  const maxTries = 50000; // Limit attempts so browser won’t freeze
  let found = false;

  for (let i = 0; i < maxTries; i++) {
    // Pick 4 numbers
    const a = numberPool[Math.floor(Math.random() * numberPool.length)];
    const b = numberPool[Math.floor(Math.random() * numberPool.length)];
    const c = numberPool[Math.floor(Math.random() * numberPool.length)];
    const d = numberPool[Math.floor(Math.random() * numberPool.length)];

    // Pick 3 operators
    const op1 = operators[Math.floor(Math.random() * operators.length)];
    const op2 = operators[Math.floor(Math.random() * operators.length)];
    const op3 = operators[Math.floor(Math.random() * operators.length)];

    // Build expression (7 tokens = NUM OP NUM OP NUM OP NUM)
    const expr = `${a}${op1}${b}${op2}${c}${op3}${d}`;

    try {
      const val = eval(expr);
      if (isFinite(val) && Math.abs(val - TARGET) < 1e-9) {
        secretTokens = [String(a), op1, String(b), op2, String(c), op3, String(d)];
        found = true;
        break;
      }
    } catch (e) {
      continue; // ignore invalid
    }
  }

  if (!found) {
    // Fallback (exactly 7 tokens)
    secretTokens = ["10", "+", "20", "-", "5", "*", "1"];
  }

  console.log(`Secret for ${TARGET}:`, secretTokens.join(" ")); // Debug
}


/* ========= Input handlers ========= */
function addNumber(numStr) {
  if (gameOver) return;                // Stop if game ended
  if (currentTokens.length >= WIDTH) return; // Max tokens reached

  if (currentTokens.length === 0) {
    // First token must be number (okay)
  } else {
    const last = currentTokens[currentTokens.length - 1];
    if (!isOperator(last)) return;     // Prevent two numbers in a row
  }

  currentTokens.push(numStr);          // Add number token
  renderCurrentRow();                  // Update board
}

function addOperator(op) {
  if (gameOver) return;                // Stop if game ended
  if (currentTokens.length >= WIDTH) return; // Max tokens reached
  if (currentTokens.length === 0) return;    // Cannot start with operator
  const last = currentTokens[currentTokens.length - 1];
  if (isOperator(last)) return;        // Prevent two operators in a row

  currentTokens.push(op);              // Add operator token
  renderCurrentRow();                  // Update board
}

function backspaceToken() {
  if (gameOver) return;                // Stop if game ended
  if (currentTokens.length === 0) return; // Nothing to remove
  currentTokens.pop();                 // Remove last token
  renderCurrentRow();                  // Update board
}

function clearRow() {
  if (gameOver) return;                // Stop if game ended
  currentTokens = [];                  // Clear tokens
  renderCurrentRow();                  // Update board
}

/* ========= Rendering ========= */
function renderCurrentRow() {
  for (let c = 0; c < WIDTH; c++) {
    const tile = document.getElementById(`${row}-${c}`); // Tile at current row+col
    tile.className = "tile";          // Reset tile style
    tile.innerText = currentTokens[c] ?? ""; // Show token if exists
  }
}

/* ========= Validation & Submit ========= */
function isOperator(tok) {
  return operators.includes(tok);     // Check if token is operator
}

function isValidPattern(tokens) {
  if (tokens.length !== WIDTH) return false; // Must be 5 tokens
  for (let i = 0; i < WIDTH; i++) {
    if (i % 2 === 0) { // Even positions = numbers
      if (isOperator(tokens[i])) return false;
    } else { // Odd positions = operators
      if (!isOperator(tokens[i])) return false;
    }
  }
  return true;
}

function submitGuess() {
  if (gameOver) return;               // Stop if game ended
  if (!isValidPattern(currentTokens)) { // Check correct pattern
    document.getElementById("answer").innerText =
      `⚠️ Must follow NUM OP NUM OP NUM`; // Warning
    return;
  }

  // Feedback array (Wordle style)
  const feedback = Array(WIDTH).fill("absent");
  const secretCopy = secretTokens.slice(); // Copy of secret tokens

  // First pass: mark exact matches (correct position & value)
  for (let i = 0; i < WIDTH; i++) {
    if (currentTokens[i] === secretCopy[i]) {
      feedback[i] = "correct";
      secretCopy[i] = null; // Remove from copy
    }
  }

  // Second pass: mark present (wrong position but exists)
  for (let i = 0; i < WIDTH; i++) {
    if (feedback[i] === "correct") continue;
    const idx = secretCopy.indexOf(currentTokens[i]);
    if (idx !== -1) {
      feedback[i] = "present";
      secretCopy[idx] = null;
    }
  }

  // Update tiles with feedback colors
  for (let c = 0; c < WIDTH; c++) {
    const tile = document.getElementById(`${row}-${c}`);
    tile.classList.remove("correct", "present", "absent");
    tile.classList.add(feedback[c]);
  }

  const expr = currentTokens.join(""); // Build full expression string
  const allCorrect = feedback.every(x => x === "correct"); // Check win condition
  if (allCorrect) {
    document.getElementById("answer").innerText =
      `🎉 Correct! ${expr} = ${TARGET}`; // Success message
    gameOver = true;
    disableKeypad(); // Stop input
    return;
  } else {
    let numericResult;
    try {
      numericResult = eval(expr); // Evaluate guess
    } catch (e) {
      numericResult = "invalid"; // If error
    }
    document.getElementById("answer").innerText =
      `❌ ${expr} = ${numericResult} — not the secret`; // Wrong message
  }

  row++;                         // Move to next row
  currentTokens = [];            // Reset tokens
  if (row >= HEIGHT) {           // Out of rows -> lose
    gameOver = true;
    document.getElementById("answer").innerText +=
      ` | Game Over! Secret was: ${secretTokens.join("")} = ${TARGET}`;
    disableKeypad();
  }
}

function disableKeypad() {
  // Disable all buttons
  document.querySelectorAll(".choice-btn, .op-btn, .action-btn").forEach(b => {
    b.disabled = true;
  });
}
