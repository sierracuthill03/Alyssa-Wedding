(() => {
  "use strict";

  const WEDDING = {
    year: 2027,
    month: 6,
    day: 26,
    hour: 15,
    rsvpEmail: "hello@example.com",
    rsvpScriptUrl: "https://script.google.com/macros/s/AKfycbxTchLTXlbEHbXz8fX6hYSWHvkwOXdMxqKQcipFFrEp0kSVkbO3eoFlTml7auRnu1884w/exec",
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

  const initRsvpForm = () => {
    if (!form) return;

    const lastWrap = form.querySelector('[data-lookup="last"]');
    const firstWrap = form.querySelector('[data-lookup="first"]');
    const lastInput = form.querySelector("#guest-last");
    const firstInput = form.querySelector("#guest-first");
    const submitBtn = form.querySelector('button[type="submit"]');
    const overwriteBtn = form.querySelector("[data-rsvp-overwrite]");
    if (!lastWrap || !firstWrap || !lastInput || !firstInput) return;

    const SEND_LABEL = "Send RSVP";
    const AGAIN_LABEL = "Submit again";
    const MEMORY_KEY = "cahoon-rsvps";

    let guests = [];
    let lastHighlight = -1;
    let firstHighlight = -1;
    let overwrite = false;

    const guestKey = (last, first) => `${String(last).trim().toLowerCase()}|${String(first).trim().toLowerCase()}`;

    const remembered = () => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(MEMORY_KEY) || "{}");
        return stored && typeof stored === "object" ? stored : {};
      } catch (err) {
        return {};
      }
    };

    const rememberRsvp = (last, first, attending) => {
      const all = remembered();
      all[guestKey(last, first)] = attending === "No" ? "No" : "Yes";
      window.localStorage.setItem(MEMORY_KEY, JSON.stringify(all));
      const guest = guests.find(
        (item) => item.last.toLowerCase() === last.toLowerCase() && item.first.toLowerCase() === first.toLowerCase()
      );
      if (guest) guest.rsvp = all[guestKey(last, first)];
    };

    const existingRsvpFor = (last, first) => {
      if (!last || !first) return "";
      const guest = guests.find(
        (item) => item.last.toLowerCase() === last.toLowerCase() && item.first.toLowerCase() === first.toLowerCase()
      );
      if (guest && guest.rsvp) return guest.rsvp;
      return remembered()[guestKey(last, first)] || "";
    };

    const showAgainButton = (on) => {
      form.classList.toggle("is-already", on);
      if (overwriteBtn) {
        overwriteBtn.hidden = !on;
        overwriteBtn.disabled = false;
        overwriteBtn.style.display = on ? "inline-block" : "none";
      }
      if (submitBtn) {
        submitBtn.hidden = false;
        submitBtn.disabled = false;
        submitBtn.style.display = on && overwriteBtn ? "none" : "";
        submitBtn.textContent = on && !overwriteBtn ? AGAIN_LABEL : SEND_LABEL;
      }
    };

    const exitOverwriteMode = () => {
      overwrite = false;
      showAgainButton(false);
    };

    const enterOverwriteMode = (existing) => {
      overwrite = true;
      showAgainButton(true);
      const label =
        existing === "Yes" ? "Joyfully accepts" : existing === "No" ? "Regretfully declines" : "";
      showStatus(
        label
          ? `An RSVP is already on file for this invitation (${label}). Click Submit again to replace your previous response.`
          : "An RSVP is already on file for this invitation. Click Submit again to replace your previous response.",
        "notice"
      );
    };

    const warnIfAlready = () => {
      const existing = existingRsvpFor(lastValue(), firstValue());
      if (existing) enterOverwriteMode(existing);
      else exitOverwriteMode();
    };

    const isAlreadyResponse = (result) => {
      if (!result || typeof result !== "object") return false;
      if (result.already === true || result.already === "true") return true;
      return /already/i.test(String(result.error || ""));
    };

    const lastValue = () => String(lastWrap.querySelector("[data-lookup-value]")?.value || "");
    const firstValue = () => String(firstWrap.querySelector("[data-lookup-value]")?.value || "");

    const uniqueLastNames = () => {
      const seen = new Set();
      const names = [];
      guests.forEach((guest) => {
        const key = guest.last.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          names.push(guest.last);
        }
      });
      return names.sort((a, b) => a.localeCompare(b));
    };

    const firstNamesFor = (last) => {
      const key = last.toLowerCase();
      return guests
        .filter((guest) => guest.last.toLowerCase() === key)
        .map((guest) => guest.first)
        .sort((a, b) => a.localeCompare(b));
    };

    const filterNames = (names, query) => {
      const q = query.trim().toLowerCase();
      if (!q) return names.slice(0, 40);
      const starts = names.filter((name) => name.toLowerCase().startsWith(q));
      const contains = names.filter(
        (name) => !name.toLowerCase().startsWith(q) && name.toLowerCase().includes(q)
      );
      return starts.concat(contains).slice(0, 40);
    };

    const closeList = (wrap, input) => {
      const list = wrap.querySelector(".lookup-list");
      if (list) {
        list.hidden = true;
        list.innerHTML = "";
      }
      input.setAttribute("aria-expanded", "false");
    };

    const setCanonical = (wrap, value) => {
      const hidden = wrap.querySelector("[data-lookup-value]");
      if (hidden) hidden.value = value;
    };

    const renderList = (wrap, input, names, highlight) => {
      const list = wrap.querySelector(".lookup-list");
      if (!list) return 0;
      list.innerHTML = "";
      if (!names.length) {
        const empty = document.createElement("li");
        empty.className = "lookup-empty";
        empty.textContent = "No matching invitation found";
        list.append(empty);
        list.hidden = false;
        input.setAttribute("aria-expanded", "true");
        return 0;
      }

      names.forEach((name, index) => {
        const option = document.createElement("li");
        option.className = "lookup-option" + (index === highlight ? " is-active" : "");
        option.id = `${list.id}-opt-${index}`;
        option.setAttribute("role", "option");
        option.textContent = name;
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          choose(wrap, input, name);
        });
        list.append(option);
      });

      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      if (highlight >= 0 && names[highlight]) {
        input.setAttribute("aria-activedescendant", `${list.id}-opt-${highlight}`);
      } else {
        input.removeAttribute("aria-activedescendant");
      }
      return names.length;
    };

    const choose = (wrap, input, name) => {
      const previousLast = lastValue();
      input.value = name;
      setCanonical(wrap, name);
      closeList(wrap, input);
      if (wrap === lastWrap) {
        firstInput.disabled = false;
        if (name !== previousLast) {
          firstInput.value = "";
          setCanonical(firstWrap, "");
          exitOverwriteMode();
        }
        firstInput.focus();
        return;
      }
      warnIfAlready();
    };

    const bindLookup = (wrap, input, getNames, highlightRef, setHighlight) => {
      const showMatches = () => {
        const names = filterNames(getNames(), input.value);
        const next = names.length ? Math.min(Math.max(highlightRef(), 0), names.length - 1) : -1;
        setHighlight(next);
        renderList(wrap, input, names, next);
      };

      const onType = () => {
        setCanonical(wrap, "");
        exitOverwriteMode();
        if (wrap === lastWrap) {
          firstInput.disabled = true;
          firstInput.value = "";
          setCanonical(firstWrap, "");
          closeList(firstWrap, firstInput);
        }
        showMatches();
      };

      input.addEventListener("input", onType);
      input.addEventListener("focus", showMatches);
      input.addEventListener("keydown", (event) => {
        const names = filterNames(getNames(), input.value);
        let current = highlightRef();
        if (event.key === "ArrowDown") {
          event.preventDefault();
          current = names.length ? (current + 1) % names.length : -1;
          setHighlight(current);
          renderList(wrap, input, names, current);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          current = names.length ? (current <= 0 ? names.length - 1 : current - 1) : -1;
          setHighlight(current);
          renderList(wrap, input, names, current);
        } else if (event.key === "Enter") {
          if (!wrap.querySelector(".lookup-list")?.hidden && names.length) {
            event.preventDefault();
            const pick = names[Math.max(current, 0)];
            if (pick) choose(wrap, input, pick);
          }
        } else if (event.key === "Escape") {
          closeList(wrap, input);
        }
      });

      input.addEventListener("blur", () => {
        window.setTimeout(() => {
          closeList(wrap, input);
          const typed = input.value.trim().toLowerCase();
          const match = getNames().find((name) => name.toLowerCase() === typed);
          if (match) choose(wrap, input, match);
          else if (!wrap.querySelector("[data-lookup-value]")?.value) {
            input.value = "";
          } else {
            input.value = wrap.querySelector("[data-lookup-value]").value;
          }
        }, 120);
      });
    };

    bindLookup(
      lastWrap,
      lastInput,
      uniqueLastNames,
      () => lastHighlight,
      (value) => {
        lastHighlight = value;
      }
    );
    bindLookup(
      firstWrap,
      firstInput,
      () => firstNamesFor(lastValue()),
      () => firstHighlight,
      (value) => {
        firstHighlight = value;
      }
    );

    const loadGuests = async () => {
      if (!WEDDING.rsvpScriptUrl) {
        showStatus("The RSVP list is not connected yet. Please check back shortly.", "error");
        return;
      }
      try {
        const response = await fetch(`${WEDDING.rsvpScriptUrl}?action=guests`);
        const data = await response.json();
        guests = Array.isArray(data.guests) ? data.guests : [];
        guests.forEach((guest) => {
          if (guest.rsvp) rememberRsvp(guest.last, guest.first, guest.rsvp);
        });
        if (!guests.length) {
          showStatus("The guest list is still being added. Please try again soon.", "error");
        }
      } catch (err) {
        showStatus("We could not load the guest list just now. Please refresh and try again.", "error");
      }
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const last = lastValue();
      const first = firstValue();
      const email = String(form.querySelector("#guest-email")?.value || "").trim();
      const attending = String(form.querySelector("#attending")?.value || "").trim();
      const notes = String(form.querySelector("#message")?.value || "").trim();

      if (!last || !first) {
        showStatus("Please choose your last name and the names on your invitation from the list.", "error");
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showStatus("Please add a valid email so we can send your confirmation.", "error");
        return;
      }
      if (attending !== "Yes" && attending !== "No") {
        showStatus("Please tell us whether you can attend.", "error");
        return;
      }
      if (!WEDDING.rsvpScriptUrl) {
        showStatus("The RSVP list is not connected yet. Please check back shortly.", "error");
        return;
      }

      const existing = existingRsvpFor(last, first);
      if (existing && !overwrite) {
        enterOverwriteMode(existing);
        return;
      }

      const replaceExisting = overwrite;

      if (submitBtn) submitBtn.disabled = true;
      if (overwriteBtn) overwriteBtn.disabled = true;
      showStatus(replaceExisting ? "Updating your RSVP…" : "Sending your RSVP…");

      try {
        const response = await fetch(WEDDING.rsvpScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ last, first, email, attending, notes, overwrite: replaceExisting }),
          redirect: "follow",
        });
        const result = await response.json();
        if (isAlreadyResponse(result) && !replaceExisting) {
          rememberRsvp(last, first, result.attending || "Yes");
          enterOverwriteMode(result.attending);
          return;
        }
        if (!result.ok) {
          showStatus(result.error || "We could not save that RSVP. Please try again.", "error");
          if (replaceExisting) enterOverwriteMode(existing);
          return;
        }
        rememberRsvp(last, first, attending);
        exitOverwriteMode();
        showStatus(
          result.warning ||
            "Thank you. Your RSVP is saved, and a confirmation is on its way to your email."
        );
        form.reset();
        firstInput.disabled = true;
        setCanonical(lastWrap, "");
        setCanonical(firstWrap, "");
      } catch (err) {
        showStatus("Something went wrong sending your RSVP. Please try again in a moment.", "error");
        if (replaceExisting) enterOverwriteMode(existing);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (overwriteBtn) overwriteBtn.disabled = false;
      }
    });

    overwriteBtn?.addEventListener("click", () => {
      overwrite = true;
      form.requestSubmit();
    });

    showAgainButton(false);
    loadGuests();
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

  window.addEventListener("scroll", updateHeader, { passive: true });

  markCurrentPage();
  updateHeader();
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
  observeReveals();
  initPlacesMap();
  initRsvpForm();
})();
