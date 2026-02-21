// Small polish: welcome animation
document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".dashboard-header");
  header.style.opacity = "0";
  header.style.transform = "translateY(20px)";

  setTimeout(() => {
    header.style.transition = "all 0.6s ease";
    header.style.opacity = "1";
    header.style.transform = "translateY(0)";
  }, 150);
});
