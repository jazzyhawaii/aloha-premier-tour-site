// Aloha Premier Tour — shared site behavior (no backend; concept-stage mockups only)

document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  // header condense on scroll
  const onScroll = () => {
    if (window.scrollY > 40) {
      header?.classList.add("is-scrolled");
    } else {
      header?.classList.remove("is-scrolled");
    }
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // mobile nav toggle
  toggle?.addEventListener("click", () => {
    nav?.classList.toggle("is-open");
    document.body.classList.toggle("nav-open");
    toggle.setAttribute(
      "aria-expanded",
      nav?.classList.contains("is-open") ? "true" : "false"
    );
  });
  nav?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    })
  );

  // scroll-reveal
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // active nav link by current page
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a[data-nav]").forEach((a) => {
    if (a.dataset.nav === path) a.classList.add("active");
  });

  // Inquiry form: no submission endpoint is wired up yet. Validation runs
  // for real, but on a valid submit we show an honest "not connected yet"
  // notice rather than a fake success message. Replace this with a real
  // fetch() to a working endpoint (and proper loading/error states) once
  // one exists.
  const form = document.getElementById("inquiry-form");
  const pendingNotice = document.getElementById("inquiry-success");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      form.classList.add("is-hidden");
      pendingNotice?.classList.add("is-visible");
      pendingNotice?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
});
