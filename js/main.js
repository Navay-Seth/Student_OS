const DEFAULT_TIMER_MINUTES = 30;
const TIMER_MIN_MINUTES = 5;
const TIMER_MAX_MINUTES = 120;
const TIMER_SESSIONS_KEY = "pomodoroSessions";
const CGPA_HISTORY_KEY = "cgpaHistory";
const STUDIED_DATES_KEY = "studiedDates";
const TARGET_CGPA_KEY = "targetCgpa";
const SEMESTER_GPA_KEY = "semesterGpas";
const DEFAULT_TARGET_CGPA = 9.0;

let selectedDurationMinutes = DEFAULT_TIMER_MINUTES;
let timerSeconds = selectedDurationMinutes * 60;
let timerIntervalId = null;
let cgpaChart = null;
let weeklyChart = null;

function getSafeArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getSafeObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function getSafeNumber(key) {
  const raw = localStorage.getItem(key);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatDateShort(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStreak(studiedDates) {
  const unique = Array.from(new Set(studiedDates)).sort();
  if (unique.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const set = new Set(unique);
  let streak = 0;
  const cursor = new Date(today);

  while (set.has(toISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getUpcomingDeadlines() {
  const eventsByDate = getSafeObject("calendarEvents");
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const deadlines = [];

  Object.entries(eventsByDate).forEach(([dateKey, entries]) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return;
    }

    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime()) || date < now) {
      return;
    }

    const daysLeft = Math.round((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    let priority = "low";
    if (daysLeft <= 2) {
      priority = "high";
    } else if (daysLeft <= 5) {
      priority = "medium";
    }

    entries.forEach((title) => {
      deadlines.push({
        title,
        dateKey,
        daysLeft,
        priority
      });
    });
  });

  deadlines.sort((a, b) => {
    if (a.daysLeft === b.daysLeft) {
      return a.title.localeCompare(b.title);
    }
    return a.daysLeft - b.daysLeft;
  });

  return deadlines.slice(0, 6);
}

function getWeeklyStudyMinutes(studiedDates, completedSessions) {
  const studiedSet = new Set(studiedDates);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const labels = [];
  const values = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const isoDate = toISODate(date);
    const isToday = i === 0;

    const baseMinutes = studiedSet.has(isoDate) ? 90 : 0;
    const sessionMinutes = isToday ? completedSessions * 25 : 0;

    labels.push(date.toLocaleDateString(undefined, { weekday: "short" }));
    values.push(Math.min(baseMinutes + sessionMinutes, 180));
  }

  return { labels, values };
}

function getCgpaSeries(currentCgpa) {
  const semesterGpas = getSafeArray(SEMESTER_GPA_KEY)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 10)
    .slice(0, 12);

  if (semesterGpas.length > 0) {
    return {
      labels: semesterGpas.map((_, index) => `Sem ${index + 1}`),
      values: semesterGpas
    };
  }

  return {
    labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Current"],
    values: [7.1, 7.4, 7.8, 8.1, 8.3]
  };
}

function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDashboardData() {
  const tasks = getSafeArray("tasks");
  const doneTasks = tasks.filter((task) => task && task.done).length;
  const totalTasks = tasks.length;

  const studiedDates = getSafeArray(STUDIED_DATES_KEY);
  const streak = getStreak(studiedDates);

  const currentCgpa = getSafeNumber("cgpa");
  const storedTargetCgpa = getSafeNumber(TARGET_CGPA_KEY);
  const targetCgpa = Number.isFinite(storedTargetCgpa) && storedTargetCgpa >= 0 && storedTargetCgpa <= 10
    ? storedTargetCgpa
    : DEFAULT_TARGET_CGPA;
  const completedSessions = getSafeNumber(TIMER_SESSIONS_KEY);
  const pomodoroSessions = Number.isFinite(completedSessions) ? completedSessions : 0;

  const studyHours = ((studiedDates.length * 1.5) + ((pomodoroSessions * 25) / 60)).toFixed(1);

  const deadlines = getUpcomingDeadlines();

  const goals = [
    {
      title: "Task Completion",
      progress: totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0,
      meta: `${doneTasks}/${totalTasks || 0} tasks done`
    },
    {
      title: "Study Consistency",
      progress: clampPercent((streak / 7) * 100),
      meta: `${streak} day streak`
    },
    {
      title: `CGPA Target ${targetCgpa.toFixed(1)}`,
      progress: Number.isFinite(currentCgpa) && targetCgpa > 0 ? clampPercent((currentCgpa / targetCgpa) * 100) : 0,
      meta: Number.isFinite(currentCgpa)
        ? `Current ${currentCgpa.toFixed(2)} / Target ${targetCgpa.toFixed(2)}`
        : "Set CGPA in Academics"
    }
  ];

  const statCards = [
    {
      label: "Study Time",
      value: `${studyHours}h`,
      icon: "clock-3",
      foot: "From study streak + pomodoro sessions"
    },
    {
      label: "Tasks Done",
      value: String(doneTasks),
      icon: "check-circle-2",
      foot: `${totalTasks} total tasks`
    },
    {
      label: "CGPA",
      value: Number.isFinite(currentCgpa) ? currentCgpa.toFixed(2) : "--",
      icon: "graduation-cap",
      foot: "Academic performance tracker"
    }
  ];

  return {
    statCards,
    deadlines,
    goals,
    studiedDates,
    pomodoroSessions,
    currentCgpa,
    streak
  };
}

function createStatCard(card) {
  const article = document.createElement("article");
  article.className = "stat-card";
  article.innerHTML = `
    <div class="stat-top">
      <span class="stat-label">${card.label}</span>
      <i data-lucide="${card.icon}" class="stat-icon"></i>
    </div>
    <p class="stat-value">${card.value}</p>
    <p class="stat-foot">${card.foot}</p>
  `;
  return article;
}

function renderQuickStats(statCards) {
  const grid = document.getElementById("quickStatsGrid");
  if (!grid) {
    return;
  }

  grid.innerHTML = "";
  statCards.forEach((card) => {
    grid.appendChild(createStatCard(card));
  });
}

function renderDeadlines(deadlines) {
  const list = document.getElementById("deadlineList");
  if (!list) {
    return;
  }

  if (deadlines.length === 0) {
    list.innerHTML = '<li class="deadline-empty">No upcoming deadlines. Add events in Calendar.</li>';
    return;
  }

  list.innerHTML = "";
  deadlines.forEach((item) => {
    const li = document.createElement("li");
    li.className = "deadline-item";

    const main = document.createElement("div");
    main.className = "deadline-main";

    const title = document.createElement("span");
    title.className = "deadline-title";
    title.textContent = item.title;

    const date = document.createElement("span");
    date.className = "deadline-date";
    date.textContent = `${formatDateShort(item.dateKey)} - ${item.daysLeft} day${item.daysLeft === 1 ? "" : "s"} left`;

    main.appendChild(title);
    main.appendChild(date);

    const priority = document.createElement("span");
    priority.className = `priority-tag priority-${item.priority}`;
    priority.textContent = item.priority;

    li.appendChild(main);
    li.appendChild(priority);
    list.appendChild(li);
  });
}

function renderGoals(goals) {
  const container = document.getElementById("goalsList");
  if (!container) {
    return;
  }

  container.innerHTML = "";
  goals.forEach((goal) => {
    const percent = clampPercent(goal.progress);
    const item = document.createElement("article");
    item.className = "goal-item";
    item.innerHTML = `
      <div class="goal-row">
        <span class="goal-title">${goal.title}</span>
        <span class="goal-meta">${percent}%</span>
      </div>
      <div class="goal-track">
        <div class="goal-fill" style="width: ${percent}%"></div>
      </div>
      <div class="goal-row">
        <span class="goal-meta">${goal.meta}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderStreakBadge(streak) {
  const streakBadge = document.getElementById("streakBadge");
  if (!streakBadge) {
    return;
  }
  streakBadge.innerHTML = `<i data-lucide="flame"></i>${streak} day streak`;
}

function renderTimerState() {
  const timerDisplay = document.getElementById("timerDisplay");
  const sessionInfo = document.getElementById("timerSessionInfo");
  const startBtn = document.getElementById("timerStartBtn");
  const durationLabel = document.getElementById("timerDurationLabel");
  const customInput = document.getElementById("timerCustomMinutes");
  const presetButtons = document.querySelectorAll(".timer-preset");

  if (!timerDisplay || !sessionInfo || !startBtn || !durationLabel || !customInput) {
    return;
  }

  const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const seconds = String(timerSeconds % 60).padStart(2, "0");
  const isRunning = Boolean(timerIntervalId);

  timerDisplay.textContent = `${minutes}:${seconds}`;
  sessionInfo.textContent = `Completed sessions today: ${getSafeNumber(TIMER_SESSIONS_KEY) || 0}`;
  startBtn.textContent = isRunning ? "Pause" : "Start";
  durationLabel.textContent = `Pomodoro ${selectedDurationMinutes} min`;
  customInput.value = String(selectedDurationMinutes);
  customInput.disabled = isRunning;

  presetButtons.forEach((button) => {
    const minutesValue = Number(button.dataset.minutes);
    button.classList.toggle("active", minutesValue === selectedDurationMinutes);
    button.disabled = isRunning;
  });
}

function resetTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  timerSeconds = selectedDurationMinutes * 60;
  renderTimerState();
}

function onTimerComplete() {
  const current = getSafeNumber(TIMER_SESSIONS_KEY);
  const sessions = Number.isFinite(current) ? current + 1 : 1;
  localStorage.setItem(TIMER_SESSIONS_KEY, String(sessions));

  resetTimer();
  refreshDashboard();
}

function toggleTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    renderTimerState();
    return;
  }

  timerIntervalId = setInterval(() => {
    if (timerSeconds <= 1) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
      onTimerComplete();
      return;
    }

    timerSeconds -= 1;
    renderTimerState();
  }, 1000);

  renderTimerState();
}

function setTimerInputError(message) {
  const errorEl = document.getElementById("timerInputError");
  if (!errorEl) {
    return;
  }
  errorEl.textContent = message;
}

function setTimerDuration(minutes) {
  selectedDurationMinutes = minutes;
  timerSeconds = selectedDurationMinutes * 60;
  setTimerInputError("");
  renderTimerState();
}

function handlePresetClick(event) {
  const button = event.currentTarget;
  const minutes = Number(button.dataset.minutes);
  if (!Number.isFinite(minutes) || timerIntervalId) {
    return;
  }
  setTimerDuration(minutes);
}

function validateCustomMinutes(value) {
  if (!Number.isInteger(value)) {
    return `Enter a whole number between ${TIMER_MIN_MINUTES} and ${TIMER_MAX_MINUTES}.`;
  }
  if (value < TIMER_MIN_MINUTES || value > TIMER_MAX_MINUTES) {
    return `Choose between ${TIMER_MIN_MINUTES} and ${TIMER_MAX_MINUTES} minutes.`;
  }
  return "";
}

function handleCustomInputCommit() {
  if (timerIntervalId) {
    return;
  }

  const customInput = document.getElementById("timerCustomMinutes");
  if (!customInput) {
    return;
  }

  const parsed = Number(customInput.value);
  const validationMessage = validateCustomMinutes(parsed);
  if (validationMessage) {
    setTimerInputError(validationMessage);
    customInput.value = String(selectedDurationMinutes);
    return;
  }

  setTimerDuration(parsed);
}

function bindTimer() {
  const startBtn = document.getElementById("timerStartBtn");
  const resetBtn = document.getElementById("timerResetBtn");
  const customInput = document.getElementById("timerCustomMinutes");
  const presetButtons = document.querySelectorAll(".timer-preset");

  if (startBtn) {
    startBtn.addEventListener("click", toggleTimer);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetTimer);
  }

  presetButtons.forEach((button) => {
    button.addEventListener("click", handlePresetClick);
  });

  if (customInput) {
    customInput.addEventListener("change", handleCustomInputCommit);
    customInput.addEventListener("blur", handleCustomInputCommit);
  }

  renderTimerState();
}

function getChartPalette() {
  if (document.body.classList.contains("dark")) {
    return {
      text: "#cbd5e1",
      grid: "rgba(148, 163, 184, 0.25)",
      cgpaBorder: "#60a5fa",
      cgpaFill: "rgba(96, 165, 250, 0.22)",
      weeklyBar: "rgba(56, 189, 248, 0.75)",
      weeklyBarHover: "rgba(14, 165, 233, 0.9)"
    };
  }

  return {
    text: "#334155",
    grid: "rgba(148, 163, 184, 0.25)",
    cgpaBorder: "#2563eb",
    cgpaFill: "rgba(37, 99, 235, 0.16)",
    weeklyBar: "rgba(14, 165, 233, 0.75)",
    weeklyBarHover: "rgba(2, 132, 199, 0.82)"
  };
}

function renderCgpaChart(currentCgpa) {
  const canvas = document.getElementById("cgpaTrendChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  const series = getCgpaSeries(currentCgpa);
  const palette = getChartPalette();

  if (cgpaChart) {
    cgpaChart.destroy();
  }

  cgpaChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: series.labels,
      datasets: [{
        label: "CGPA",
        data: series.values,
        borderColor: palette.cgpaBorder,
        backgroundColor: palette.cgpaFill,
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 1,
            color: palette.text
          },
          grid: {
            color: palette.grid
          }
        },
        x: {
          ticks: {
            color: palette.text
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function renderWeeklyChart(studiedDates, pomodoroSessions) {
  const canvas = document.getElementById("weeklyProgressChart");
  if (!canvas || typeof Chart === "undefined") {
    return;
  }

  const weekly = getWeeklyStudyMinutes(studiedDates, pomodoroSessions);
  const palette = getChartPalette();

  if (weeklyChart) {
    weeklyChart.destroy();
  }

  weeklyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: weekly.labels,
      datasets: [{
        label: "Minutes",
        data: weekly.values,
        borderRadius: 10,
        backgroundColor: palette.weeklyBar,
        hoverBackgroundColor: palette.weeklyBarHover
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 180,
          ticks: {
            color: palette.text
          },
          grid: {
            color: palette.grid
          }
        },
        x: {
          ticks: {
            color: palette.text
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function animateReveal() {
  const sections = document.querySelectorAll(".reveal");
  sections.forEach((section, index) => {
    setTimeout(() => {
      section.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      section.style.opacity = "1";
      section.style.transform = "translateY(0)";
    }, 100 + index * 100);
  });
}

function refreshDashboard() {
  const data = getDashboardData();

  renderStreakBadge(data.streak);
  renderQuickStats(data.statCards);
  renderDeadlines(data.deadlines);
  renderGoals(data.goals);
  renderTimerState();
  renderCgpaChart(data.currentCgpa);
  renderWeeklyChart(data.studiedDates, data.pomodoroSessions);

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  animateReveal();
  bindTimer();
  refreshDashboard();
});

document.addEventListener("studentos:theme-change", () => {
  const data = getDashboardData();
  renderCgpaChart(data.currentCgpa);
  renderWeeklyChart(data.studiedDates, data.pomodoroSessions);
});
