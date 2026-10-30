import {
  computeStrategy,
  estimateFuel,
  fromLiters,
  toLiters,
} from "./fuel-strategy.mjs";

const STORAGE_KEY = "aui-fuel-setup-v1";
const form = document.querySelector("[data-fuel-calculator]");

if (form) {
  const fields = {
    tank: form.querySelector("#fuel-tank"),
    burn: form.querySelector("#fuel-burn"),
    cautionBurn: form.querySelector("#fuel-caution-burn"),
    totalLaps: form.querySelector("#fuel-total-laps"),
    margin: form.querySelector("#fuel-margin"),
    tireMax: form.querySelector("#fuel-tire-max"),
    currentLap: form.querySelector("#fuel-current-lap"),
    manualFuel: form.querySelector("#fuel-manual"),
    expectedCautionLaps: form.querySelector("#fuel-expected-caution"),
    cautionStart: form.querySelector("#caution-start"),
    cautionLength: form.querySelector("#caution-length"),
    pitLap: form.querySelector("#pit-lap"),
    pitFill: form.querySelector("#pit-fill"),
    tireCount: form.querySelector("#pit-tire-count"),
    unit: form.querySelector("#fuel-unit"),
  };
  const outputs = {
    estimatedFuel: document.querySelector("#fuel-result-estimated"),
    lapsLeft: document.querySelector("#fuel-result-laps"),
    stops: document.querySelector("#fuel-result-stops"),
    earliest: document.querySelector("#fuel-result-earliest"),
    latest: document.querySelector("#fuel-result-latest"),
    binding: document.querySelector("#fuel-result-binding"),
    status: document.querySelector("#fuel-result-status"),
    warnings: document.querySelector("#fuel-warnings"),
    cautions: document.querySelector("#caution-log"),
    pitStops: document.querySelector("#pit-log"),
    lastTireLap: document.querySelector("#fuel-last-tire-lap"),
    manualGroup: document.querySelector("#fuel-manual-group"),
    manualRequired: document.querySelector("#fuel-manual-required"),
    estimatedFuelLabel: document.querySelector("#fuel-estimated-label"),
  };
  let cautions = [];
  let pitStops = [];
  let lastUnit = fields.unit.value;
  let additionalWarnings = [];

  function currentMode() {
    return form.querySelector('input[name="fuel-mode"]:checked')?.value || "estimate";
  }

  function maxDisplayedFuel() {
    return fields.unit.value === "gal" ? 26417.2 : 100000;
  }

  function readNumber(element, { min, max, fallback = null, optional = false }) {
    const raw = element.value.trim();
    if (raw === "" && optional) {
      element.removeAttribute("aria-invalid");
      element.classList.remove("is-invalid");
      return { value: fallback, valid: true };
    }
    if (raw === "") {
      element.setAttribute("aria-invalid", "true");
      element.classList.add("is-invalid");
      return { value: fallback, valid: false };
    }

    const number = Number(raw);
    const step = element.step;
    const integerRequired = step === "1";
    const inRange = Number.isFinite(number)
      && number >= min
      && number <= max
      && (!integerRequired || Number.isInteger(number));

    element.toggleAttribute("aria-invalid", !inRange);
    element.classList.toggle("is-invalid", !inRange);
    if (!inRange) {
      const clamped = Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : null;
      return { value: clamped, valid: false };
    }
    return { value: number, valid: true };
  }

  function maxDisplayedBurn() {
    return fields.unit.value === "gal" ? 2641.7 : 10000;
  }

  function refreshFuelInputLimits() {
    fields.tank.max = String(maxDisplayedFuel());
    fields.burn.max = String(maxDisplayedBurn());
    fields.manualFuel.max = String(maxDisplayedFuel());
    fields.pitFill.max = String(maxDisplayedFuel());
    const greenBurn = Number(fields.burn.value);
    if (Number.isFinite(greenBurn) && greenBurn > 0) {
      fields.cautionBurn.max = String(greenBurn);
      fields.cautionBurn.placeholder = `Default: ${(greenBurn / 2).toFixed(3)} ${fields.unit.value}/lap`;
    } else {
      fields.cautionBurn.max = String(maxDisplayedBurn());
      fields.cautionBurn.placeholder = "Default: half of green-flag burn";
    }
  }

  function litersForDisplayed(value) {
    const result = toLiters(value, fields.unit.value);
    return result.error ? null : result;
  }

  function displayedFuel(liters) {
    const converted = fromLiters(liters, fields.unit.value);
    if (converted.error) return "—";
    const unit = fields.unit.value;
    return `${converted.toFixed(1)} ${unit}`;
  }

  function makeText(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function renderCautions() {
    outputs.cautions.replaceChildren();
    if (cautions.length === 0) {
      outputs.cautions.append(makeText("li", "fuel-log__empty", "No caution laps logged."));
      return;
    }
    cautions.forEach((caution, index) => {
      const row = document.createElement("li");
      const endLap = caution.startLap + caution.laps - 1;
      const phase = caution.startLap > Number(fields.currentLap.value) ? "Upcoming" : "Logged";
      row.append(
        makeText("span", "fuel-log__summary", `${phase}: Laps ${caution.startLap}–${endLap}`),
      );
      const remove = makeText("button", "fuel-log__remove", "Remove");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove caution starting on lap ${caution.startLap}`);
      remove.addEventListener("click", () => {
        cautions = cautions.filter((_, itemIndex) => itemIndex !== index);
        renderCautions();
        recompute();
      });
      row.append(remove);
      outputs.cautions.append(row);
    });
  }

  function renderPitStops() {
    outputs.pitStops.replaceChildren();
    if (pitStops.length === 0) {
      outputs.pitStops.append(makeText("li", "fuel-log__empty", "No pit stops logged."));
      outputs.lastTireLap.textContent = "0";
      return;
    }
    pitStops.forEach((stop, index) => {
      const row = document.createElement("li");
      const fillText = stop.fillLiters === null ? "Full tank" : `Set to ${displayedFuel(stop.fillLiters)}`;
      const tireText = stop.tireCount > 0 ? ` · ${stop.tireCount} tires` : "";
      row.append(makeText("span", "fuel-log__summary", `Lap ${stop.lap} · ${fillText}${tireText}`));
      const remove = makeText("button", "fuel-log__remove", "Remove");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove pit stop on lap ${stop.lap}`);
      remove.addEventListener("click", () => {
        pitStops = pitStops.filter((_, itemIndex) => itemIndex !== index);
        renderPitStops();
        recompute();
      });
      row.append(remove);
      outputs.pitStops.append(row);
    });

    const lastTireStop = pitStops
      .filter((stop) => stop.tireCount > 0)
      .reduce((latest, stop) => Math.max(latest, stop.lap), 0);
    outputs.lastTireLap.textContent = String(lastTireStop);
  }

  function showWarning(message) {
    outputs.warnings.textContent = message;
    outputs.warnings.hidden = message === "";
  }

  function getSetup() {
    refreshFuelInputLimits();
    const total = readNumber(fields.totalLaps, { min: 1, max: 100000 });
    const setup = {
      tank: readNumber(fields.tank, { min: 0.1, max: maxDisplayedFuel() }),
      burn: readNumber(fields.burn, { min: 0.001, max: maxDisplayedBurn() }),
      cautionBurn: readNumber(fields.cautionBurn, {
        min: 0.001,
        max: Number(fields.burn.value),
        optional: true,
      }),
      totalLaps: total,
      margin: readNumber(fields.margin, { min: 0, max: 100000 }),
      tireMax: readNumber(fields.tireMax, { min: 1, max: 100000, optional: true }),
      currentLap: readNumber(fields.currentLap, { min: 0, max: 100000 }),
      expectedCautionLaps: readNumber(fields.expectedCautionLaps, { min: 0, max: 100000 }),
    };

    const values = Object.values(setup);
    if (values.some((value) => !value.valid)) return null;

    if (setup.currentLap.value > setup.totalLaps.value) {
      fields.currentLap.value = String(setup.totalLaps.value);
      additionalWarnings.push("Current lap was limited to the total race distance.");
      return getSetup();
    }

    const tankLiters = litersForDisplayed(setup.tank.value);
    const burnLiters = litersForDisplayed(setup.burn.value);
    const cautionBurnLiters = setup.cautionBurn.value === null
      ? burnLiters * 0.5
      : litersForDisplayed(setup.cautionBurn.value);
    if (tankLiters === null || burnLiters === null || cautionBurnLiters === null) return null;

    return {
      tank: tankLiters,
      burn: burnLiters,
      cautionFactor: cautionBurnLiters / burnLiters,
      totalLaps: setup.totalLaps.value,
      currentLap: setup.currentLap.value,
      marginLaps: setup.margin.value,
      tireMaxLaps: setup.tireMax.value,
      expectedCautionLaps: setup.expectedCautionLaps.value,
    };
  }

  function saveSetup(setup) {
    if (!setup) return;
    const record = {
      tankLiters: setup.tank,
      burnLiters: setup.burn,
      cautionFactor: setup.cautionFactor,
      totalLaps: setup.totalLaps,
      marginLaps: setup.marginLaps,
      tireMaxLaps: setup.tireMaxLaps,
      unit: fields.unit.value,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      additionalWarnings.push("Setup could not be saved in this browser.");
    }
  }

  function discardStoredSetup() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      additionalWarnings.push("An invalid saved setup was ignored.");
    } catch {
      additionalWarnings.push("An invalid saved setup could not be cleared from this browser.");
    }
  }

  function loadSetup() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
    } catch {
      additionalWarnings.push("Saved setup could not be read in this browser.");
      return;
    }

    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      discardStoredSetup();
      return;
    }

    if (!stored || typeof stored !== "object"
      || !Number.isFinite(stored.tankLiters) || stored.tankLiters < 0.1 || stored.tankLiters > 100000
      || !Number.isFinite(stored.burnLiters) || stored.burnLiters < 0.001 || stored.burnLiters > 10000
      || !Number.isFinite(stored.cautionFactor) || stored.cautionFactor <= 0 || stored.cautionFactor > 1
      || !Number.isSafeInteger(stored.totalLaps) || stored.totalLaps < 1 || stored.totalLaps > 100000
      || !Number.isFinite(stored.marginLaps) || stored.marginLaps < 0 || stored.marginLaps > 100000
      || (stored.tireMaxLaps !== null
        && (!Number.isSafeInteger(stored.tireMaxLaps) || stored.tireMaxLaps < 1 || stored.tireMaxLaps > 100000))
      || !["L", "gal"].includes(stored.unit)) {
      discardStoredSetup();
      return;
    }

    fields.unit.value = stored.unit;
    lastUnit = stored.unit;
    const tank = fromLiters(stored.tankLiters, stored.unit);
    const burn = fromLiters(stored.burnLiters, stored.unit);
    fields.tank.value = tank.toFixed(2);
    fields.burn.value = burn.toFixed(3);
    fields.cautionBurn.value = Math.abs(stored.cautionFactor - 0.5) < 1e-9
      ? ""
      : fromLiters(stored.burnLiters * stored.cautionFactor, stored.unit).toFixed(3);
    fields.totalLaps.value = String(stored.totalLaps);
    fields.margin.value = String(stored.marginLaps);
    fields.tireMax.value = stored.tireMaxLaps === null ? "" : String(stored.tireMaxLaps);
  }

  refreshFuelInputLimits();

  function renderResult(result, estimatedFuelLiters) {
    outputs.estimatedFuel.textContent = displayedFuel(estimatedFuelLiters);
    outputs.lapsLeft.textContent = `${result.lapsLeft.toFixed(1)} laps`;
    outputs.stops.textContent = String(result.stops);
    outputs.earliest.textContent = result.earliest === null ? "—" : `Lap ${result.earliest}`;
    outputs.latest.textContent = `Lap ${result.latest}`;
    outputs.binding.textContent = result.bindingConstraint;
    outputs.status.textContent = result.status.replaceAll("_", " ");
    outputs.status.dataset.status = result.status.toLowerCase();
    const strategyWarnings = result.warnings.join(" ");
    showWarning([strategyWarnings, ...additionalWarnings].filter(Boolean).join(" "));
    additionalWarnings = [];
  }

  function recompute() {
    const mode = currentMode();
    outputs.manualGroup.hidden = mode !== "manual";
    outputs.manualRequired.hidden = mode !== "manual";
    fields.manualFuel.required = mode === "manual";
    outputs.estimatedFuelLabel.textContent = mode === "manual" ? "Current fuel" : "Estimated fuel";

    const setup = getSetup();
    const manualRange = readNumber(fields.manualFuel, {
      min: 0,
      max: fields.tank.value === "" ? maxDisplayedFuel() : Number(fields.tank.value),
      optional: mode !== "manual",
    });
    if (!setup || !manualRange.valid || (mode === "manual" && manualRange.value === null)) {
      showWarning("Check the highlighted inputs; results remain at the last valid calculation.");
      return;
    }

    const estimated = estimateFuel({
      tank: setup.tank,
      burn: setup.burn,
      cautionFactor: setup.cautionFactor,
      currentLap: setup.currentLap,
      pitStops,
      cautions,
    });
    if (estimated.error) {
      showWarning(estimated.error);
      return;
    }

    let fuel = estimated;
    if (mode === "manual") {
      fuel = litersForDisplayed(manualRange.value);
      if (fuel === null || fuel > setup.tank) {
        fields.manualFuel.setAttribute("aria-invalid", "true");
        fields.manualFuel.classList.add("is-invalid");
        showWarning("Current fuel must be within the tank capacity.");
        return;
      }
    }

    const lastTireLap = pitStops
      .filter((stop) => stop.tireCount > 0 && stop.lap <= setup.currentLap)
      .reduce((latest, stop) => Math.max(latest, stop.lap), 0);
    const result = computeStrategy({
      ...setup,
      fuel,
      lastTireLap,
    });
    if (result.error) {
      showWarning(result.error);
      return;
    }

    saveSetup(setup);
    renderResult(result, fuel);
    if (estimated === 0 && mode === "estimate" && setup.currentLap > 0) {
      showWarning([outputs.warnings.textContent, "Estimated fuel has reached zero; verify the pit log."]
        .filter(Boolean).join(" "));
    }
  }

  function convertDisplayedFuelInputs(fromUnit, toUnit) {
    [
      fields.tank,
      fields.burn,
      fields.cautionBurn,
      fields.manualFuel,
      fields.pitFill,
    ].forEach((input) => {
      if (input.value.trim() === "") return;
      const displayed = Number(input.value);
      if (!Number.isFinite(displayed) || displayed < 0) return;
      const liters = toLiters(displayed, fromUnit);
      const converted = liters.error ? liters : fromLiters(liters, toUnit);
      if (!converted.error) input.value = String(Number(converted.toFixed(3)));
    });
  }

  function addCaution() {
    const start = readNumber(fields.cautionStart, { min: 1, max: 100000 });
    const length = readNumber(fields.cautionLength, { min: 1, max: 100000 });
    if (!start.valid || !length.valid) {
      showWarning("Enter a valid caution start lap and lap count.");
      return;
    }
    const total = Number(fields.totalLaps.value);
    if (!Number.isFinite(total) || total < 1) {
      showWarning("Enter total race laps before adding a caution.");
      return;
    }
    if (start.value + length.value - 1 > total) {
      fields.cautionLength.setAttribute("aria-invalid", "true");
      fields.cautionLength.classList.add("is-invalid");
      showWarning("Caution range cannot extend beyond the total race distance.");
      return;
    }
    cautions.push({ startLap: start.value, laps: length.value });
    fields.cautionStart.value = "";
    fields.cautionLength.value = "1";
    renderCautions();
    recompute();
  }

  function addPitStop() {
    const lap = readNumber(fields.pitLap, { min: 1, max: 100000 });
    const totalLap = Number(fields.currentLap.value);
    if (!lap.valid || !Number.isFinite(totalLap) || lap.value > totalLap) {
      fields.pitLap.setAttribute("aria-invalid", "true");
      fields.pitLap.classList.add("is-invalid");
      showWarning("Pit stop lap must be a completed lap at or before the current lap.");
      return;
    }

    let fillLiters = null;
    if (fields.pitFill.value.trim() !== "") {
      const fill = readNumber(fields.pitFill, { min: 0, max: maxDisplayedFuel() });
      if (!fill.valid) {
        showWarning("Enter a valid pit stop fuel amount.");
        return;
      }
      fillLiters = litersForDisplayed(fill.value);
      refreshFuelInputLimits();
      const tankInput = readNumber(fields.tank, { min: 0.1, max: maxDisplayedFuel() });
      if (!tankInput.valid) {
        showWarning("Enter a valid tank capacity before adding a pit stop.");
        return;
      }
      const tank = litersForDisplayed(tankInput.value);
      if (fillLiters === null || tank === null) {
        showWarning("Enter a valid tank capacity and unit.");
        return;
      }
      if (fillLiters > tank) {
        fillLiters = tank;
        fields.pitFill.value = String(Number(fromLiters(tank, fields.unit.value).toFixed(3)));
        additionalWarnings.push("Pit fill was limited to tank capacity.");
      }
    }

    pitStops.push({ lap: lap.value, fillLiters, tireCount: Number(fields.tireCount.value) });
    fields.pitLap.value = "";
    fields.pitFill.value = "";
    fields.tireCount.value = "0";
    renderPitStops();
    recompute();
  }

  function resetCalculator() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      showWarning("Saved setup could not be cleared from this browser.");
      return;
    }
    form.reset();
    fields.unit.value = "gal";
    refreshFuelInputLimits();
    fields.currentLap.value = "0";
    fields.margin.value = "1";
    fields.expectedCautionLaps.value = "0";
    fields.cautionLength.value = "1";
    fields.tireCount.value = "0";
    cautions = [];
    pitStops = [];
    lastUnit = "gal";
    renderCautions();
    renderPitStops();
    outputs.estimatedFuel.textContent = "—";
    outputs.lapsLeft.textContent = "—";
    outputs.stops.textContent = "—";
    outputs.earliest.textContent = "—";
    outputs.latest.textContent = "—";
    outputs.binding.textContent = "—";
    outputs.status.textContent = "Enter required race setup";
    outputs.status.dataset.status = "setup";
    showWarning("");
    recompute();
  }

  loadSetup();
  renderCautions();
  renderPitStops();

  form.querySelectorAll("input, select").forEach((input) => {
    if (input !== fields.unit) input.addEventListener("input", recompute);
    input.addEventListener("change", () => {
      if (input === fields.unit && fields.unit.value !== lastUnit) {
        convertDisplayedFuelInputs(lastUnit, fields.unit.value);
        lastUnit = fields.unit.value;
        refreshFuelInputLimits();
        renderPitStops();
        form.querySelectorAll("[data-fuel-unit-label]").forEach((label) => {
          label.textContent = fields.unit.value;
        });
      }
      recompute();
    });
  });
  form.querySelector("[data-lap-step='-1']").addEventListener("click", () => {
    fields.currentLap.value = String(Math.max(0, Number(fields.currentLap.value) - 1));
    recompute();
  });
  form.querySelector("[data-lap-step='1']").addEventListener("click", () => {
    const total = Number(fields.totalLaps.value);
    if (!Number.isFinite(total) || total < 1) {
      showWarning("Enter total race laps before advancing the current lap.");
      return;
    }
    fields.currentLap.value = String(Math.min(total, Number(fields.currentLap.value) + 1));
    recompute();
  });
  form.querySelector("#add-caution").addEventListener("click", addCaution);
  form.querySelector("#add-pit-stop").addEventListener("click", addPitStop);
  form.querySelector("#reset-fuel-calculator").addEventListener("click", resetCalculator);
  fields.currentLap.addEventListener("input", renderCautions);
  form.addEventListener("submit", (event) => event.preventDefault());
  recompute();
}
