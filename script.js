(() => {
  "use strict";

  const WEDDING = {
    year: 2027,
    month: 6,
    day: 26,
    hour: 15,
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

    const target = new Date(
      WEDDING.year,
      WEDDING.month - 1,
      WEDDING.day,
      WEDDING.hour,
      0,
      0
    ).getTime();
    const remaining = Math.max(0, target - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const daysEl = countdown.querySelector("[data-days], #count-days");
    const hoursEl = countdown.querySelector("[data-hours], #count-hours");
    const minutesEl = countdown.querySelector("[data-minutes], #count-minutes");
    const secondsEl = countdown.querySelector("[data-seconds], #count-seconds");
    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    daysEl.textContent = String(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);
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

  const markCurrentPage = () => {
    const file = (window.location.pathname.split("/").pop() || "home.html").toLowerCase();
    nav?.querySelectorAll("a[href]").forEach((link) => {
      const href = (link.getAttribute("href") || "").split("/").pop().toLowerCase();
      const isHome = file === "" || file === "index.html" || file === "home.html";
      if (href === file || (isHome && href === "home.html")) {
        link.setAttribute("aria-current", "page");
      }
    });
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

  const initPlacesMap = () => {
    const canvas = document.querySelector("#places-map");
    if (!canvas || typeof L === "undefined") return;

    const places = {
      casino: {
        title: "Roger Williams Casino",
        lat: 41.7864,
        lng: -71.4147,
        href: "https://www.google.com/maps/dir/?api=1&destination=Roger+Williams+Casino%2C+1000+Elmwood+Avenue%2C+Providence%2C+RI",
      },
      airport: {
        title: "T.F. Green Airport",
        lat: 41.7242,
        lng: -71.4281,
        href: "https://www.google.com/maps/dir/?api=1&destination=Rhode+Island+T.F.+Green+International+Airport%2C+Warwick%2C+RI",
      },
      station: {
        title: "Providence Station",
        lat: 41.8292,
        lng: -71.4133,
        href: "https://www.google.com/maps/dir/?api=1&destination=Providence+Station%2C+100+Gaspee+Street%2C+Providence%2C+RI",
      },
      hotel: {
        title: "Crowne Plaza",
        lat: 41.7142,
        lng: -71.4637,
        href: "https://www.google.com/maps/dir/?api=1&destination=Crowne+Plaza+Providence-Warwick%2C+801+Greenwich+Avenue%2C+Warwick%2C+RI",
      },
    };

    const map = L.map(canvas, {
      scrollWheelZoom: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const pinSvg =
      '<svg class="place-pin" viewBox="0 0 24 36" aria-hidden="true"><path fill="#e53935" d="M12 0C5.373 0 0 5.373 0 12c0 8.4 12 24 12 24s12-15.6 12-24C24 5.373 18.627 0 12 0z"/><circle fill="#fff" cx="12" cy="11.2" r="4.5"/></svg>';

    const pinIcon = L.divIcon({
      className: "place-pin-wrap",
      html: pinSvg,
      iconSize: [24, 36],
      iconAnchor: [12, 36],
    });

    const labelSide = {
      casino: "right",
      airport: "right",
      station: "right",
      hotel: "left",
    };

    const markers = {};
    const bounds = L.latLngBounds([]);

    Object.entries(places).forEach(([id, place]) => {
      const marker = L.marker([place.lat, place.lng], { icon: pinIcon, title: place.title }).addTo(map);

      marker.bindTooltip(
        `<a href="${place.href}" target="_blank" rel="noopener noreferrer">${place.title}</a>`,
        {
          permanent: true,
          interactive: true,
          direction: labelSide[id] || "right",
          offset: labelSide[id] === "left" ? [-6, -18] : [6, -18],
          className: "place-tooltip",
          opacity: 1,
        }
      );

      marker.on("click", () => {
        window.open(place.href, "_blank", "noopener,noreferrer");
      });

      marker.on("mouseover", () => setActivePlace(id));
      marker.on("mouseout", () => {
        if (!canvas.matches(":hover")) clearActivePlace();
      });

      markers[id] = marker;
      bounds.extend([place.lat, place.lng]);
    });

    const fitPlaces = () => {
      map.invalidateSize();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [86, 86], maxZoom: 11 });
      }
    };

    const setActivePlace = (id) => {
      canvas.querySelectorAll(".place-pin-wrap").forEach((pin) => pin.classList.remove("is-active"));
      markers[id]?.getElement()?.classList.add("is-active");
    };

    const clearActivePlace = () => {
      canvas.querySelectorAll(".place-pin-wrap").forEach((pin) => pin.classList.remove("is-active"));
    };

    fitPlaces();
    window.setTimeout(fitPlaces, 250);

    const mapBlock = canvas.closest(".places-map");
    if (mapBlock && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            window.setTimeout(fitPlaces, 60);
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(mapBlock);
    }
  };

  form?.addEventListener("submit", handleRsvp);
  window.addEventListener("scroll", updateHeader, { passive: true });

  markCurrentPage();
  updateHeader();
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
  observeReveals();
  initPlacesMap();
})();
