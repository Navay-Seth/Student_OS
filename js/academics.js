const cgpaForm = document.getElementById("cgpaForm");
const cgpaInput = document.getElementById("cgpa");
const cgpaInfo = document.getElementById("cgpaInfo");
const targetCgpaForm = document.getElementById("targetCgpaForm");
const targetCgpaInput = document.getElementById("targetCgpa");
const targetCgpaInfo = document.getElementById("targetCgpaInfo");
const quickCgpaForm = document.getElementById("quickCgpaForm");
const oldCreditsInput = document.getElementById("oldCredits");
const oldCgpaInput = document.getElementById("oldCgpa");
const currentCreditsInput = document.getElementById("currentCredits");
const currentGpaInput = document.getElementById("currentGpa");
const quickCgpaInfo = document.getElementById("quickCgpaInfo");
const form = document.getElementById("subjectForm");
const list = document.getElementById("subjectList");
const subjectName = document.getElementById("subjectName");
const attendance = document.getElementById("attendance");
const progress = document.getElementById("progress");

const TARGET_CGPA_KEY = "targetCgpa";
const DEFAULT_TARGET_CGPA = 9.0;
const MIN_CGPA = 0;
const MAX_CGPA = 10;

let cgpa = parseCgpaValue(localStorage.getItem("cgpa"));
let subjects = getData("subjects");

function parseCgpaValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_CGPA || parsed > MAX_CGPA) {
    return NaN;
  }
  return parsed;
}

function formatCgpa(value) {
  return Number(value).toFixed(2);
}

function setCgpa(value) {
  cgpa = value;
  localStorage.setItem("cgpa", formatCgpa(value));
  cgpaInfo.innerText = `Current CGPA: ${formatCgpa(value)}`;
}

function renderSubjects() {
  list.innerHTML = "";

  subjects.forEach((subject, index) => {
    const div = document.createElement("div");
    div.className = "subject-item";

    let warning = "";
    if (subject.attendance < 75 && (!Number.isFinite(cgpa) || cgpa < 9.0)) {
      warning = '<span class="warning">Warning: Low attendance</span>';
    }

    div.innerHTML = `
      <div class="subject-item-top">
        <strong class="subject-name">${subject.name}</strong>
        <button class="subject-delete" onclick="deleteSubject(${index})">Delete</button>
      </div>
      <p class="subject-meta">Attendance: ${subject.attendance}% ${warning}</p>
      <p class="subject-meta">Syllabus Progress: ${subject.progress}%</p>
    `;

    list.appendChild(div);
  });
}

function deleteSubject(index) {
  subjects.splice(index, 1);
  saveData("subjects", subjects);
  renderSubjects();
}

function setTargetCgpaInfo(value) {
  targetCgpaInfo.innerText = `Target CGPA: ${formatCgpa(value)}`;
}

function initCgpaSection() {
  if (Number.isFinite(cgpa)) {
    cgpaInfo.innerText = `Current CGPA: ${formatCgpa(cgpa)}`;
    cgpaInput.value = formatCgpa(cgpa);
  }

  cgpaForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const parsedCgpa = parseCgpaValue(cgpaInput.value);
    if (!Number.isFinite(parsedCgpa)) {
      cgpaInput.setCustomValidity("Enter a value between 0 and 10.");
      cgpaInput.reportValidity();
      return;
    }

    cgpaInput.setCustomValidity("");
    setCgpa(parsedCgpa);
    cgpaForm.reset();
    renderSubjects();
  });
}

function initTargetCgpaSection() {
  if (!targetCgpaForm || !targetCgpaInput || !targetCgpaInfo) {
    return;
  }

  const storedTarget = parseCgpaValue(localStorage.getItem(TARGET_CGPA_KEY));
  const targetValue = Number.isFinite(storedTarget) ? storedTarget : DEFAULT_TARGET_CGPA;
  targetCgpaInput.value = formatCgpa(targetValue);
  setTargetCgpaInfo(targetValue);

  targetCgpaInput.addEventListener("input", () => {
    targetCgpaInput.setCustomValidity("");
  });

  targetCgpaForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const parsedTarget = parseCgpaValue(targetCgpaInput.value);
    if (!Number.isFinite(parsedTarget)) {
      targetCgpaInput.setCustomValidity("Enter a value between 0 and 10.");
      targetCgpaInput.reportValidity();
      return;
    }

    targetCgpaInput.setCustomValidity("");
    localStorage.setItem(TARGET_CGPA_KEY, parsedTarget.toString());
    setTargetCgpaInfo(parsedTarget);
    targetCgpaInput.value = formatCgpa(parsedTarget);
  });
}

function parseNonNegativeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

function initQuickCgpaCalculator() {
  if (!quickCgpaForm || !oldCreditsInput || !oldCgpaInput || !currentCreditsInput || !currentGpaInput || !quickCgpaInfo) {
    return;
  }

  quickCgpaForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const oldCredits = parseNonNegativeNumber(oldCreditsInput.value);
    const currentCredits = parseNonNegativeNumber(currentCreditsInput.value);
    const oldCgpa = parseCgpaValue(oldCgpaInput.value);
    const currentGpa = parseCgpaValue(currentGpaInput.value);

    if (!Number.isFinite(oldCredits)) {
      oldCreditsInput.setCustomValidity("Enter credits as a non-negative number.");
      oldCreditsInput.reportValidity();
      return;
    }
    oldCreditsInput.setCustomValidity("");

    if (!Number.isFinite(currentCredits)) {
      currentCreditsInput.setCustomValidity("Enter credits as a non-negative number.");
      currentCreditsInput.reportValidity();
      return;
    }
    currentCreditsInput.setCustomValidity("");

    if (!Number.isFinite(oldCgpa)) {
      oldCgpaInput.setCustomValidity("Enter a CGPA between 0 and 10.");
      oldCgpaInput.reportValidity();
      return;
    }
    oldCgpaInput.setCustomValidity("");

    if (!Number.isFinite(currentGpa)) {
      currentGpaInput.setCustomValidity("Enter a GPA between 0 and 10.");
      currentGpaInput.reportValidity();
      return;
    }
    currentGpaInput.setCustomValidity("");

    const totalCredits = oldCredits + currentCredits;
    if (totalCredits <= 0) {
      quickCgpaInfo.innerText = "Enter credits greater than zero to calculate.";
      return;
    }

    const predictedCgpa = ((oldCgpa * oldCredits) + (currentGpa * currentCredits)) / totalCredits;
    quickCgpaInfo.innerText = `Your predicted CGPA: ${formatCgpa(predictedCgpa)}`;
  });
}

form.addEventListener("submit", (e) => {
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

renderSubjects();
initCgpaSection();
initTargetCgpaSection();
initQuickCgpaCalculator();

window.deleteSubject = deleteSubject;
