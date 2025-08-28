/* ========= Settings ========= */
const ROWS = 7; // attempts
const COLS = 9; // 7 tokens + "=" + result

const targets = [10,20,40,50,60,80,100,150,200,250];

const easyNumbers = [1,2,3,4,5,8,10,15,20,25,30,40,50,60,75,100,150,200,250];

const hardNumbers = [
  ...easyNumbers,
  "1/2","1/3","1/4","1/5","1/10","1/20",
  0, -1, -2, -5, -10, -20
];

const easyOps = ["+","-","*","/"];
const hardOps = ["+","-","*","/","%","**"];

/* ========= Game State ========= */
let numbers = [];
let ops = [];
let restrictToTarget = false;

let currentRow = 0;
let guess = [];
let secret = [];
let TARGET;
let finished = false;

/* ========= Start ========= */
window.onload = function() {
  document.getElementById("easyBtn").onclick = () => startGame("easy");
  document.getElementById("hardBtn").onclick = () => startGame("hard");
  // default: Easy
  startGame("easy");
};

function startGame(mode) {
  finished = false;
  currentRow = 0;
  guess = [];
  document.getElementById("answer").innerText = "";
  document.getElementById("board").innerHTML = "";

  if (mode === "easy") {
    numbers = easyNumbers.slice();
    ops = easyOps.slice();
    restrictToTarget = false;
    document.getElementById("keypad").classList.remove("hard");
  } else {
    numbers = hardNumbers.slice();
    ops = hardOps.slice();
    restrictToTarget = true;
    document.getElementById("keypad").classList.add("hard");
  }

  // pick a target and a valid secret expression that equals it
  TARGET = targets[Math.floor(Math.random() * targets.length)];
  pickSecret(); // fills `secret` for feedback / solution

  document.getElementById("target").innerText = "Target: " + TARGET;
  document.getElementById("choices").innerText = "Pattern: NUM OP NUM OP NUM OP NUM = RESULT";

  buildBoard();
  buildKeypad();
}

/* ========= Secret ========= */
function pickSecret() {
  // Try to randomly discover a valid expression from current numbers/ops
  const tries = 60000;

  for (let i = 0; i < tries; i++) {
    const nums = [
      randFrom(numbers),
      randFrom(numbers),
      randFrom(numbers),
      randFrom(numbers)
    ];

    const opsPicked = [
      randFrom(ops),
      randFrom(ops),
      randFrom(ops)
    ];

    // Avoid super huge exponent cases: small guard (optional)
    const expr = `${nums[0]}${opsPicked[0]}${nums[1]}${opsPicked[1]}${nums[2]}${opsPicked[2]}${nums[3]}`;

    try {
      const v = eval(expr);
      if (Number.isFinite(v) && v === TARGET) {
        secret = [
          String(nums[0]), opsPicked[0],
          String(nums[1]), opsPicked[1],
          String(nums[2]), opsPicked[2],
          String(nums[3])
        ];
        return;
      }
    } catch {}
  }

  // Robust fallback that always equals TARGET (uses only +,-,* and numbers we have)
  // TARGET (in both modes) is guaranteed to be present in easyNumbers
  secret = [String(TARGET), "+", "1", "-", "1", "*", "1"];
}

function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ========= Board ========= */
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

  // minimal key listeners
  document.onkeydown = (e) => {
    if (finished) return;
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    if (e.key === "Backspace") { e.preventDefault(); backspace(); }
  };
}

/* ========= Keypad ========= */
function buildKeypad() {
  const numWrap = document.getElementById("numberChoices");
  const opWrap = document.getElementById("operatorChoices");

  numWrap.innerHTML = "";
  opWrap.innerHTML = "";

  numbers.forEach(n => {
    const btn = makeBtn("choice-btn", n, () => add(n));
    numWrap.appendChild(btn);
  });

  ops.forEach(o => {
    const btn = makeBtn("op-btn", o, () => add(o));
    opWrap.appendChild(btn);
  });

  document.getElementById("backspaceBtn").onclick = backspace;
  document.getElementById("clearBtn").onclick = clearRow;
  document.getElementById("submitBtn").onclick = submit;

  // re-enable keypad in case a previous game ended
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
  if (guess.length >= 7) return; // only 7 slots pre "="
  if (guess.length === 0 && isOp(token)) return; // can't start with op
  if (isOp(token) && isOp(guess[guess.length - 1])) return; // no two ops
  if (!isOp(token) && guess.length > 0 && !isOp(guess[guess.length - 1])) return; // no two nums

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

/* ========= Render ========= */
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
      try {
        tile.innerText = expr ? eval(expr) : "";
      } catch {
        tile.innerText = "";
      }
    }
  }
}

/* ========= Guess Validate & Submit ========= */
function validGuess(tokens) {
  if (tokens.length !== 7) return false;
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) { if (isOp(tokens[i])) return false; }
    else { if (!isOp(tokens[i])) return false; }
  }
  return true;
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
    showMsg(`⚠️ Hard Mode: your equation must equal ${TARGET}. You got ${val}.`);
    return;
  }

  // Compute Wordle-style feedback against the secret
  const feedback = Array(7).fill("absent");
  const secretCopy = secret.slice();

  // correct positions
  for (let i = 0; i < 7; i++) {
    if (guess[i] === secretCopy[i]) {
      feedback[i] = "correct";
      secretCopy[i] = null;
    }
  }
  // present elsewhere
  for (let i = 0; i < 7; i++) {
    if (feedback[i] !== "correct") {
      const idx = secretCopy.indexOf(guess[i]);
      if (idx !== -1) {
        feedback[i] = "present";
        secretCopy[idx] = null;
      }
    }
  }

  // Animate + color tiles & keypad
  for (let c = 0; c < 7; c++) {
    const tile = document.getElementById(`${currentRow}-${c}`);
    const state = feedback[c];
    const token = guess[c];

    // remove prior states
    tile.classList.remove("correct","present","absent");
    tile.classList.add("flip");
    const delay = 120 * c;

    setTimeout(() => {
      tile.classList.remove("flip");
      tile.classList.add(state);
      updateKeypad(token, state);
    }, 200 + delay);
  }

  // Win condition: all tokens correct
  const allCorrect = feedback.every(s => s === "correct");

  if (allCorrect) {
    showMsg(`🎉 Correct! ${expr} = ${TARGET}`);
    endGame();
  } else {
    if (!restrictToTarget) {
      showMsg(`✅ ${expr} = ${val}`);
    } else {
      showMsg(`❌ ${expr} = ${val} — keep trying for ${TARGET}`);
    }
    nextRow();
  }
}

function updateKeypad(token, state) {
  // Only color buttons in the keypad area
  const buttons = document.querySelectorAll("#keypad button");
  buttons.forEach(btn => {
    if (btn.innerText === token) {
      // Don't downgrade colors: correct > present > absent
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

function nextRow() {
  currentRow++;
  guess = [];
  if (currentRow >= ROWS) {
    showMsg(`Game Over! Secret was: ${secret.join("")} = ${TARGET}`);
    endGame();
  } else {
    render();
  }
}

function endGame() {
  finished = true;
  // disable keypad buttons (leave difficulty buttons active so player can restart)
  document.querySelectorAll("#keypad button").forEach(b => b.disabled = true);
}

function showMsg(msg) {
  document.getElementById("answer").innerText = msg;
}
