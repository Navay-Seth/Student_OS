const cgpaForm = document.getElementById("cgpaForm");
const cgpaInput = document.getElementById("cgpa");
const cgpaInfo = document.getElementById("cgpaInfo");

let cgpa = localStorage.getItem("cgpa");
// Get elements
const form = document.getElementById("subjectForm");
const list = document.getElementById("subjectList");
const subjectName = document.getElementById("subjectName");
const attendance = document.getElementById("attendance");
const progress = document.getElementById("progress");

// Load existing subjects
let subjects = getData("subjects");

// Render subjects on page
function renderSubjects() {
  list.innerHTML = "";

  subjects.forEach((subject, index) => {
    const div = document.createElement("div");
    div.className = "subject-item";

    let warning = "";
    if (subject.attendance < 75 && (!cgpa || cgpa < 9.0)) {
      warning = `<span class="warning">⚠️ Low attendance</span>`;
    }

    div.innerHTML = `
      <strong>${subject.name}</strong><br>
      Attendance: ${subject.attendance}% ${warning}<br>
      Syllabus Progress: ${subject.progress}%<br><br>
      <button onclick="deleteSubject(${index})">Delete</button>
    `;

    list.appendChild(div);
  });
}


// Handle form submit
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const subject = {
    name: subjectName.value,
    attendance: attendance.value,
    progress: progress.value
  };

  subjects.push(subject);
  saveData("subjects", subjects);
  renderSubjects();
  form.reset();
});

// Initial render
renderSubjects();

function deleteSubject(index) {
  subjects.splice(index, 1);
  saveData("subjects", subjects);
  renderSubjects();
}

if (cgpa) {
  cgpaInfo.innerText = `Current CGPA: ${cgpa}`;
}

cgpaForm.addEventListener("submit", function (e) {
  e.preventDefault();
  cgpa = cgpaInput.value;
  localStorage.setItem("cgpa", cgpa);
  cgpaInfo.innerText = `Current CGPA: ${cgpa}`;
  cgpaForm.reset();
  renderSubjects(); // re-check warnings
});
