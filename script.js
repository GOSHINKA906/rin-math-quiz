const questionElement = document.getElementById("question");
const questionVisualElement = document.getElementById("questionVisual");
const choicesElement = document.getElementById("choices");
const resultElement = document.getElementById("result");
const messageElement = document.getElementById("message");
const answerFormulaElement = document.getElementById("answerFormula");
const characterElement = document.getElementById("character");
const nextButton = document.getElementById("nextButton");
const questionNumberElement = document.getElementById("questionNumber");
const correctCountElement = document.getElementById("correctCount");
const progressBarElement = document.getElementById("progressBar");
const finalScreenElement = document.getElementById("finalScreen");
const finalScoreElement = document.getElementById("finalScore");
const finalRateElement = document.getElementById("finalRate");
const finalCommentElement = document.getElementById("finalComment");
const musicButton = document.getElementById("musicButton");
const speechButton = document.getElementById("speechButton");

const totalQuestions = 10;
let currentAnswer = 0;
let currentFormula = "";
let currentFirst = 0;
let currentSecond = 0;
let currentOperator = "+";
let currentQuestion = 1;
let correctCount = 0;
let answered = false;
let audioContext = null;
let musicTimer = null;
let isMusicPlaying = false;
let isSpeechOn = false;
let currentSpeechText = "";

const melody = [
  523.25,
  659.25,
  783.99,
  659.25,
  587.33,
  698.46,
  880,
  698.46,
];

function playTone(frequency, startTime, duration) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.045, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playMelodyLoop() {
  if (!audioContext || !isMusicPlaying) {
    return;
  }

  const startTime = audioContext.currentTime + 0.04;

  melody.forEach((frequency, index) => {
    playTone(frequency, startTime + (index * 0.28), 0.2);
  });
}

async function toggleMusic() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  isMusicPlaying = !isMusicPlaying;
  musicButton.setAttribute("aria-pressed", String(isMusicPlaying));
  musicButton.textContent = isMusicPlaying ? "♪ おんがく ON" : "♪ おんがく";

  if (isMusicPlaying) {
    playMelodyLoop();
    musicTimer = setInterval(playMelodyLoop, 2240);
    return;
  }

  clearInterval(musicTimer);
  musicTimer = null;
}

function numberToJapanese(number) {
  const onesReadings = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];

  if (number === 0) {
    return "ぜろ";
  }

  if (number === 100) {
    return "ひゃく";
  }

  const tens = Math.floor(number / 10);
  const ones = number % 10;
  const tensText = tens === 1 ? "じゅう" : `${onesReadings[tens]}じゅう`;

  return `${tensText}${onesReadings[ones]}`;
}

function makeSpeechText(questionText) {
  const match = questionText.match(/(\d+) ([+-]) (\d+)/);

  if (!match) {
    return questionText;
  }

  const operator = match[2] === "+" ? "たす" : "ひく";
  return `${numberToJapanese(Number(match[1]))}${operator}${numberToJapanese(Number(match[3]))}わ？`;
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    speechButton.textContent = "よみあげ なし";
    speechButton.disabled = true;
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.82;
  utterance.pitch = 1.15;
  window.speechSynthesis.speak(utterance);
}

function toggleSpeech() {
  if (!("speechSynthesis" in window)) {
    speechButton.textContent = "よみあげ なし";
    speechButton.disabled = true;
    return;
  }

  isSpeechOn = !isSpeechOn;
  speechButton.setAttribute("aria-pressed", String(isSpeechOn));
  speechButton.textContent = isSpeechOn ? "よみあげ ON" : "よみあげ";

  if (isSpeechOn) {
    speak(currentSpeechText);
    return;
  }

  window.speechSynthesis.cancel();
}

