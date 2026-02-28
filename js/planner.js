const TASKS_KEY = "studentos_tasks";
const LEGACY_TASKS_KEY = "tasks";
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const priority = document.getElementById("priority");
const dueDate = document.getElementById("dueDate");

const overdueList = document.getElementById("overdueList");
const todayList = document.getElementById("todayList");
const upcomingList = document.getElementById("upcomingList");
const completedList = document.getElementById("completedList");

const overdueCount = document.getElementById("overdueCount");
const todayCount = document.getElementById("todayCount");
const upcomingCount = document.getElementById("upcomingCount");
const completedCount = document.getElementById("completedCount");
const dueDateError = document.getElementById("dueDateError");

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayISO() {
  return toISODate(new Date());
}

function isValidISODate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getPriority(value) {
  if (value === "High" || value === "Medium" || value === "Low") {
    return value;
  }
  return "Medium";
}

function getStorageTasks(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function normalizeTask(task) {
  const normalizedTitle = typeof task?.title === "string" ? task.title.trim() : "";
  const createdAt = typeof task?.createdAt === "string" ? task.createdAt : new Date().toISOString();

  return {
    id: typeof task?.id === "string" && task.id ? task.id : `task_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title: normalizedTitle,
    priority: getPriority(task?.priority),
    dueDate: isValidISODate(task?.dueDate) ? task.dueDate : getTodayISO(),
    createdAt: Number.isNaN(Date.parse(createdAt)) ? new Date().toISOString() : createdAt,
    completed: Boolean(task?.completed ?? task?.done)
  };
}

function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  localStorage.removeItem(LEGACY_TASKS_KEY);
}

function loadTasks() {
  const primaryTasks = getStorageTasks(TASKS_KEY);
  const legacyTasks = primaryTasks.length === 0 ? getStorageTasks(LEGACY_TASKS_KEY) : [];
  const source = primaryTasks.length > 0 ? primaryTasks : legacyTasks;

  const normalizedTasks = source
    .map((task) => normalizeTask(task))
    .filter((task) => task.title.length > 0);

  saveTasks(normalizedTasks);
  return normalizedTasks;
}

function compareTasks(a, b) {
  const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  if (a.dueDate !== b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate);
  }

  return a.createdAt.localeCompare(b.createdAt);
}

function daysLate(dueDateISO, todayISO) {
  const due = new Date(`${dueDateISO}T00:00:00`);
  const today = new Date(`${todayISO}T00:00:00`);
  const diffMs = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function formatDueDate(isoDate) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function createEmptyState(message) {
  const empty = document.createElement("p");
  empty.className = "task-empty";
  empty.textContent = message;
  return empty;
}

function createTaskCard(task, todayISO) {
  const item = document.createElement("div");
  item.className = `task-item${task.completed ? " done" : ""}`;

  const left = document.createElement("div");
  left.className = "task-left";

  const titleRow = document.createElement("div");
  titleRow.className = "task-title-row";

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;

  const badge = document.createElement("span");
  badge.className = `task-priority priority-${task.priority.toLowerCase()}`;
  badge.textContent = task.priority;

  const due = document.createElement("span");
  due.className = "task-due";
  due.textContent = `Due: ${formatDueDate(task.dueDate)}`;

  titleRow.appendChild(title);
  titleRow.appendChild(badge);
  left.appendChild(titleRow);
  left.appendChild(due);

  if (!task.completed && task.dueDate < todayISO) {
    const late = daysLate(task.dueDate, todayISO);
    const lateLabel = document.createElement("span");
    lateLabel.className = "task-late";
    lateLabel.textContent = `${late} day${late === 1 ? "" : "s"} late`;
    left.appendChild(lateLabel);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "task-toggle";
  toggleBtn.dataset.taskId = task.id;
  toggleBtn.textContent = task.completed ? "Undo" : "Done";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "task-delete";
  deleteBtn.dataset.taskId = task.id;
  deleteBtn.textContent = "Delete";

  actions.appendChild(toggleBtn);
  actions.appendChild(deleteBtn);

  item.appendChild(left);
  item.appendChild(actions);

  return item;
}

function renderSection(listElement, tasks, emptyMessage, todayISO) {
  listElement.innerHTML = "";

  if (tasks.length === 0) {
    listElement.appendChild(createEmptyState(emptyMessage));
    return;
  }

  tasks.forEach((task) => {
    listElement.appendChild(createTaskCard(task, todayISO));
  });
}

function renderPlanner() {
  const tasks = loadTasks();
  const todayISO = getTodayISO();

  const sections = {
    overdue: [],
    today: [],
    upcoming: [],
    completed: []
  };

  tasks.forEach((task) => {
    if (task.completed) {
      sections.completed.push(task);
      return;
    }

    if (task.dueDate < todayISO) {
      sections.overdue.push(task);
    } else if (task.dueDate === todayISO) {
      sections.today.push(task);
    } else {
      sections.upcoming.push(task);
    }
  });

  sections.overdue.sort(compareTasks);
  sections.today.sort(compareTasks);
  sections.upcoming.sort(compareTasks);
  sections.completed.sort(compareTasks);

  overdueCount.textContent = String(sections.overdue.length);
  todayCount.textContent = String(sections.today.length);
  upcomingCount.textContent = String(sections.upcoming.length);
  completedCount.textContent = String(sections.completed.length);

  renderSection(overdueList, sections.overdue, "No overdue tasks.", todayISO);
  renderSection(todayList, sections.today, "No tasks due today.", todayISO);
  renderSection(upcomingList, sections.upcoming, "No upcoming tasks.", todayISO);
  renderSection(completedList, sections.completed, "No completed tasks yet.", todayISO);
}

function toggleTask(taskId) {
  const tasks = loadTasks();
  const updatedTasks = tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      completed: !task.completed
    };
  });

  saveTasks(updatedTasks);
  renderPlanner();
}

function deleteTask(taskId) {
  const tasks = loadTasks();
  const updatedTasks = tasks.filter((task) => task.id !== taskId);
  saveTasks(updatedTasks);
  renderPlanner();
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const newTitle = taskTitle.value.trim();
  const todayISO = new Date().toISOString().split("T")[0];
  const selectedDueDate = dueDate.value;

  if (dueDateError) {
    dueDateError.textContent = "";
  }

  if (!newTitle) {
    return;
  }

  if (!isValidISODate(selectedDueDate)) {
    if (dueDateError) {
      dueDateError.textContent = "Please select a valid due date.";
    } else {
      alert("Please select a valid due date.");
    }
    return;
  }

  if (selectedDueDate < todayISO) {
    if (dueDateError) {
      dueDateError.textContent = "Due date cannot be earlier than today.";
    } else {
      alert("Due date cannot be earlier than today.");
    }
    return;
  }

  const tasks = loadTasks();
  tasks.push({
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `task_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    title: newTitle,
    priority: getPriority(priority.value),
    dueDate: selectedDueDate,
    createdAt: new Date().toISOString(),
    completed: false
  });

  saveTasks(tasks);
  taskForm.reset();
  dueDate.min = todayISO;
  dueDate.value = todayISO;
  renderPlanner();
});

document.addEventListener("click", (event) => {
  const toggleButton = event.target.closest(".task-toggle");
  if (toggleButton?.dataset.taskId) {
    toggleTask(toggleButton.dataset.taskId);
    return;
  }

  const deleteButton = event.target.closest(".task-delete");
  if (deleteButton?.dataset.taskId) {
    deleteTask(deleteButton.dataset.taskId);
  }
});

const initialTodayISO = new Date().toISOString().split("T")[0];
dueDate.min = initialTodayISO;
dueDate.value = initialTodayISO;
renderPlanner();
