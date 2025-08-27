/* ========= Settings ========= */
// Number of rows (guesses allowed)
const ROWS = 7;
// Number of columns: 7 inputs + "=" + result
const COLS = 9;

// Possible target results
const targets = [10,20,40,50,60,80,100,150,200,250];

// Allowed numbers and operators
const numbers = [1,2,3,4,5,8,10,15,20,25,30,40,50,60,75,80,90,100,150,200,250];
const ops = ["+","-","*","/","**"];

/* ========= Game State ========= */
// Current row where the player is typing
let currentRow = 0;
// The player's current guess tokens
let guess = [];
// Secret equation tokens chosen by the computer
let secret = [];
// Target result number
let TARGET;
// Flag if the game is finished
let finished = false;

/* ========= Start Game ========= */
window.onload = function() {
  pickSecret(); // Pick a random secret equation
  document.getElementById("target").innerText = "🎯 Target: " + TARGET; // Show target
  document.getElementById("choices").innerText = "Pattern: NUM OP NUM OP NUM OP NUM = RESULT"; // Show pattern
  buildBoard(); // Create the game board
  buildKeypad(); // Create the keypad
};

/* ========= Board ========= */
function buildBoard() {
  const board = document.getElementById("board"); // Get board area
  board.style.setProperty("--cols", COLS); // Set number of columns
  board.innerHTML = ""; // Clear old board

  // Loop through rows
  for (let r = 0; r < ROWS; r++) {
    // Loop through columns
    for (let c = 0; c < COLS; c++) {
      // Create a tile (square)
      const tile = document.createElement("div");
      tile.id = r + "-" + c; // Give it an ID (row-col)
      tile.className = "tile"; // Add CSS class
      board.appendChild(tile); // Add tile to board
    }
  }

  // Add flip animation CSS
  addFlipAnimationCSS();

  // Listen for Enter and Backspace keys
  document.addEventListener("keydown", function(e) {
    if (finished) return; // Do nothing if game finished
    if (e.key === "Enter") { e.preventDefault(); submit(); } // Submit on Enter
    if (e.key === "Backspace") { e.preventDefault(); backspace(); } // Remove last token
  });
}

/* ========= Keypad ========= */
function buildKeypad() {
  // Get number and operator areas
  const numWrap = document.getElementById("numberChoices");
  const opWrap = document.getElementById("operatorChoices");

  // Clear old buttons
  numWrap.innerHTML = "";
  opWrap.innerHTML = "";

  // Add number buttons
  for (let i = 0; i < numbers.length; i++) {
    const btn = makeBtn("choice-btn", numbers[i], function() { add(numbers[i]); });
    numWrap.appendChild(btn);
  }

  // Add operator buttons
  for (let i = 0; i < ops.length; i++) {
    const btn = makeBtn("op-btn", ops[i], function() { add(ops[i]); });
    opWrap.appendChild(btn);
  }

  // Set action button events
  document.getElementById("backspaceBtn").onclick = backspace;
  document.getElementById("clearBtn").onclick = clearRow;
  document.getElementById("submitBtn").onclick = submit;
}

// Function to make a button
function makeBtn(cls, text, fn) {
  const btn = document.createElement("button");
  btn.className = cls; // Set CSS class
  btn.innerText = text; // Set button text
  btn.onclick = fn; // Set button click function
  return btn; // Return button
}

