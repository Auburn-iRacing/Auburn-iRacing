import test from "node:test";
import assert from "node:assert/strict";

import {
  computeStrategy,
  countLapTypes,
  estimateFuel,
  fromLiters,
  toLiters,
} from "../assets/js/fuel-strategy.mjs";

test("fuel unit conversions round-trip liters and gallons", () => {
  const gallons = fromLiters(37.8541, "gal");
  assert.ok(Math.abs(gallons - 10) < 1e-10);
  assert.ok(Math.abs(toLiters(gallons, "gal") - 37.8541) < 1e-10);
});

test("overlapping caution ranges count each lap only once", () => {
  assert.deepEqual(countLapTypes(1, 8, [
    { startLap: 2, laps: 4 },
    { startLap: 4, laps: 3 },
  ]), { green: 3, caution: 5 });
});

test("fuel estimate accounts for cautions and a full pit stop", () => {
  assert.equal(estimateFuel({
    tank: 100,
    burn: 10,
    cautionFactor: 0.5,
    currentLap: 6,
    pitStops: [{ lap: 4, fillLiters: null }],
    cautions: [{ startLap: 2, laps: 1 }],
  }), 80);
});

test("fuel estimate supports partial pit fills and out-of-order stop logs", () => {
  const result = estimateFuel({
    tank: 100,
    burn: 10,
    cautionFactor: 0.5,
    currentLap: 8,
    pitStops: [
      { lap: 6, fillLiters: 40 },
      { lap: 3, fillLiters: null },
    ],
    cautions: [],
  });
  assert.equal(result, 20);
});

test("no stop is needed when fuel covers the remaining laps", () => {
  const result = computeStrategy({
    tank: 100, burn: 10, cautionFactor: 0.5, totalLaps: 10,
    currentLap: 8, fuel: 30, marginLaps: 0, expectedCautionLaps: 0,
  });
  assert.equal(result.status, "NO_STOP_NEEDED");
  assert.equal(result.stops, 0);
});

test("one-stop strategy reports the earliest and latest pit laps", () => {
  const result = computeStrategy({
    tank: 100, burn: 10, cautionFactor: 0.5, totalLaps: 20,
    currentLap: 5, fuel: 90, marginLaps: 1, expectedCautionLaps: 0,
  });
  assert.equal(result.stops, 1);
  assert.equal(result.earliest, 11);
  assert.equal(result.latest, 13);
});

test("strategy reports two required stops", () => {
  const result = computeStrategy({
    tank: 100, burn: 10, cautionFactor: 0.5, totalLaps: 30,
    currentLap: 5, fuel: 60, marginLaps: 0, expectedCautionLaps: 0,
  });
  assert.equal(result.stops, 2);
});

test("expected caution laps extend fuel range", () => {
  const result = computeStrategy({
    tank: 100, burn: 10, cautionFactor: 0.5, totalLaps: 20,
    currentLap: 5, fuel: 10, marginLaps: 0, expectedCautionLaps: 2,
  });
  assert.equal(result.lapsLeft, 2);
});

test("tire stint limit can bind before the fuel window", () => {
  const result = computeStrategy({
    tank: 100, burn: 10, cautionFactor: 0.5, totalLaps: 20,
    currentLap: 5, fuel: 90, marginLaps: 1, expectedCautionLaps: 0,
    tireMaxLaps: 3, lastTireLap: 5,
  });
  assert.equal(result.bindingConstraint, "tires");
  assert.equal(result.latest, 8);
});

test("invalid inputs and a margin beyond tank range return errors", () => {
  const base = {
    tank: 100, burn: 10, cautionFactor: 0.5, totalLaps: 20,
    currentLap: 5, fuel: 90, marginLaps: 1, expectedCautionLaps: 0,
  };
  assert.ok(computeStrategy({ ...base, burn: 0 }).error);
  assert.ok(computeStrategy({ ...base, tank: -1 }).error);
  assert.ok(computeStrategy({ ...base, currentLap: 21 }).error);
  assert.ok(computeStrategy({ ...base, marginLaps: 10 }).error);
});

test("extreme inputs fail explicitly instead of returning non-finite strategy data", () => {
  const result = computeStrategy({
    tank: 1e308, burn: 1e-308, cautionFactor: 1, totalLaps: 20,
    currentLap: 1, fuel: 1e308, marginLaps: 0, expectedCautionLaps: 0,
  });
  assert.ok(result.error);
  assert.ok(countLapTypes(0, Number.MAX_SAFE_INTEGER, []).error);
  assert.ok(toLiters(1e308, "gal").error);
});

test("an impossible pit window is reported as infeasible", () => {
  const result = computeStrategy({
    tank: 100, burn: 10, cautionFactor: 0.5, totalLaps: 20,
    currentLap: 5, fuel: 90, marginLaps: 1, expectedCautionLaps: 0,
    tireMaxLaps: 3, lastTireLap: 5,
  });
  assert.equal(result.status, "INFEASIBLE");
});

test("finished races are reported without requiring a pit stop", () => {
  const result = computeStrategy({
    tank: 100, burn: 10, cautionFactor: 0.5, totalLaps: 20,
    currentLap: 20, fuel: 0, marginLaps: 0, expectedCautionLaps: 0,
  });
  assert.equal(result.status, "FINISHED");
});
