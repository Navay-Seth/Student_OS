document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("overlay");
  const mobileQuery = window.matchMedia("(max-width: 768px)");

  if (!menuToggle || !sidebar || !overlay) {
    return;
  }

  const setSidebarState = (isOpen) => {
    sidebar.classList.toggle("active", isOpen);
    overlay.classList.toggle("active", isOpen);

    if (mobileQuery.matches && isOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = !sidebar.classList.contains("active");
    setSidebarState(isOpen);
  });

  overlay.addEventListener("click", () => {
    setSidebarState(false);
  });

  mobileQuery.addEventListener("change", (event) => {
    if (!event.matches) {
      setSidebarState(false);
    }
  });
});
