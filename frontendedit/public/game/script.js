const allTaskOptions = [
  { title: "Drink 2 glasses of water", points: 10 },
  { title: "Take a 10-minute walk", points: 15 },
  { title: "Do a 1-minute breathing exercise", points: 12 },
  { title: "Log your mood", points: 8 },
  { title: "Stretch for 5 minutes", points: 10 },
  { title: "Read one wellness tip", points: 7 },
  { title: "Take a screen break", points: 9 },
  { title: "Write one thing you are grateful for", points: 11 }
];

let score = 0;
let streak = 0;
let level = 1;
let day = 1;
let tasks = [];
let historyData = [];

const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const levelEl = document.getElementById("level");
const dayEl = document.getElementById("day");
const messageEl = document.getElementById("message");
const taskContainer = document.getElementById("taskContainer");
const progressFill = document.getElementById("progressFill");
const badgeArea = document.getElementById("badgeArea");
const newDayBtn = document.getElementById("newDayBtn");
const resetBtn = document.getElementById("resetBtn");

const celebrationEl = document.getElementById("celebration");
const celebrationTitleEl = document.getElementById("celebrationTitle");
const celebrationTextEl = document.getElementById("celebrationText");

const chartCanvas = document.getElementById("progressChart");
const ctx = chartCanvas.getContext("2d");

function getRandomTasks(count = 3) {
  const shuffled = [...allTaskOptions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(task => ({
    ...task,
    completed: false
  }));
}

function renderTasks() {
  taskContainer.innerHTML = "";

  tasks.forEach((task, index) => {
    const card = document.createElement("div");
    card.className = "task-card" + (task.completed ? " completed" : "");

    card.innerHTML = `
      <div class="task-title">${task.title}</div>
      <div class="task-points">+${task.points} pts</div>
      <div class="task-status">${task.completed ? "✓ Completed" : "Click to complete"}</div>
    `;

    card.addEventListener("click", () => completeTask(index));
    taskContainer.appendChild(card);
  });

  updateProgress();
}

function completeTask(index) {
  if (tasks[index].completed) return;

  tasks[index].completed = true;
  score += tasks[index].points;

  if (score >= level * 40) {
    level++;
    messageEl.textContent = `Great work! You reached Level ${level}. Keep going!`;
  } else {
    messageEl.textContent = getEncouragement();
  }

  renderStats();
  renderTasks();

  if (tasks.every(task => task.completed)) {
    streak++;
    renderStats();
    showBadgeIfNeeded();
    messageEl.textContent = `Awesome! You completed Day ${day}. Your streak is now ${streak}. Click "Start Next Day".`;
  }
}

function updateProgress() {
  const completedCount = tasks.filter(task => task.completed).length;
  const percent = (completedCount / tasks.length) * 100;
  progressFill.style.width = percent + "%";
}

function renderStats() {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  levelEl.textContent = level;
  dayEl.textContent = day;
}

function startDay() {
  tasks = getRandomTasks(3);
  renderTasks();
  renderStats();
  messageEl.textContent = `Day ${day}: Complete your wellness tasks and keep your streak alive.`;
}

function nextDay() {
  const completedCount = tasks.filter(task => task.completed).length;
  historyData.push(completedCount);

  if (historyData.length > 7) {
    historyData.shift();
  }

  drawChart();

  const allDone = tasks.length > 0 && tasks.every(task => task.completed);

  if (!allDone) {
    streak = 0;
    day++;
    messageEl.textContent = "You moved to the next day without finishing all tasks, so your streak reset to 0.";
  } else {
    day++;
  }

  renderStats();
  startDay();
}

function resetGame() {
  score = 0;
  streak = 0;
  level = 1;
  day = 1;
  tasks = [];
  historyData = [];
  badgeArea.innerHTML = "";
  drawChart();
  startDay();
  messageEl.textContent = "Game reset. Start building your streak again!";
}

function showBadgeIfNeeded() {
  let badgeText = "";

  if (streak === 3) badgeText = "🥉 Bronze Wellness Badge";
  else if (streak === 5) badgeText = "🥈 Silver Wellness Badge";
  else if (streak === 7) badgeText = "🥇 Gold Wellness Badge";

  if (badgeText) {
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = "Unlocked: " + badgeText;
    badgeArea.appendChild(badge);

    showCelebration("🎉 Badge Unlocked!", `You earned the ${badgeText}!`);
  }
}

function showCelebration(title, text) {
  celebrationTitleEl.textContent = title;
  celebrationTextEl.textContent = text;
  celebrationEl.classList.remove("hidden");

  for (let i = 0; i < 25; i++) {
    const sparkle = document.createElement("div");
    sparkle.className = "sparkle";

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    sparkle.style.left = centerX + "px";
    sparkle.style.top = centerY + "px";

    const dx = (Math.random() - 0.5) * 500 + "px";
    const dy = (Math.random() - 0.5) * 400 + "px";

    sparkle.style.setProperty("--dx", dx);
    sparkle.style.setProperty("--dy", dy);

    const colors = ["#818cf8", "#a78bfa", "#c4b5fd", "#6366f1", "#ddd6fe"];
    sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];

    document.body.appendChild(sparkle);

    setTimeout(() => sparkle.remove(), 1000);
  }

  setTimeout(() => {
    celebrationEl.classList.add("hidden");
  }, 1800);
}

