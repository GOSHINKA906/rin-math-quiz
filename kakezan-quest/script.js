const TOTAL_QUESTIONS = 10;

const gameScreen = document.querySelector("#gameScreen");
const resultScreen = document.querySelector("#resultScreen");
const questionNumber = document.querySelector("#questionNumber");
const questionText = document.querySelector("#question");
const groupVisual = document.querySelector("#groupVisual");
const visualCaption = document.querySelector("#visualCaption");
const answers = document.querySelector("#answers");
const feedback = document.querySelector("#feedback");
const feedbackTitle = document.querySelector("#feedbackTitle");
const feedbackFormula = document.querySelector("#feedbackFormula");
const feedbackHint = document.querySelector("#feedbackHint");
const starCount = document.querySelector("#starCount");
const comboCount = document.querySelector("#comboCount");
const questPath = document.querySelector("#questPath");
const mascot = document.querySelector("#mascot");
const mascotSpeech = document.querySelector("#mascotSpeech");
const nextDock = document.querySelector("#nextDock");
const nextButton = document.querySelector("#nextButton");
const retryButton = document.querySelector("#retryButton");
const soundButton = document.querySelector("#soundButton");
const modeButtons = document.querySelectorAll(".mode-button");

let mode = "easy";
let questionIndex = 0;
let correctCount = 0;
let combo = 0;
let bestCombo = 0;
let stars = 0;
let currentQuestion = null;
let answered = false;
let usedQuestions = new Set();
let results = [];
let soundEnabled = true;
let audioContext = null;

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuestion() {
  const firstChoices = mode === "easy" ? [2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let first;
  let second;
  let key;

  do {
    first = randomItem(firstChoices);
    second = 1 + Math.floor(Math.random() * 9);
    key = `${first}x${second}`;
  } while (usedQuestions.has(key) && usedQuestions.size < firstChoices.length * 9);

  usedQuestions.add(key);
  const correct = first * second;
  const candidates = shuffle([
    correct + first,
    correct - first,
    correct + second,
    correct - second,
    correct + 1,
    correct - 1,
    correct + 10,
    correct - 10,
  ]).filter((value) => value > 0 && value <= 81 && value !== correct);

  const choices = [correct];
  for (const value of candidates) {
    if (!choices.includes(value)) choices.push(value);
    if (choices.length === 3) break;
  }
  while (choices.length < 3) {
    const value = 1 + Math.floor(Math.random() * 81);
    if (!choices.includes(value)) choices.push(value);
  }

  return { first, second, correct, choices: shuffle(choices) };
}

function renderPath() {
  questPath.innerHTML = "";
  for (let i = 0; i < TOTAL_QUESTIONS; i += 1) {
    const node = document.createElement("li");
    node.textContent = i + 1;
    if (i < results.length) node.classList.add(results[i] ? "is-correct" : "is-wrong");
    if (i === questionIndex && questionIndex < TOTAL_QUESTIONS) node.classList.add("is-current");
    questPath.append(node);
  }
}

function renderGroups(first, second) {
  groupVisual.innerHTML = "";
  groupVisual.setAttribute("aria-label", `${second}こずつのまとまりが${first}こ`);
  for (let groupIndex = 0; groupIndex < first; groupIndex += 1) {
    const group = document.createElement("div");
    group.className = "dot-group";
    for (let dotIndex = 0; dotIndex < second; dotIndex += 1) {
      const dot = document.createElement("i");
      dot.className = "dot";
      group.append(dot);
    }
    groupVisual.append(group);
  }
  visualCaption.textContent = `${second}こずつの まとまりが ${first}こ`;
}

function renderQuestion() {
  answered = false;
  currentQuestion = buildQuestion();
  questionNumber.textContent = `だい ${questionIndex + 1} もん`;
  questionText.textContent = `${currentQuestion.first} × ${currentQuestion.second} = ?`;
  renderGroups(currentQuestion.first, currentQuestion.second);

  answers.innerHTML = "";
  currentQuestion.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.textContent = choice;
    button.dataset.value = choice;
    button.setAttribute("aria-label", `${index + 1}ばん、${choice}`);
    button.addEventListener("click", () => chooseAnswer(button, choice));
    answers.append(button);
  });

  feedback.className = "feedback";
  feedbackTitle.textContent = "";
  feedbackFormula.textContent = "";
  feedbackHint.textContent = "";
  mascot.className = "mascot";
  mascotSpeech.textContent = questionIndex === 0 ? "いっしょに すすもう！" : "つぎも いけるよ！";
  nextDock.hidden = true;
  document.body.classList.remove("has-next");
  renderPath();
}