/* ========= Secret ========= */
function pickSecret() {
  // Pick a random target
  TARGET = targets[Math.floor(Math.random() * targets.length)];
  const tries = 50000; // Maximum attempts to generate a valid equation

  for (let i = 0; i < tries; i++) {
    // Pick 4 numbers
    const nums = [
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)]
    ];

    // Pick 3 operators
    const opsPicked = [
      ops[Math.floor(Math.random() * ops.length)],
      ops[Math.floor(Math.random() * ops.length)],
      ops[Math.floor(Math.random() * ops.length)]
    ];

    // Build expression as string
    const expr = nums[0] + opsPicked[0] + nums[1] + opsPicked[1] + nums[2] + opsPicked[2] + nums[3];

    // Try to evaluate expression
    try {
      if (eval(expr) === TARGET) {
        // Save secret tokens
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

  // Fallback secret if none found
  secret = ["10","+","20","-","5","*","1"];
}

/* ========= Input ========= */
// Add token to guess
function add(token) {
  if (finished) return; // Stop if game finished
  if (guess.length >= 7) return; // Only allow 7 inputs
  if (guess.length === 0 && isOp(token)) return; // Cannot start with operator
  if (isOp(token) && isOp(guess[guess.length - 1])) return; // No two operators in a row
  if (!isOp(token) && guess.length > 0 && !isOp(guess[guess.length - 1])) return; // No two numbers in a row

  guess.push(String(token)); // Add token
  render(); // Update board
}

// Remove last token
function backspace() {
  if (!finished && guess.length > 0) {
    guess.pop();
    render();
  }
}

// Clear whole row
function clearRow() {
  if (!finished) {
    guess = [];
    render();
  }
}

/* ========= Render ========= */
// Draw guess on board
function render() {
  for (let c = 0; c < COLS; c++) {
    const tile = document.getElementById(currentRow + "-" + c);
    tile.className = "tile"; // Reset tile style

    if (c < 7) {
      // First 7 are guess tokens
      tile.innerText = guess[c] || "";
    } else if (c === 7) {
      // 8th tile is always "="
      tile.innerText = "=";
      tile.classList.add("red-tile");
    } else if (c >= 8) {
      // Last tile is the result (wide box)
      const expr = guess.slice(0, 7).join("");
      try {
        tile.innerText = eval(expr);  // calculate result
      } catch {
        tile.innerText = "";          // empty if invalid
      }
      tile.classList.add("red-tile");     // red background
      tile.classList.add("result-tile");  // wider tile
    }
  }
}


/* ========= Guess Check ========= */
// Check if token is operator
function isOp(t) { return ops.indexOf(t) !== -1; }

// Check if guess follows pattern NUM OP NUM ...
function validGuess(tokens) {
  if (tokens.length !== 7) return false;
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) { if (isOp(tokens[i])) return false; } // Even positions = numbers
    else { if (!isOp(tokens[i])) return false; } // Odd positions = operators
  }
  return true;
}

// Submit guess
function submit() {
  if (finished) return;

  if (!validGuess(guess)) {
    showMsg("⚠️ Follow pattern NUM OP NUM OP NUM OP NUM");
    return;
  }

  // Prepare feedback
  const feedback = [];
  for (let i = 0; i < COLS; i++) feedback.push("absent");

  const secretCopy = secret.slice(); // Copy secret

  // Check correct positions
  for (let i = 0; i < 7; i++) {
    if (guess[i] === secretCopy[i]) {
      feedback[i] = "correct";
      secretCopy[i] = null;
    }
  }

  // Check present but wrong place
  for (let i = 0; i < 7; i++) {
    if (feedback[i] !== "correct") {
      const idx = secretCopy.indexOf(guess[i]);
      if (idx !== -1) {
        feedback[i] = "present";
        secretCopy[idx] = null;
      }
    }
  }

  // Re-draw row
  render();

  // Animate and color
  for (let c = 0; c < 7; c++) {
    const tile = document.getElementById(currentRow + "-" + c);
    tile.classList.add("flip");
    setTimeout(function() {
      tile.classList.remove("flip");
      tile.classList.add(feedback[c]);
    }, 300);
  }

  // Evaluate expression
  const expr = guess.join("");
  let val;
  try { val = eval(expr); } catch { val = "invalid"; }

  // Check win
  let allCorrect = true;
  for (let i = 0; i < 7; i++) {
    if (feedback[i] !== "correct") allCorrect = false;
  }

  if (allCorrect && val === TARGET) {
    showMsg("🎉 Correct! " + expr + " = " + TARGET);
    endGame();
  } else {
    showMsg("❌ " + expr + " = " + val + " — not correct");
    nextRow();
  }
}

// Go to next row
function nextRow() {
  currentRow++;
  guess = [];
  if (currentRow >= ROWS) {
    showMsg("Game Over! Secret was: " + secret.join("") + " = " + TARGET);
    endGame();
  }
}

// End the game
function endGame() {
  finished = true;
  const buttons = document.querySelectorAll("button");
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].disabled = true;
  }
}

// Show message
function showMsg(msg) {
  document.getElementById("answer").innerText = msg;
}

/* ========= Flip Animation ========= */
function addFlipAnimationCSS() {
  const style = document.createElement("style");
  style.innerHTML = 
    ".tile.flip { animation: flip 0.6s ease forwards; }" +
    "@keyframes flip { 0%{transform:rotateX(0deg);} 50%{transform:rotateX(90deg);} 100%{transform:rotateX(0deg);} }";
  document.head.appendChild(style);
}