function randomTen(min, max) {
  const steps = (max - min) / 10 + 1;
  return (Math.floor(Math.random() * steps) * 10) + min;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function setCurrentProblem(first, operator, second, answer) {
  currentFirst = first;
  currentOperator = operator;
  currentSecond = second;
  currentAnswer = answer;
  currentFormula = `${first} ${operator} ${second} = ${answer}`;
}

function createToken(text, className) {
  const token = document.createElement("span");
  token.className = className;
  token.textContent = text;
  return token;
}

function createNumberModel(number) {
  const model = document.createElement("div");
  model.className = "number-model";
  model.setAttribute("aria-label", `${number}のまとまり`);

  const tens = Math.floor(number / 10);
  const ones = number % 10;

  for (let index = 0; index < tens; index += 1) {
    model.appendChild(createToken("10", "model-token ten-token"));
  }

  for (let index = 0; index < ones; index += 1) {
    model.appendChild(createToken("1", "model-token one-token"));
  }

  if (number === 0) {
    model.appendChild(createToken("0", "model-token zero-token"));
  }

  return model;
}

function renderQuestionVisual() {
  questionVisualElement.innerHTML = "";

  const firstGroup = document.createElement("div");
  firstGroup.className = "visual-group";
  firstGroup.append(createNumberModel(currentFirst));

  const operator = document.createElement("div");
  operator.className = "visual-operator";
  operator.textContent = currentOperator;

  const secondGroup = document.createElement("div");
  secondGroup.className = "visual-group";
  secondGroup.append(createNumberModel(currentSecond));

  questionVisualElement.append(firstGroup, operator, secondGroup);
}

function renderVerticalFormula() {
  answerFormulaElement.setAttribute("aria-label", currentFormula);
  answerFormulaElement.innerHTML = "";

  const firstRow = document.createElement("div");
  firstRow.className = "vertical-row vertical-first";
  firstRow.textContent = currentFirst;

  const secondRow = document.createElement("div");
  secondRow.className = "vertical-row vertical-second";

  const operator = document.createElement("span");
  operator.className = "vertical-operator";
  operator.textContent = currentOperator;

  const number = document.createElement("span");
  number.textContent = currentSecond;

  secondRow.append(operator, number);

  const answerRow = document.createElement("div");
  answerRow.className = "vertical-row vertical-answer";
  answerRow.textContent = currentAnswer;

  answerFormulaElement.append(firstRow, secondRow, answerRow);
}

function makeEasyQuestion() {
  const isAddition = Math.random() < 0.5;
  const first = randomTen(10, 90);
  let second;

  if (isAddition) {
    second = randomTen(10, 90 - first);
    setCurrentProblem(first, "+", second, first + second);
    return `${first} + ${second} = ?`;
  }

  second = randomTen(10, first);
  setCurrentProblem(first, "-", second, first - second);
  return `${first} - ${second} = ?`;
}

function makeHardQuestion() {
  const isAddition = Math.random() < 0.5;
  const ones = Math.floor(Math.random() * 10);
  let first;
  let second;

  if (isAddition) {
    const firstTens = Math.floor(Math.random() * 7) + 1;
    const secondTens = Math.floor(Math.random() * (9 - firstTens)) + 1;
    first = (firstTens * 10) + ones;
    second = secondTens * 10;
    setCurrentProblem(first, "+", second, first + second);
    return `${first} + ${second} = ?`;
  }

  const firstTens = Math.floor(Math.random() * 8) + 2;
  const secondTens = Math.floor(Math.random() * (firstTens - 1)) + 1;
  first = (firstTens * 10) + ones;
  second = secondTens * 10;
  setCurrentProblem(first, "-", second, first - second);
  return `${first} - ${second} = ?`;
}

function makeQuestion() {
  if (currentQuestion <= 3) {
    return makeEasyQuestion();
  }

  return makeHardQuestion();
}

function makeChoices(answer) {
  const choices = new Set([answer]);

  while (choices.size < 3) {
    const offset = Math.random() < 0.7 ? randomTen(-30, 30) : Math.floor(Math.random() * 11) - 5;
    const candidate = answer + offset;

    if (candidate >= 0 && candidate <= 100 && candidate !== answer) {
      choices.add(candidate);
    }
  }

  return shuffle([...choices]);
}

function updateScoreBoard() {
  questionNumberElement.textContent = currentQuestion;
  correctCountElement.textContent = correctCount;
  progressBarElement.style.width = `${(currentQuestion / totalQuestions) * 100}%`;
}

function showQuestion() {
  answered = false;
  resultElement.classList.add("hidden");
  finalScreenElement.classList.add("hidden");
  nextButton.classList.add("hidden");
  nextButton.textContent = "つぎのもんだい";
  updateScoreBoard();
  questionElement.textContent = makeQuestion();
  renderQuestionVisual();
  currentSpeechText = makeSpeechText(questionElement.textContent);
  choicesElement.innerHTML = "";

  makeChoices(currentAnswer).forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = choice;
    button.addEventListener("click", () => checkAnswer(button, choice));
    choicesElement.appendChild(button);
  });

  if (isSpeechOn) {
    setTimeout(() => speak(currentSpeechText), 250);
  }
}