function chooseAnswer(button, selected) {
  if (answered) return;
  answered = true;
  const isCorrect = selected === currentQuestion.correct;
  results.push(isCorrect);

  answers.querySelectorAll("button").forEach((answerButton) => {
    answerButton.disabled = true;
    const value = Number(answerButton.dataset.value);
    if (value === currentQuestion.correct) answerButton.classList.add("is-correct");
  });

  feedbackFormula.textContent = `${currentQuestion.first} × ${currentQuestion.second} = ${currentQuestion.correct}`;
  feedbackHint.textContent = `${currentQuestion.second}こずつが ${currentQuestion.first}まとまりで ${currentQuestion.correct}こ`;

  if (isCorrect) {
    correctCount += 1;
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    stars += 10 + Math.min(combo - 1, 5) * 2;
    feedbackTitle.textContent = combo >= 3 ? `${combo}もん れんぞくせいかい！` : "せいかい！ ピンポーン！";
    mascot.classList.add("is-happy");
    mascotSpeech.textContent = combo >= 3 ? "コンボだ！すごい！" : "やったね！";
    playCorrectSound();
  } else {
    combo = 0;
    button.classList.add("is-wrong");
    feedback.classList.add("is-wrong");
    feedbackTitle.textContent = "おしい！ こたえをみてみよう";
    mascot.classList.add("is-sad");
    mascotSpeech.textContent = "だいじょうぶ。つぎへ！";
    playWrongSound();
  }

  starCount.textContent = stars;
  comboCount.textContent = combo;
  renderPath();
  nextButton.innerHTML = questionIndex === TOTAL_QUESTIONS - 1
    ? "けっかを みる <span aria-hidden=\"true\">→</span>"
    : "つぎの もんだいへ <span aria-hidden=\"true\">→</span>";
  nextDock.hidden = false;
  document.body.classList.add("has-next");
}

function nextQuestion() {
  questionIndex += 1;
  if (questionIndex >= TOTAL_QUESTIONS) {
    showResult();
    return;
  }
  renderQuestion();
}

function getRank(score) {
  if (score === 10) return ["九九のレジェンド", "ぜんもんせいかい！ すごい集中力だね！"];
  if (score >= 8) return ["九九マスター", "あと少しでパーフェクト！ とってもいい調子！"];
  if (score >= 6) return ["かけ算レンジャー", "しっかり力がついているよ！"];
  return ["九九チャレンジャー", "ぼうけんするたびに、どんどん強くなるよ！"];
}

function showResult() {
  const [rank, message] = getRank(correctCount);
  gameScreen.hidden = true;
  resultScreen.hidden = false;
  nextDock.hidden = true;
  document.body.classList.remove("has-next");
  document.querySelector("#rankTitle").textContent = rank;
  document.querySelector("#resultMessage").textContent = message;
  document.querySelector("#correctResult").textContent = correctCount;
  document.querySelector("#percentResult").textContent = `${correctCount * 10}%`;
  document.querySelector("#bestComboResult").textContent = `さいこう ${bestCombo}もん れんぞくせいかい ／ スター ${stars}こ`;
  playFinishSound();
  resultScreen.focus({ preventScroll: true });
}

function resetGame() {
  questionIndex = 0;
  correctCount = 0;
  combo = 0;
  bestCombo = 0;
  stars = 0;
  results = [];
  usedQuestions = new Set();
  starCount.textContent = "0";
  comboCount.textContent = "0";
  resultScreen.hidden = true;
  gameScreen.hidden = false;
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ensureAudio() {
  if (!soundEnabled) return null;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playNotes(notes, type = "sine") {
  const context = ensureAudio();
  if (!context) return;
  const start = context.currentTime;
  notes.forEach(([frequency, offset, duration, volume = 0.12]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, start + offset);
    gain.gain.exponentialRampToValueAtTime(volume, start + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + offset + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration + 0.02);
  });
}

function playCorrectSound() {
  playNotes([[523, 0, 0.13], [659, 0.11, 0.13], [784, 0.22, 0.25]], "triangle");
}

function playWrongSound() {
  playNotes([[330, 0, 0.17, 0.08], [262, 0.13, 0.23, 0.08]], "sine");
}

function playFinishSound() {
  playNotes([[523, 0, 0.18], [659, 0.14, 0.18], [784, 0.28, 0.18], [1047, 0.42, 0.38]], "triangle");
}

nextButton.addEventListener("click", nextQuestion);
retryButton.addEventListener("click", resetGame);

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  soundButton.setAttribute("aria-label", soundEnabled ? "音を消す" : "音を出す");
  soundButton.title = soundEnabled ? "音を消す" : "音を出す";
  soundButton.querySelector("span").textContent = soundEnabled ? "♪" : "×";
  if (soundEnabled) playNotes([[660, 0, 0.12]], "triangle");
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.mode === mode) return;
    mode = button.dataset.mode;
    modeButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    resetGame();
  });
});

document.addEventListener("keydown", (event) => {
  if (!answered && ["1", "2", "3"].includes(event.key)) {
    answers.querySelectorAll("button")[Number(event.key) - 1]?.click();
  } else if (answered && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    nextQuestion();
  }
});

renderQuestion();
