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