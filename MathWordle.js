/* ========= Settings ========= */
const ROWS = 7; // How many guesses the player can make
const COLS = 9; // 7 slots for numbers/operators + 1 "=" slot + 1 result slot

// Possible target numbers (the goal the player must reach)
const targets = [10,20,40,50,60,80,100,150,200,250];

// Numbers that can appear in the puzzle
const numbers = [1,2,3,4,5,8,10,15,20,25,30,40,50,60,75,80,90,100,150,200,250];

// Operators the player can use
const ops = ["+","-","*","/","**"]; // ** means "to the power of"


/* ========= Game State ========= */
let currentRow = 0;   // Which row (attempt) the player is currently filling in
let guess = [];       // What the player has typed so far
let secret = [];      // The hidden correct answer (numbers + operators)
let TARGET;           // The goal number the player must reach
let finished = false; // True if the game is over, false if still playing


/* ========= Start Game ========= */
window.onload = function() { // This runs when the page loads
  pickSecret(); // Choose a random puzzle
  document.getElementById("target").innerText = "🎯 Target: " + TARGET; // Show the target number
  document.getElementById("choices").innerText = "Pattern: NUM OP NUM OP NUM OP NUM = RESULT"; // Show the input pattern
  buildBoard();  // Make the empty game board
  buildKeypad(); // Make the number and operator buttons
};


/* ========= Board ========= */
function buildBoard() {
  const board = document.getElementById("board"); // Get the board area
  board.style.setProperty("--cols", COLS); // Set the number of columns
  board.innerHTML = ""; // Clear anything already inside

  // Make each row and each column
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = document.createElement("div"); // Create a box (tile)
      tile.id = r + "-" + c; // Give it a unique ID like "0-0", "0-1", etc.
      tile.className = "tile"; // Give it the tile style

      // If we are in the 8th column, this tile is "="
      if (c === 7) {
        tile.innerText = "="; // Put "=" sign inside
        tile.classList.add("red-tile"); // Make it red
      }

      // If we are in the 9th column, this tile is for the result
      if (c === 8) {
        tile.classList.add("red-tile");      // Make it red
        tile.classList.add("result-tile");   // Make it wide
      }

      board.appendChild(tile); // Add the tile to the board
    }
  }

  addFlipAnimationCSS(); // Add the flip animation style

  // Listen for keyboard keys (Enter = submit, Backspace = delete)
  document.addEventListener("keydown", function(e) {
    if (finished) return; // Stop if game is over
    if (e.key === "Enter") { e.preventDefault(); submit(); }     // Submit guess
    if (e.key === "Backspace") { e.preventDefault(); backspace(); } // Delete last input
  });
}


/* ========= Keypad ========= */
function buildKeypad() {
  const numWrap = document.getElementById("numberChoices");   // Where numbers go
  const opWrap = document.getElementById("operatorChoices");  // Where operators go

  numWrap.innerHTML = ""; // Clear any old buttons
  opWrap.innerHTML = "";

  // Make buttons for numbers
  for (let i = 0; i < numbers.length; i++) {
    const btn = makeBtn("choice-btn", numbers[i], function() { add(numbers[i]); });
    numWrap.appendChild(btn); // Add the button
  }

  // Make buttons for operators
  for (let i = 0; i < ops.length; i++) {
    const btn = makeBtn("op-btn", ops[i], function() { add(ops[i]); });
    opWrap.appendChild(btn); // Add the button
  }

  // Make the action buttons work
  document.getElementById("backspaceBtn").onclick = backspace;
  document.getElementById("clearBtn").onclick = clearRow;
  document.getElementById("submitBtn").onclick = submit;
}

// Function to create a button
function makeBtn(cls, text, fn) {
  const btn = document.createElement("button"); // Make button
  btn.className = cls;     // Give it a style
  btn.innerText = text;    // Show text inside
  btn.onclick = fn;        // Run function when clicked
  return btn;              // Return the button
}


/* ========= Secret ========= */
function pickSecret() {
  TARGET = targets[Math.floor(Math.random() * targets.length)]; // Pick a random target number
  const tries = 50000; // Try this many times to find a valid secret

  // Try to find numbers/operators that equal TARGET
  for (let i = 0; i < tries; i++) {
    // Pick 4 random numbers
    const nums = [
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      numbers[Math.floor(Math.random() * numbers.length)]
    ];

    // Pick 3 random operators
    const opsPicked = [
      ops[Math.floor(Math.random() * ops.length)],
      ops[Math.floor(Math.random() * ops.length)],
      ops[Math.floor(Math.random() * ops.length)]
    ];

    // Build expression like "10+20*5-2"
    const expr = nums[0] + opsPicked[0] + nums[1] + opsPicked[1] + nums[2] + opsPicked[2] + nums[3];

    try {
      if (eval(expr) === TARGET) { // If it matches target
        // Save the secret as tokens
        secret = [
          String(nums[0]), opsPicked[0],
          String(nums[1]), opsPicked[1],
          String(nums[2]), opsPicked[2],
          String(nums[3])
        ];
        return; // Done
      }
    } catch {}
  }

  // If no secret found, fallback to this
  secret = ["10","+","20","-","5","*","1"];
}


