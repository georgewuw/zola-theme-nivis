const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
// Keep in sync with `$sidebar-breakpoint` in sass/_variables.scss, which
// exposes the value as the `--sidebar-breakpoint` custom property.
const sidebarBreakpoint =
  getComputedStyle(document.documentElement)
    .getPropertyValue("--sidebar-breakpoint")
    .trim() || "1080px";
const mobileSidebar = window.matchMedia(`(max-width: ${sidebarBreakpoint})`);
const feedButton = document.querySelector(".feed-icon");
const feedDropdown = document.getElementById("feed-dropdown");
const feedContainer = document.querySelector(".feed_btn");
let feedPinned = false;

function setFeedOpen(open, restoreFocus = false) {
  if (!feedButton) return;
  if (open && document.getElementById("search-toggle")?.getAttribute("aria-expanded") === "true") return;
  feedDropdown.hidden = !open;
  feedButton.setAttribute("aria-expanded", String(open));
  if (!open) feedPinned = false;
  if (restoreFocus) feedButton.focus();
}

function setSidebarOpen(open, restoreFocus = false) {
  if (!sidebar) return;
  open = open && mobileSidebar.matches;
  sidebar.classList.toggle("open", open);
  document.getElementById("sidebar-mask").classList.toggle("open", open);
  sidebar.inert = mobileSidebar.matches && !open;
  sidebarToggle.setAttribute("aria-expanded", String(open));
  if (restoreFocus) sidebarToggle.focus();
}

function toggleSidebar() {
  if (!sidebar) return;
  const open = !sidebar.classList.contains("open");
  setFeedOpen(false);
  setSidebarOpen(open, !open);
  if (open) sidebar.querySelector(".sidebar-nav a").focus();
}

if (sidebar) {
  setSidebarOpen(false);
  mobileSidebar.addEventListener("change", () => setSidebarOpen(false));
  sidebar.addEventListener("focusout", (event) => {
    if (event.relatedTarget && !sidebar.contains(event.relatedTarget) && event.relatedTarget !== sidebarToggle) {
      setSidebarOpen(false);
    }
  });
}

if (feedButton) {
  feedButton.addEventListener("click", () => {
    feedPinned = !feedPinned;
    setFeedOpen(feedPinned);
  });
  feedButton.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      feedPinned = true;
      setFeedOpen(true);
      feedDropdown.querySelector("a").focus();
    }
  });
  feedContainer.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") setFeedOpen(true);
  });
  feedContainer.addEventListener("pointerleave", () => {
    if (!feedPinned && !feedContainer.contains(document.activeElement)) setFeedOpen(false);
  });
  feedContainer.addEventListener("focusout", (event) => {
    if (!feedContainer.contains(event.relatedTarget)) setFeedOpen(false);
  });
  feedDropdown.addEventListener("click", (event) => {
    if (event.target.closest("a")) setFeedOpen(false, true);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!feedContainer.contains(event.target)) setFeedOpen(false);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (feedDropdown && !feedDropdown.hidden) {
    setFeedOpen(false, feedContainer.contains(document.activeElement));
  } else if (sidebar && sidebar.classList.contains("open")) {
    setSidebarOpen(false, true);
  }
});

const getPreferredScheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

function updateThemeIcon(scheme) {
  const themeIcon = document.getElementById("theme-icon");
  if (themeIcon) {
    themeIcon.closest("button").setAttribute("aria-pressed", String(scheme === "dark"));
    if (scheme === 'dark') {
      themeIcon.classList.remove("fa-moon");
      themeIcon.classList.add("fa-sun");
    } else {
      themeIcon.classList.remove("fa-sun");
      themeIcon.classList.add("fa-moon");
    }
  }
}

/* Class-based syntax highlighting ships one stylesheet per scheme, picked by
   a `prefers-color-scheme` media query. Once the visitor has chosen a scheme
   explicitly, the choice must win over the OS setting, so flip the links. */
function applyHighlightScheme(scheme) {
  const themes = { dark: "highlight-dark", light: "highlight-light" };
  for (const [name, id] of Object.entries(themes)) {
    const link = document.getElementById(id);
    if (link) link.media = name === scheme ? "all" : "not all";
  }
}

function applyTheme(scheme) {
  document.documentElement.style.colorScheme = scheme;
  localStorage.setItem("theme", scheme);
  updateThemeIcon(scheme);
  applyHighlightScheme(scheme);
}

/* Fallback for browsers without the View Transitions API: let every colour in
   the page cross-fade for a moment (`html.theme-fade` in the stylesheet). */
function fadeTheme(scheme) {
  const root = document.documentElement;
  root.classList.add("theme-fade");
  applyTheme(scheme);
  window.setTimeout(() => root.classList.remove("theme-fade"), 400);
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const themeRevealMs = 520;

/* Reveal the new scheme as a circle growing out of the toggle button, so the
   switch reads as one gesture instead of a hard repaint. */
function revealTheme(button, scheme) {
  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(() => applyTheme(scheme));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: themeRevealMs,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}

function toggleTheme(event) {
  const root = document.documentElement;
  const effectiveScheme = root.style.colorScheme || getPreferredScheme();
  const targetScheme = effectiveScheme === 'dark' ? 'light' : 'dark';
  const button = event?.currentTarget ?? document.querySelector(".theme_btn .icon-button");

  if (reduceMotion.matches) {
    applyTheme(targetScheme);
  } else if (document.startViewTransition && button) {
    revealTheme(button, targetScheme);
  } else {
    fadeTheme(targetScheme);
  }
}

// Initialize theme icon
(function() {
  const savedTheme = localStorage.getItem("theme");
  const systemTheme = getPreferredScheme();
  updateThemeIcon(savedTheme || systemTheme);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem("theme")) {
      updateThemeIcon(e.matches ? 'dark' : 'light');
    }
  });
})();
