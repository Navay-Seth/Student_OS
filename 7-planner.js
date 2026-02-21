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
      <span>
        <strong>${task.title}</strong> (${task.priority})
      </span>
      <button onclick="toggleTask(${index})">
        ${task.done ? "Undo" : "Done"}
      </button>
    `;

    taskList.appendChild(div);
  });
}

function toggleTask(index) {
  tasks[index].done = !tasks[index].done;
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
