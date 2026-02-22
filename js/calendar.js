const EVENTS_KEY = "calendarEvents";
const STUDIED_DATES_KEY = "studiedDates";

const monthLabel = document.getElementById("monthLabel");
const calendarGrid = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const eventForm = document.getElementById("eventForm");
const eventInput = document.getElementById("eventInput");
const eventList = document.getElementById("eventList");
const markStudiedBtn = document.getElementById("markStudiedBtn");
const currentStreakEl = document.getElementById("currentStreak");
const longestStreakEl = document.getElementById("longestStreak");

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let selectedDate = toISODate(today);

let eventsByDate = loadEvents();
let studiedDates = loadStudiedDates();

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromISODate(isoDate) {
  const parts = isoDate.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function loadEvents() {
  const raw = localStorage.getItem(EVENTS_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveEvents() {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(eventsByDate));
}

function loadStudiedDates() {
  const raw = localStorage.getItem(STUDIED_DATES_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStudiedDates() {
  localStorage.setItem(STUDIED_DATES_KEY, JSON.stringify(studiedDates));
}

function getMonthName(year, month) {
  return new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function renderCalendar() {
  monthLabel.textContent = getMonthName(currentYear, currentMonth);
  calendarGrid.innerHTML = "";

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < startWeekday; i += 1) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "calendar-cell empty";
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(currentYear, currentMonth, day);
    const isoDate = toISODate(date);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-cell";
    button.setAttribute("role", "gridcell");
    button.dataset.date = isoDate;

    if (isoDate === selectedDate) {
      button.classList.add("selected");
    }

    if (isoDate === toISODate(today)) {
      button.classList.add("today");
    }

    if (studiedDates.includes(isoDate)) {
      button.classList.add("studied");
    }

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = String(day);

    button.appendChild(dayNumber);

    const hasEvents = Array.isArray(eventsByDate[isoDate]) && eventsByDate[isoDate].length > 0;
    if (hasEvents) {
      const dot = document.createElement("span");
      dot.className = "event-dot";
      dot.setAttribute("aria-label", "Has events");
      button.appendChild(dot);
    }

    button.addEventListener("click", () => {
      selectedDate = isoDate;
      renderCalendar();
      renderEventsForSelectedDate();
    });

    calendarGrid.appendChild(button);
  }
}

function renderEventsForSelectedDate() {
  selectedDateLabel.textContent = `Events for ${selectedDate}`;
  eventList.innerHTML = "";

  const events = eventsByDate[selectedDate] || [];

  if (events.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "event-empty";
    emptyItem.textContent = "No events for this date yet.";
    eventList.appendChild(emptyItem);
    return;
  }

  events.forEach((eventText, index) => {
    const item = document.createElement("li");
    item.className = "event-item";

    const text = document.createElement("span");
    text.textContent = eventText;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "event-delete";
    removeBtn.textContent = "Delete";
    removeBtn.addEventListener("click", () => {
      eventsByDate[selectedDate].splice(index, 1);

      if (eventsByDate[selectedDate].length === 0) {
        delete eventsByDate[selectedDate];
      }

      saveEvents();
      renderCalendar();
      renderEventsForSelectedDate();
    });

    item.appendChild(text);
    item.appendChild(removeBtn);
    eventList.appendChild(item);
  });
}

function normalizeAndSortDates(dates) {
  const unique = Array.from(new Set(dates));
  unique.sort();
  return unique;
}

function getCurrentStreak(sortedDates, todayISO) {
  const dateSet = new Set(sortedDates);
  if (!dateSet.has(todayISO)) {
    return 0;
  }

  let streak = 0;
  let cursor = fromISODate(todayISO);

  while (dateSet.has(toISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getLongestStreak(sortedDates) {
  if (sortedDates.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i += 1) {
    const prevDate = fromISODate(sortedDates[i - 1]);
    const currentDate = fromISODate(sortedDates[i]);

    const diffMs = currentDate.getTime() - prevDate.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (diffMs === oneDayMs) {
      current += 1;
      if (current > longest) {
        longest = current;
      }
    } else {
      current = 1;
    }
  }

  return longest;
}

function renderStreakStats() {
  studiedDates = normalizeAndSortDates(studiedDates);
  saveStudiedDates();

  const todayISO = toISODate(today);
  const currentStreak = getCurrentStreak(studiedDates, todayISO);
  const longestStreak = getLongestStreak(studiedDates);

  currentStreakEl.textContent = `${currentStreak} day${currentStreak === 1 ? "" : "s"}`;
  longestStreakEl.textContent = `${longestStreak} day${longestStreak === 1 ? "" : "s"}`;
}

function markTodayStudied() {
  const todayISO = toISODate(today);

  if (!studiedDates.includes(todayISO)) {
    studiedDates.push(todayISO);
    saveStudiedDates();
  }

  renderCalendar();
  renderStreakStats();
}

prevMonthBtn.addEventListener("click", () => {
  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar();
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = eventInput.value.trim();
  if (!value) {
    return;
  }

  if (!Array.isArray(eventsByDate[selectedDate])) {
    eventsByDate[selectedDate] = [];
  }

  eventsByDate[selectedDate].push(value);
  saveEvents();

  eventInput.value = "";

  renderCalendar();
  renderEventsForSelectedDate();
});

markStudiedBtn.addEventListener("click", markTodayStudied);

renderCalendar();
renderEventsForSelectedDate();
renderStreakStats();