function getEncouragement() {
  const messages = [
    "Nice job. Small steps build strong habits.",
    "You are making progress today.",
    "Great work. Consistency matters.",
    "You are one step closer to your next badge.",
    "Healthy habits grow day by day."
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function drawChart() {
  const width = chartCanvas.width;
  const height = chartCanvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 50;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  ctx.strokeStyle = "#e0e7ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(paddingLeft, paddingTop);
  ctx.lineTo(paddingLeft, paddingTop + chartHeight);
  ctx.lineTo(paddingLeft + chartWidth, paddingTop + chartHeight);
  ctx.stroke();

  for (let i = 0; i <= 3; i++) {
    const y = paddingTop + chartHeight - (i / 3) * chartHeight;

    ctx.strokeStyle = "#f5f3ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + chartWidth, y);
    ctx.stroke();

    ctx.fillStyle = "#6b7280";
    ctx.font = "14px Inter, Arial";
    ctx.fillText(i.toString(), paddingLeft - 20, y + 5);
  }

  if (historyData.length === 0) {
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "18px Inter, Arial";
    ctx.fillText("No daily history yet. Complete a day to see your chart.", 160, 150);
    return;
  }

  const barCount = historyData.length;
  const gap = 20;
  const barWidth = Math.min(70, (chartWidth - gap * (barCount + 1)) / barCount);

  historyData.forEach((value, index) => {
    const x = paddingLeft + gap + index * (barWidth + gap);
    const barHeight = (value / 3) * chartHeight;
    const y = paddingTop + chartHeight - barHeight;

    const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
    grad.addColorStop(0, "#818cf8");
    grad.addColorStop(1, "#a78bfa");
    ctx.fillStyle = grad;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barWidth, barHeight, [6, 6, 0, 0]);
    } else {
      ctx.rect(x, y, barWidth, barHeight);
    }
    ctx.fill();

    ctx.fillStyle = "#6b7280";
    ctx.font = "14px Inter, Arial";
    ctx.fillText(`D${index + 1}`, x + 18, paddingTop + chartHeight + 25);

    ctx.fillStyle = "#4f46e5";
    ctx.font = "bold 14px Inter, Arial";
    ctx.fillText(value.toString(), x + 28, y - 8);
  });
}

newDayBtn.addEventListener("click", nextDay);
resetBtn.addEventListener("click", resetGame);

drawChart();
startDay();
