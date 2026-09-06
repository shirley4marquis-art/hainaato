import test from "node:test";
import assert from "node:assert/strict";
import { computeQuoteTotals } from "./quote-totals";

test("CIF quote: unit price already includes freight and insurance", () => {
  const totals = computeQuoteTotals({
    incoterm: "CIF",
    items: [{ fobFinal: 35000, qty: 2 }],
    freightCost: 950,
    insuranceCost: 210,
    depositPct: 40,
  });
  assert.equal(totals.itemsSubtotal, 70000);
  assert.equal(totals.cifTotal, 70000);
  assert.equal(totals.freight, 0);
  assert.equal(totals.insurance, 0);
  assert.equal(totals.depositAmount, 28000);
  assert.equal(totals.balanceAmount, 42000);
  assert.equal(totals.customsEstimate, null);
  assert.equal(totals.grandTotal, 70000);
});

test("FOB quote: logistics costs are added to the CIF total", () => {
  const totals = computeQuoteTotals({
    incoterm: "FOB",
    items: [{ fobFinal: 35000, qty: 1 }],
    inlandTransportCost: 120,
    exportDocumentationCost: 180,
    freightCost: 950,
    insuranceCost: 210,
    depositPct: 30,
  });
  assert.equal(totals.cifTotal, 36460);
  assert.equal(totals.freight, 950);
  assert.equal(totals.insurance, 210);
  assert.equal(totals.customsBaseCifValue, 36160);
  assert.equal(totals.depositAmount, 10938);
  assert.equal(totals.balanceAmount, 25522);
});

test("customs estimate from duty percentage, rounded to cents", () => {
  const totals = computeQuoteTotals({
    incoterm: "CIF",
    items: [{ fobFinal: 19999.99, qty: 1 }],
    dutyPct: 20,
    depositPct: 40,
  });
  assert.equal(totals.customsBaseCifValue, 19999.99);
  assert.equal(totals.customsEstimate, 4000);
  assert.equal(totals.grandTotal, 23999.99);
});

test("explicit customs override wins over the duty percentage", () => {
  const totals = computeQuoteTotals({
    incoterm: "CIF",
    items: [{ fobFinal: 20000, qty: 1 }],
    dutyPct: 20,
    dutyEstimateOverride: 1234.5,
  });
  assert.equal(totals.customsEstimate, 1234.5);
  assert.equal(totals.grandTotal, 21234.5);
});

test("missing deposit percentage falls back to 40%", () => {
  const totals = computeQuoteTotals({
    incoterm: "CIF",
    items: [{ fobFinal: 10000, qty: 1 }],
    depositPct: null,
  });
  assert.equal(totals.depositPct, 40);
  assert.equal(totals.depositAmount, 4000);
});
