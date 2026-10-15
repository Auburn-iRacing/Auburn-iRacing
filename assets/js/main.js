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