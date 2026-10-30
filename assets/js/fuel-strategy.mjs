const LITERS_PER_GALLON = 3.78541;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function error(message) {
  return { error: message };
}

export function toLiters(value, unit) {
  if (!isFiniteNumber(value) || value < 0) return error("Fuel must be a finite, non-negative number.");
  if (unit === "L") return value;
  if (unit === "gal") {
    const liters = value * LITERS_PER_GALLON;
    return isFiniteNumber(liters) ? liters : error("Fuel conversion is outside the supported range.");
  }
  return error("Fuel unit must be L or gal.");
}

export function fromLiters(value, unit) {
  if (!isFiniteNumber(value) || value < 0) return error("Fuel must be a finite, non-negative number.");
  if (unit === "L") return value;
  if (unit === "gal") {
    const gallons = value / LITERS_PER_GALLON;
    return isFiniteNumber(gallons) ? gallons : error("Fuel conversion is outside the supported range.");
  }
  return error("Fuel unit must be L or gal.");
}

export function countLapTypes(fromLap, toLap, cautions) {
  if (!Number.isSafeInteger(fromLap) || fromLap < 0
    || !Number.isSafeInteger(toLap) || toLap < 0
    || !Array.isArray(cautions)) {
    return error("Lap range and caution log are invalid.");
  }
  if (fromLap > toLap) return { green: 0, caution: 0 };

  const ranges = [];
  for (const caution of cautions) {
    if (!Number.isSafeInteger(caution?.startLap) || caution.startLap < 1
      || !Number.isSafeInteger(caution?.laps) || caution.laps < 1) {
      return error("Each caution needs a valid start lap and lap count.");
    }
    if (!Number.isSafeInteger(caution.startLap + caution.laps - 1)) {
      return error("Caution range exceeds the supported lap limit.");
    }

    const start = Math.max(fromLap, caution.startLap);
    const end = Math.min(toLap, caution.startLap + caution.laps - 1);
    if (start <= end) ranges.push([start, end]);
  }

  ranges.sort((left, right) => left[0] - right[0]);
  let cautionLaps = 0;
  let rangeStart = null;
  let rangeEnd = null;

  for (const [start, end] of ranges) {
    if (rangeStart === null) {
      rangeStart = start;
      rangeEnd = end;
    } else if (start <= rangeEnd + 1) {
      rangeEnd = Math.max(rangeEnd, end);
    } else {
      cautionLaps += rangeEnd - rangeStart + 1;
      rangeStart = start;
      rangeEnd = end;
    }
  }
  if (rangeStart !== null) cautionLaps += rangeEnd - rangeStart + 1;

  const totalLaps = toLap - fromLap + 1;
  if (!Number.isSafeInteger(totalLaps)) return error("Lap range exceeds the supported limit.");
  return { green: totalLaps - cautionLaps, caution: cautionLaps };
}

export function estimateFuel({ tank, burn, cautionFactor, currentLap, pitStops, cautions }) {
  if (!isFiniteNumber(tank) || tank <= 0
    || !isFiniteNumber(burn) || burn <= 0
    || !isFiniteNumber(cautionFactor) || cautionFactor <= 0 || cautionFactor > 1
    || !Number.isSafeInteger(currentLap) || currentLap < 0
    || !Array.isArray(pitStops) || !Array.isArray(cautions)) {
    return error("Fuel estimate inputs are invalid.");
  }

  const sortedStops = [...pitStops].sort((left, right) => left.lap - right.lap);
  for (const stop of sortedStops) {
    if (!Number.isSafeInteger(stop?.lap) || stop.lap < 1
      || (stop.fillLiters !== null && stop.fillLiters !== undefined
        && (!isFiniteNumber(stop.fillLiters) || stop.fillLiters < 0 || stop.fillLiters > tank))) {
      return error("Pit log contains an invalid lap or fill amount.");
    }
  }
  if (cautions.some((caution) => !Number.isSafeInteger(caution?.startLap)
    || caution.startLap < 1 || !Number.isSafeInteger(caution?.laps) || caution.laps < 1)) {
    return error("Caution log contains an invalid lap range.");
  }

  let fuel = tank;
  let previousLap = 0;
  for (const stop of sortedStops) {
    if (stop.lap > currentLap) break;
    const lapTypes = countLapTypes(previousLap + 1, stop.lap, cautions);
    if (lapTypes.error) return lapTypes;
    const consumed = (lapTypes.green + lapTypes.caution * cautionFactor) * burn;
    if (!isFiniteNumber(consumed)) return error("Fuel estimate exceeds the supported range.");
    fuel -= consumed;
    fuel = stop.fillLiters ?? tank;
    previousLap = stop.lap;
  }

  const lapTypes = countLapTypes(previousLap + 1, currentLap, cautions);
  if (lapTypes.error) return lapTypes;
  const consumed = (lapTypes.green + lapTypes.caution * cautionFactor) * burn;
  if (!isFiniteNumber(consumed)) return error("Fuel estimate exceeds the supported range.");
  fuel -= consumed;
  return Math.max(0, fuel);
}

