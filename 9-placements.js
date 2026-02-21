// ===== PLACEMENT ELEMENTS =====
const placementForm = document.getElementById("placementForm");
const placementList = document.getElementById("placementList");

const company = document.getElementById("company");
const role = document.getElementById("role");
const type = document.getElementById("type");
const status = document.getElementById("status");
const resumeFile = document.getElementById("resumeFile");

// Load existing placements
let placements = getData("placements");

// ===== RENDER PLACEMENTS (LEFT–RIGHT WITH RESUME VIEW) =====
function renderPlacements() {
  placementList.innerHTML = "";

  placements.forEach((p, index) => {
    const div = document.createElement("div");
    div.className = "placement-item";

    div.innerHTML = `
      <span class="close-btn" data-index="${index}">✖</span>

      <div class="placement-left">
        <strong>${p.company}</strong> — ${p.role}<br>
        Type: ${p.type} | Status: ${p.status}
      </div>

      <div class="placement-right">
        <span class="resume-label">Resume</span><br>
        <strong>${p.resumeName}</strong><br>
        <a href="${p.resumeURL}" target="_blank">View</a>
      </div>
    `;

    placementList.appendChild(div);
  });

  // Attach delete handlers
  document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      const index = this.getAttribute("data-index");
      placements.splice(index, 1);
      saveData("placements", placements);
      renderPlacements();
    });
  });
}


// ===== ADD PLACEMENT WITH RESUME UPLOAD =====
placementForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const file = resumeFile.files[0];

  if (!file) {
    alert("Please upload a resume PDF.");
    return;
  }

  const resumeURL = URL.createObjectURL(file);

  const placement = {
    company: company.value,
    role: role.value,
    type: type.value,
    status: status.value,
    resumeName: file.name,
    resumeURL: resumeURL
  };

  placements.push(placement);
  saveData("placements", placements);
  renderPlacements();
  placementForm.reset();
});

// ===== INITIAL LOAD =====
renderPlacements();
