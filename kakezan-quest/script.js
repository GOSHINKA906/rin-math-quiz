const $ = (selector) => document.querySelector(selector);
const TOTAL = 10;
const MISSION_ORDER = ["answer", "hop", "answer", "missing", "answer", "hop", "missing", "answer", "hop", "missing"];
const FLOWERS = {
  daisy: { name: "しろい おはな", icon: "✿" },
  tulip: { name: "ももいろ おはな", icon: "✿" },
  sunflower: { name: "おひさま おはな", icon: "✿" },
};

const state = {
  flower: "daisy", level: "easy", index: 0, planted: 0,
  firstTry: 0, mistakes: 0, hop: 0, question: null,
  used: new Set(), sound: false, audio: null, locked: false,
};

function randomFrom(items) { return items[Math.floor(Math.random() * items.length)]; }
function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function show(screen) {
  ["#startScreen", "#gameScreen", "#finishScreen"].forEach((id) => { $(id).hidden = id !== screen; });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function pickQuestion(kind) {
  const firsts = state.level === "easy" ? [2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const seconds = kind === "hop" ? [3, 4, 5] : [2, 3, 4, 5, 6, 7, 8, 9];
  let first, second, key;
  do {
    first = randomFrom(firsts);
    second = randomFrom(seconds);
    key = `${first}x${second}`;
  } while (state.used.has(key));
  state.used.add(key);
  return { first, second, answer: first * second, kind };
}
function choicesFor(correct, step, max = 81) {
  const pool = shuffle([correct - step, correct + step, correct - 1, correct + 1, correct - 2, correct + 2, correct - 10, correct + 10]);
  const picks = [correct];
  for (const item of pool) {
    if (item > 0 && item <= max && !picks.includes(item)) picks.push(item);
    if (picks.length === 3) break;
  }
  for (let n = 1; picks.length < 3 && n <= max; n++) if (!picks.includes(n)) picks.push(n);
  return shuffle(picks);
}
function flowerMarkup(bloomed, extra = "") {
  return `<span class="plot-flower ${state.flower} ${bloomed ? "is-bloomed" : ""} ${extra}" aria-hidden="true"><span class="stem"></span><span class="leaf"></span><span class="blossom">${FLOWERS[state.flower].icon}</span></span>`;
}
function renderGarden(target, count) {
  target.innerHTML = "";
  for (let i = 0; i < TOTAL; i++) {
    const plot = document.createElement("div");
    plot.className = `garden-plot ${i < count ? "has-flower" : ""} ${i === count - 1 ? "just-grown" : ""}`;
    plot.setAttribute("aria-label", `${i + 1}ばんめの おはな、${i < count ? "さいた" : "これから"}`);
    plot.innerHTML = flowerMarkup(i < count) + `<span class="plot-soil" aria-hidden="true"></span>`;
    target.append(plot);
  }
}
function renderGroups(revealed = true) {
  const q = state.question;
  const visual = $("#groupVisual");
  visual.innerHTML = "";
  for (let groupIndex = 0; groupIndex < q.second; groupIndex++) {
    const group = document.createElement("div");
    group.className = "count-pot";
    if (q.kind === "hop" && groupIndex >= state.hop) group.classList.add("is-waiting");
    const dots = document.createElement("div");
    dots.className = "count-dots";
    for (let dotIndex = 0; dotIndex < q.first; dotIndex++) {
      const dot = document.createElement("span");
      dot.className = "count-dot";
      dot.textContent = "✿";
      dots.append(dot);
    }
    const label = document.createElement("small");
    label.textContent = revealed && (q.kind !== "hop" || groupIndex < state.hop) ? `${(groupIndex + 1) * q.first}` : "？";
    group.append(dots, label);
    visual.append(group);
  }
  visual.setAttribute("aria-label", `${q.first}こずつが ${q.second}まとまり`);
  $("#groupCaption").textContent = `${q.first}こずつの おはなばちが ${q.second}こ`;
}
function button(label, className, handler) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", handler);
  return element;
}
function renderAnswers(kind) {
  const q = state.question;
  const container = $("#playControls");
  container.className = "play-controls answer-grid";
  const correct = kind === "missing" ? q.second : q.answer;
  const step = kind === "missing" ? 1 : q.first;
  const max = kind === "missing" ? 9 : 81;
  choicesFor(correct, step, max).forEach((value) => {
    const choice = button(String(value), "answer-choice", () => checkAnswer(choice, value, correct));
    choice.setAttribute("aria-label", `${value}`);
    container.append(choice);
  });
}
function renderHop() {
  const q = state.question;
  const controls = $("#playControls");
  controls.className = "play-controls hop-controls";
  const hopButton = button("🐰 ぴょん！", "hop-button", () => {
    if (state.locked) return;
    state.hop++;
    counter.textContent = state.hop < q.second ? `あと ${q.second - state.hop}かい ジャンプ` : "ぜんぶ ジャンプできた！";
    renderGroups();
    $("#equation").textContent = `${q.first} × ${state.hop} = ${q.first * state.hop}`;
    $("#momoLine").textContent = state.hop < q.second ? `${q.first * state.hop}こ！ つぎも ぴょん！` : "ぜんぶ かぞえたね！";
    playChime(state.hop < q.second ? 440 + state.hop * 65 : 880);
    if (state.hop === q.second) completeMission();
  });
  controls.append(hopButton);
  const counter = document.createElement("p");
  counter.className = "hop-counter";
  counter.textContent = `あと ${q.second}かい ジャンプ`;
  controls.append(counter);
}
function renderMission() {
  state.locked = false;
  state.mistakes = 0;
  state.hop = 0;
  const kind = MISSION_ORDER[state.index];
  const q = state.question = pickQuestion(kind);
  const chapter = state.index < 3 ? "はじまりの おにわ" : state.index < 7 ? "こもれびの おにわ" : "にじいろの おにわ";
  $("#chapterLabel").textContent = `✿ ${chapter}`;
  $("#stepLabel").textContent = `${state.index + 1} / ${TOTAL}`;
  $("#questionBadge").textContent = `だい ${state.index + 1} もん`;
  $("#flowerCount").textContent = `🌼 ${state.planted} / ${TOTAL}`;
  $("#gameScreen").dataset.chapter = String(Math.floor(state.index / 3));
  $("#feedback").textContent = "";
  $("#feedback").className = "feedback";
  $("#hintButton").hidden = kind === "hop";
  $("#hintButton").setAttribute("aria-expanded", "false");
  $("#hintButton").textContent = "💡 ヒントを みる";
  $("#hintPanel").hidden = true;
  $("#hintPanel").textContent = "";
  $("#playControls").innerHTML = "";
  $("#momoLine").textContent = kind === "hop" ? "いっしょに かぞえよう！" : "ゆっくりで だいじょうぶ！";
  if (kind === "answer") {
    $("#missionTag").textContent = "① こたえを えらぼう";
    $("#missionTitle").textContent = "おはなは ぜんぶで なんこ？";
    $("#missionText").textContent = `${q.first}こずつの おはなが ${q.second}はち。いくつに なるかな？`;
    $("#equation").textContent = `${q.first} × ${q.second} = ？`;
    renderGroups(false);
    renderAnswers(kind);
  } else if (kind === "missing") {
    $("#missionTag").textContent = "③ かくれた かずを みつけよう";
    $("#missionTitle").textContent = "はちは なんこ ある？";
    $("#missionText").textContent = `${q.first}こずつで ${q.answer}こ。□に はいる かずを えらぼう。`;
    $("#equation").textContent = `${q.first} × □ = ${q.answer}`;
    renderGroups(false);
    renderAnswers(kind);
  } else {
    $("#missionTag").textContent = "② ぴょんぴょん かぞえよう";
    $("#missionTitle").textContent = "ももと いっしょに ジャンプ！";
    $("#missionText").textContent = `${q.first}こずつ ${q.second}かい ジャンプ。ボタンを おして かぞえよう。`;
    $("#equation").textContent = `${q.first} × ${q.second} = ？`;
    renderGroups();
    renderHop();
  }
  renderGarden($("#gardenPlots"), state.planted);
}
function checkAnswer(choice, value, correct) {
  if (state.locked || choice.disabled) return;
  if (value === correct) {
    if (state.mistakes === 0) state.firstTry++;
    choice.classList.add("is-correct");
    completeMission();
    return;
  }
  state.mistakes++;
  choice.disabled = true;
  choice.classList.add("is-wrong");
  $("#feedback").className = "feedback is-gentle";
  $("#feedback").textContent = state.mistakes === 1 ? "おしい！ おはなを かぞえて、もういちど 🌱" : "だいじょうぶ。ヒントを みても いいよ 🌷";
  $("#momoLine").textContent = "いっしょに もういっかい！";
  playChime(330);
}
function completeMission() {
  if (state.locked) return;
  state.locked = true;
  state.planted++;
  const q = state.question;
  $("#flowerCount").textContent = `🌼 ${state.planted} / ${TOTAL}`;
  renderGarden($("#gardenPlots"), state.planted);
  $("#feedback").className = "feedback is-success";
  $("#feedback").innerHTML = `<strong>おはなが さいたよ！ ✿</strong><span>${q.first} × ${q.second} = ${q.answer}</span>`;
  $("#momoLine").textContent = "やったね！ おはなが さいたよ！";
  const controls = $("#playControls");
  controls.innerHTML = "";
  controls.className = "play-controls next-controls";
  const next = button(state.index === TOTAL - 1 ? "かんせいした おにわを みる →" : "つぎの おはなへ →", "primary-button next-button", () => {
    state.index++;
    if (state.index === TOTAL) finish(); else { renderMission(); $("#gameScreen").scrollIntoView({ behavior: "smooth" }); }
  });
  controls.append(next);
  $("#hintButton").hidden = true;
  $("#hintPanel").hidden = true;
  playSuccess();
}
function showHint() {
  const q = state.question;
  const panel = $("#hintPanel");
  const opening = panel.hidden;
  panel.hidden = !opening;
  $("#hintButton").setAttribute("aria-expanded", String(opening));
  $("#hintButton").textContent = opening ? "💡 ヒントを とじる" : "💡 ヒントを みる";
  if (!opening) return;
  const steps = Array.from({ length: q.second }, (_, i) => `${q.first * (i + 1)}`).join(" → ");
  panel.textContent = q.kind === "missing" ? `${q.first}ずつ かぞえるよ。${steps}。おはなばちは いくつ？` : `${q.first}ずつ かぞえるよ。${steps}。さいごの かずは？`;
  renderGroups(true);
}
function finish() {
  show("#finishScreen");
  renderGarden($("#finishGarden"), TOTAL);
  $("#finishMessage").textContent = state.firstTry >= 7 ? "じぶんで たくさん みつけたね！ ももも びっくり ♡" : "さいごまで いっしょに そだてたね。ももは うれしいな ♡";
  $("#finishScreen").focus({ preventScroll: true });
  playSuccess();
}
function begin() {
  state.index = 0; state.planted = 0; state.firstTry = 0;
  state.used.clear();
  show("#gameScreen");
  renderMission();
}
function setSelected(selector, chosen) {
  document.querySelectorAll(selector).forEach((item) => {
    const selected = item === chosen;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
}
function audioContext() {
  if (!state.sound) return null;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  if (!state.audio) state.audio = new Audio();
  if (state.audio.state === "suspended") state.audio.resume();
  return state.audio;
}
function playChime(frequency) {
  const audio = audioContext();
  if (!audio) return;
  const start = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(.05, start + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, start + .2);
  osc.connect(gain).connect(audio.destination);
  osc.start(start); osc.stop(start + .21);
}
function playSuccess() {
  [523, 659, 784].forEach((tone, i) => window.setTimeout(() => playChime(tone), i * 95));
}

document.querySelectorAll(".seed-option").forEach((item) => item.addEventListener("click", () => {
  state.flower = item.dataset.flower;
  setSelected(".seed-option", item);
}));
document.querySelectorAll(".level-option").forEach((item) => item.addEventListener("click", () => {
  state.level = item.dataset.level;
  setSelected(".level-option", item);
}));
$("#startButton").addEventListener("click", begin);
$("#againButton").addEventListener("click", begin);
$("#changeButton").addEventListener("click", () => show("#startScreen"));
$("#hintButton").addEventListener("click", showHint);
$("#soundButton").addEventListener("click", () => {
  state.sound = !state.sound;
  $("#soundButton").setAttribute("aria-pressed", String(state.sound));
  $("#soundButton").setAttribute("aria-label", state.sound ? "おとを けす" : "おとを だす");
  $("#soundLabel").textContent = state.sound ? "おと ON" : "おと OFF";
  if (state.sound) playChime(660);
});
