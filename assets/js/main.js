// Only enable secure, complete URLs; missing destinations remain visibly unavailable.
const links = window.AUBURN_LINKS ?? {};

for (const card of document.querySelectorAll("[data-resource]")) {
  const resourceKey = card.dataset.resource;
  const status = card.querySelector("[data-link-status]");
  const destination = links[resourceKey];

  try {
    const url = new URL(destination);
    if (url.protocol !== "https:") throw new Error("Only HTTPS destinations are supported.");

    card.href = url.href;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.classList.add("resource-card--available");
    status.textContent = "Open resource ↗";
  } catch {
    card.classList.add("resource-card--pending");
    card.setAttribute("aria-disabled", "true");
    status.textContent = "Team link not added yet";
  }
}

const today = new Date();
const todayDate = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

function prepareScrollableList(list, visibleCount, dateSelector, newestFirst = true) {
  const cards = [...list.children];
  cards.sort((left, right) => {
    const leftDate = left.dataset.statusDate || left.querySelector(dateSelector)?.dateTime || "";
    const rightDate = right.dataset.statusDate || right.querySelector(dateSelector)?.dateTime || "";
    return newestFirst
      ? rightDate.localeCompare(leftDate)
      : leftDate.localeCompare(rightDate);
  });
  list.replaceChildren(...cards);

  const computedStyle = getComputedStyle(list);
  const gap = Number.parseFloat(computedStyle.rowGap) || 0;
  const padding = (Number.parseFloat(computedStyle.paddingTop) || 0)
    + (Number.parseFloat(computedStyle.paddingBottom) || 0);
  const visibleCards = cards.slice(0, visibleCount);
  const visibleHeight = visibleCards.reduce((height, card) => height + card.offsetHeight, 0)
    + Math.max(0, visibleCards.length - 1) * gap
    + padding;

  list.style.maxHeight = `${visibleHeight}px`;
}

function updateRaceCardStatus(race) {
  const raceDate = race.dataset.statusDate || race.querySelector("time")?.dateTime || "";
  const isComplete = race.dataset.status === "complete" || (raceDate !== "" && raceDate < todayDate);
  const status = race.querySelector(".race-status-label");

  status.textContent = isComplete ? "Completed" : "Upcoming";
  status.classList.toggle("race-status-label--complete", isComplete);
  status.classList.toggle("race-status-label--upcoming", !isComplete);
}

function updateScheduleLists() {
  document.querySelectorAll(".race-list").forEach((list) => {
    const series = list.closest(".schedule-series");
    const upcomingList = series.querySelector(".upcoming-race-list");
    const races = [
      ...list.querySelectorAll(".race-card"),
      ...upcomingList.querySelectorAll(".race-card"),
    ];
    const completedRaces = [];
    const upcomingRaces = [];

    races.forEach((race) => {
      updateRaceCardStatus(race);
      const raceDate = race.dataset.statusDate || race.querySelector("time")?.dateTime || "";
      const isComplete = race.dataset.status === "complete" || (raceDate !== "" && raceDate < todayDate);
      (isComplete ? completedRaces : upcomingRaces).push(race);
    });

    list.replaceChildren(...completedRaces);
    upcomingList.replaceChildren(...upcomingRaces);
    prepareScrollableList(list, 3, "time");

    if (upcomingRaces.length > 0) {
      const nextRace = upcomingRaces[0];
      const date = nextRace.querySelector("time")?.textContent.trim();
      const name = nextRace.querySelector("h4")?.textContent.trim();
      const nextLabel = series.querySelector(".upcoming-races__next");
      nextLabel.textContent = `Next: ${[date, name].filter(Boolean).join(" · ")}`;
      series.querySelector(".upcoming-races summary").firstElementChild.textContent =
        `Upcoming races · ${upcomingRaces.length}`;
      prepareScrollableList(upcomingList, upcomingRaces.length, "time", false);
    } else {
      series.querySelector(".upcoming-races__next").textContent = "Schedule complete";
      series.querySelector(".upcoming-races summary").firstElementChild.textContent = "Upcoming races · none";
      upcomingList.style.maxHeight = "0";
    }
  });

  document.querySelectorAll(".special-event-history__list").forEach((list) => {
    const archivedCount = list.children.length;
    const countLabel = list.closest("details")?.querySelector("summary span");
    if (countLabel) {
      countLabel.textContent = `${archivedCount} archived`;
    }
    prepareScrollableList(list, 3, "time");
  });
}

updateScheduleLists();
window.addEventListener("resize", updateScheduleLists);
document.fonts?.ready.then(updateScheduleLists);

const menuToggle = document.querySelector("[data-menu-toggle]");
const siteDrawer = document.querySelector("#site-drawer");
const menuBackdrop = document.querySelector("[data-menu-backdrop]");

function setMenuOpen(isOpen) {
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close site menu" : "Open site menu");
  siteDrawer.setAttribute("aria-hidden", String(!isOpen));
  siteDrawer.toggleAttribute("inert", !isOpen);
  siteDrawer.classList.toggle("is-open", isOpen);
  menuBackdrop.hidden = !isOpen;
  document.body.classList.toggle("menu-open", isOpen);

  if (isOpen) {
    siteDrawer.querySelector("a")?.focus();
  } else {
    menuToggle.focus();
  }
}

menuToggle?.addEventListener("click", () => {
  setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

menuBackdrop?.addEventListener("click", () => setMenuOpen(false));

siteDrawer?.querySelectorAll("[data-drawer-link]").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
  }
});