export function computeStrategy({
  tank,
  burn,
  cautionFactor,
  totalLaps,
  currentLap,
  fuel,
  marginLaps,
  expectedCautionLaps,
  tireMaxLaps = null,
  lastTireLap = 0,
}) {
  if (!isFiniteNumber(tank) || tank <= 0
    || !isFiniteNumber(burn) || burn <= 0
    || !isFiniteNumber(cautionFactor) || cautionFactor <= 0 || cautionFactor > 1
    || !Number.isSafeInteger(totalLaps) || totalLaps < 1
    || !Number.isSafeInteger(currentLap) || currentLap < 0 || currentLap > totalLaps
    || !isFiniteNumber(fuel) || fuel < 0 || fuel > tank
    || !isFiniteNumber(marginLaps) || marginLaps < 0
    || !Number.isSafeInteger(expectedCautionLaps) || expectedCautionLaps < 0
    || (tireMaxLaps !== null && (!Number.isSafeInteger(tireMaxLaps) || tireMaxLaps < 1))
    || !Number.isSafeInteger(lastTireLap) || lastTireLap < 0 || lastTireLap > totalLaps) {
    return error("Strategy inputs are invalid.");
  }

  const fullTankLaps = tank / burn - marginLaps;
  if (fullTankLaps <= 0) return error("Safety margin exceeds the usable range of a full tank.");

  const cautionFuel = expectedCautionLaps * burn * cautionFactor;
  if (!isFiniteNumber(fullTankLaps) || !isFiniteNumber(cautionFuel)) {
    return error("Strategy inputs exceed the supported calculation range.");
  }
  const lapsLeft = fuel >= cautionFuel
    ? expectedCautionLaps + (fuel - cautionFuel) / burn
    : fuel / (burn * cautionFactor);
  const usableLaps = lapsLeft - marginLaps;
  if (!isFiniteNumber(lapsLeft) || !isFiniteNumber(usableLaps)) {
    return error("Strategy inputs exceed the supported calculation range.");
  }
  const remainingLaps = totalLaps - currentLap;
  const requiredStops = (remainingLaps - usableLaps) / fullTankLaps;
  const stops = Math.max(0, Math.ceil(requiredStops));
  if (!isFiniteNumber(requiredStops) || !Number.isSafeInteger(stops)) {
    return error("Strategy inputs exceed the supported calculation range.");
  }
  const fuelLatest = Math.max(0, Math.min(totalLaps, currentLap + Math.floor(usableLaps)));
  const tireLatest = tireMaxLaps === null
    ? null
    : Math.min(totalLaps, lastTireLap + tireMaxLaps);
  const latest = tireLatest === null ? fuelLatest : Math.min(fuelLatest, tireLatest);
  const earliest = stops > 0
    ? Math.max(currentLap, Math.ceil(totalLaps - stops * fullTankLaps))
    : null;

  let status = "CLOSED_EARLY";
  if (currentLap === totalLaps) status = "FINISHED";
  else if (stops === 0) status = "NO_STOP_NEEDED";
  else if (earliest > latest) status = "INFEASIBLE";
  else if (currentLap > latest) status = "MISSED";
  else if (currentLap >= earliest) status = "OPEN";

  const bindingConstraint = tireLatest === null
    ? "fuel"
    : tireLatest < fuelLatest
      ? "tires"
      : tireLatest === fuelLatest
        ? "fuel + tires"
        : "fuel";
  const warnings = [];
  if (usableLaps < 0) warnings.push("Current fuel is below the selected safety margin.");
  if (status === "INFEASIBLE") warnings.push("No feasible pit window; an additional stop may be required.");

  return {
    remainingLaps,
    lapsLeft,
    stops,
    earliest,
    latest,
    fuelLatest,
    tireLatest,
    status,
    bindingConstraint,
    warnings,
  };
}
