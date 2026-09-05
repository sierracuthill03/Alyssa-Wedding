(() => {
  "use strict";

  const WEDDING = {
    date: "2027-09-12T16:00:00",
    rsvpEmail: "hello@example.com",
  };

  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const countdown = document.querySelector("[data-countdown]");
  const form = document.querySelector("[data-rsvp-form]");
  const status = document.querySelector("[data-form-status]");

  const pad = (value) => String(value).padStart(2, "0");

  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  const setNavOpen = (open) => {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
  };

  const updateCountdown = () => {
    if (!countdown) return;

    const target = new Date(WEDDING.date).getTime();
    const remaining = Math.max(0, target - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdown.querySelector("[data-days]").textContent = pad(days);
    countdown.querySelector("[data-hours]").textContent = pad(hours);
    countdown.querySelector("[data-minutes]").textContent = pad(minutes);
    countdown.querySelector("[data-seconds]").textContent = pad(seconds);
  };

  const observeReveals = () => {
    const items = document.querySelectorAll(".reveal");
    if (!items.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((item) => observer.observe(item));
  };

  const showStatus = (message, tone = "ok") => {
    if (!status) return;
    status.hidden = false;
    status.dataset.tone = tone;
    status.textContent = message;
  };

  const handleRsvp = (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const attending = String(data.get("attending") || "").trim();
    const guests = String(data.get("guests") || "1").trim();
    const message = String(data.get("message") || "").trim();

    if (!name || !email || !attending) {
      showStatus("Please add your name, email, and whether you can attend.", "error");
      return;
    }

    const subject = `Wedding RSVP — ${name}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Attending: ${attending}`,
      `Number of guests: ${guests}`,
      message ? `Note: ${message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const mailto = `mailto:${WEDDING.rsvpEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    showStatus("Your email app should open next. If it does not, write us directly at " + WEDDING.rsvpEmail + ".");
  };

  navToggle?.addEventListener("click", () => {
    setNavOpen(!nav.classList.contains("is-open"));
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setNavOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNavOpen(false);
  });

  form?.addEventListener("submit", handleRsvp);
  window.addEventListener("scroll", updateHeader, { passive: true });

  updateHeader();
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
  observeReveals();
})();
