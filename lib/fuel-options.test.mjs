import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFuelPreference, fuelChoiceLabel } from "./fuel-options.ts";

test("fuel preferences keep Hybrid and Electric and default to Diesel for the main gasoline/diesel feed", () => {
  assert.equal(normalizeFuelPreference("Diesel"), "Diesel");
  assert.equal(normalizeFuelPreference("Gasoline"), "Gasoline");
  assert.equal(normalizeFuelPreference("Hybrid"), "Hybrid");
  assert.equal(normalizeFuelPreference("Electric"), "Electric");
  assert.equal(fuelChoiceLabel("Hybrid"), "Hybrid");
  assert.equal(fuelChoiceLabel(undefined), "Diesel");
});
