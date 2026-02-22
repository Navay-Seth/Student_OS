const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const taskTitle = document.getElementById("taskTitle");
const priority = document.getElementById("priority");

let tasks = getData("tasks");

function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach((task, index) => {
    const div = document.createElement("div");
    div.className = "task-item" + (task.done ? " done" : "");

    div.innerHTML = `
      <div class="task-left">
        <span class="task-title">${task.title}</span>
        <span class="task-priority priority-${task.priority.toLowerCase()}">${task.priority}</span>
      </div>
      <div class="task-actions">
        <button onclick="toggleTask(${index})">
          ${task.done ? "Undo" : "Done"}
        </button>
        <button class="task-delete" onclick="deleteTask(${index})">Delete</button>
      </div>
    `;

    taskList.appendChild(div);
  });
}

function toggleTask(index) {
  tasks[index].done = !tasks[index].done;
  saveData("tasks", tasks);
  renderTasks();
}

function deleteTask(index) {
  tasks.splice(index, 1);
  saveData("tasks", tasks);
  renderTasks();
}

taskForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const task = {
    title: taskTitle.value,
    priority: priority.value,
    done: false
  };

  tasks.push(task);
  saveData("tasks", tasks);
  renderTasks();
  taskForm.reset();
});

renderTasks();