/* ========= Input ========= */
function add(token) {
  if (finished) return; // Stop if game over
  if (guess.length >= 7) return; // Can't add more than 7 tokens
  if (guess.length === 0 && isOp(token)) return; // Can't start with operator
  if (isOp(token) && isOp(guess[guess.length - 1])) return; // Can't put 2 operators in a row
  if (!isOp(token) && guess.length > 0 && !isOp(guess[guess.length - 1])) return; // Can't put 2 numbers in a row

  guess.push(String(token)); // Add token to guess
  render(); // Show on board
}

function backspace() {
  if (!finished && guess.length > 0) {
    guess.pop(); // Remove last token
    render();
  }
}

function clearRow() {
  if (!finished) {
    guess = []; // Clear everything
    render();
  }
}


/* ========= Render ========= */
function render() {
  for (let c = 0; c < COLS; c++) {
    const tile = document.getElementById(currentRow + "-" + c); // Get tile

    if (c < 7) {
      tile.innerText = guess[c] || ""; // Show guess token or empty
    } else if (c === 7) {
      tile.innerText = "="; // Always "="
    } else if (c === 8) {
      const expr = guess.slice(0, 7).join(""); // Join guess
      try {
        tile.innerText = eval(expr); // Show result
      } catch {
        tile.innerText = ""; // Show nothing if invalid
      }
    }
  }
}


/* ========= Guess Check ========= */
function isOp(t) { return ops.indexOf(t) !== -1; } // True if token is operator

function validGuess(tokens) {
  if (tokens.length !== 7) return false; // Must have 7 tokens
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) { // Even positions = number
      if (isOp(tokens[i])) return false;
    } else { // Odd positions = operator
      if (!isOp(tokens[i])) return false;
    }
  }
  return true; // Guess is valid
}

function submit() {
  if (finished) return; // Stop if game over

  if (!validGuess(guess)) { // If guess is wrong format
    showMsg("⚠️ Follow pattern NUM OP NUM OP NUM OP NUM");
    return;
  }

  const feedback = []; // Keep track of right/wrong
  for (let i = 0; i < COLS; i++) feedback.push("absent");

  const secretCopy = secret.slice(); // Copy secret so we can mark used items

  // Check exact matches
  for (let i = 0; i < 7; i++) {
    if (guess[i] === secretCopy[i]) {
      feedback[i] = "correct"; // Right place
      secretCopy[i] = null;    // Mark as used
    }
  }

  // Check present but wrong place
  for (let i = 0; i < 7; i++) {
    if (feedback[i] !== "correct") {
      const idx = secretCopy.indexOf(guess[i]);
      if (idx !== -1) {
        feedback[i] = "present"; // Exists but wrong place
        secretCopy[idx] = null;  // Mark as used
      }
    }
  }

  render(); // Update board

  // Animate and color the tiles
// Animate and color the tiles + update keypad
  for (let c = 0; c < 7; c++) {
  const tile = document.getElementById(currentRow + "-" + c);
  const state = feedback[c]; // correct, present, absent
  const token = guess[c];

  tile.classList.add("flip");
  setTimeout(function() {
    tile.classList.remove("flip");
    tile.classList.add(state); // color tile
    updateKeypad(token, state); // color keypad
  }, 300);
}

  // Calculate expression value
  const expr = guess.join("");
  let val;
  try { val = eval(expr); } catch { val = "invalid"; }

  // Check if fully correct
  let allCorrect = true;
  for (let i = 0; i < 7; i++) {
    if (feedback[i] !== "correct") allCorrect = false;
  }

  if (allCorrect && val === TARGET) {
    showMsg("🎉 Correct! " + expr + " = " + TARGET);
    endGame(); // Win
  } else {
    showMsg("❌ " + expr + " = " + val + " — not correct");
    nextRow(); // Move to next try
  }
}

function nextRow() {
  currentRow++; // Move to next row
  guess = [];   // Clear guess
  if (currentRow >= ROWS) { // If no more rows
    showMsg("Game Over! Secret was: " + secret.join("") + " = " + TARGET);
    endGame(); // Game over
  }
}

function endGame() {
  finished = true; // Stop playing
  const buttons = document.querySelectorAll("button");
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].disabled = true; // Disable all buttons
  }
}

function showMsg(msg) {
  document.getElementById("answer").innerText = msg; // Show message
}


/* ========= Flip Animation ========= */
function addFlipAnimationCSS() {
  const style = document.createElement("style"); // Make style tag
  style.innerHTML = 
    ".tile.flip { animation: flip 0.6s ease forwards; }" + // Flip effect
    "@keyframes flip { 0%{transform:rotateX(0deg);} 50%{transform:rotateX(90deg);} 100%{transform:rotateX(0deg);} }";
  document.head.appendChild(style); // Add style to page
}

function updateKeypad(token, state) {
  // Find the button that matches the token
  const buttons = document.querySelectorAll("button");
  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].innerText === token) {
      // Don't downgrade colors: correct > present > absent
      if (state === "correct") {
        buttons[i].classList.remove("present", "absent");
        buttons[i].classList.add("correct");
      } else if (state === "present" && !buttons[i].classList.contains("correct")) {
        buttons[i].classList.remove("absent");
        buttons[i].classList.add("present");
      } else if (state === "absent" && !buttons[i].classList.contains("correct") && !buttons[i].classList.contains("present")) {
        buttons[i].classList.add("absent");
      }
    }
  }
}