function checkAnswer(button, choice) {
  if (answered) {
    return;
  }

  answered = true;
  const isCorrect = choice === currentAnswer;
  const buttons = choicesElement.querySelectorAll(".choice-button");

  buttons.forEach((choiceButton) => {
    choiceButton.disabled = true;

    if (Number(choiceButton.textContent) === currentAnswer) {
      choiceButton.classList.add("correct");
    } else if (choiceButton !== button) {
      choiceButton.classList.add("dimmed");
    }
  });

  resultElement.classList.remove("hidden");
  renderVerticalFormula();

  if (isCorrect) {
    correctCount += 1;
    correctCountElement.textContent = correctCount;
    messageElement.textContent = "ピンポーン！";
    characterElement.classList.remove("hidden");
  } else {
    button.classList.add("wrong");
    messageElement.textContent = `おしい！こたえは ${currentAnswer}`;
    characterElement.classList.add("hidden");
  }

  if (currentQuestion === totalQuestions) {
    nextButton.textContent = "けっかをみる";
  }

  nextButton.classList.remove("hidden");
}

function showFinalScreen() {
  const rate = Math.round((correctCount / totalQuestions) * 100);
  let comment = "もういっかい ちょうせんしよう！";

  if (rate === 100) {
    comment = "すごい！さんすうマスター！";
  } else if (rate >= 80) {
    comment = "やったね！とってもじょうず！";
  } else if (rate >= 60) {
    comment = "いいかんじ！あとすこし！";
  }

  questionElement.textContent = "おつかれさま！";
  questionVisualElement.innerHTML = "";
  choicesElement.innerHTML = "";
  resultElement.classList.add("hidden");
  finalScoreElement.textContent = `${totalQuestions}もんちゅう ${correctCount}もん せいかい`;
  finalRateElement.textContent = `せいかいりつ ${rate}%`;
  finalCommentElement.textContent = comment;
  finalScreenElement.classList.remove("hidden");
  nextButton.textContent = "もういちど あそぶ";
  nextButton.classList.remove("hidden");
  progressBarElement.style.width = "100%";
}

function startGame() {
  currentQuestion = 1;
  correctCount = 0;
  correctCountElement.textContent = correctCount;
  showQuestion();
}

function goNext() {
  if (!answered) {
    return;
  }

  if (currentQuestion === totalQuestions) {
    showFinalScreen();
    answered = false;
    return;
  }

  currentQuestion += 1;
  showQuestion();
}

function handleNextButton() {
  if (!answered && currentQuestion === totalQuestions) {
    startGame();
    return;
  }

  if (!answered && finalScreenElement.classList.contains("hidden") === false) {
    startGame();
    return;
  }

  if (!answered) {
    startGame();
    return;
  }

  goNext();
}

nextButton.addEventListener("click", handleNextButton);
musicButton.addEventListener("click", toggleMusic);
speechButton.addEventListener("click", toggleSpeech);

startGame();
