import test from "node:test";
import assert from "node:assert/strict";
import { computeQuoteTotals, decomposeCif } from "./quote-totals";

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

const cifComponents = (b: ReturnType<typeof decomposeCif>) =>
  b.goodsValue + b.exportClearance + b.originHandling + b.oceanFreight + b.marineInsurance + b.documentation + b.billOfLading;

test("CIF breakdown always sums back to the exact CIF total", () => {
  for (const cif of [3000, 8393.65, 15993.61, 42000, 128500.5]) {
    for (const units of [1, 2, 5]) {
      const b = decomposeCif(cif, { units, incoterm: "CIF" });
      assert.ok(Math.abs(cifComponents(b) - cif) < 0.005, `sum ${cifComponents(b)} != ${cif}`);
      assert.equal(b.cifTotal, cif);
      assert.ok(b.goodsValue > 0, `goods value ${b.goodsValue} must stay positive for CIF ${cif}`);
      assert.equal(b.estimated, true);
    }
  }
});

test("CIF breakdown keeps a realistic goods share for a low-value unit", () => {
  const b = decomposeCif(3000, { units: 1, incoterm: "CIF" });
  // Shipping is scaled so goods value never drops below ~38% of CIF.
  assert.ok(b.goodsValue >= 3000 * 0.37);
  assert.ok(b.oceanFreight > 0 && b.marineInsurance > 0);
});

test("CIF breakdown uses the desk's own figures for an explicit FOB quote", () => {
  const b = decomposeCif(36460, {
    units: 1,
    incoterm: "FOB",
    freightCost: 950,
    insuranceCost: 210,
    inlandTransportCost: 120,
    exportDocumentationCost: 180,
  });
  assert.equal(b.oceanFreight, 950);
  assert.equal(b.marineInsurance, 210);
  assert.equal(b.originHandling, 120);
  assert.equal(b.exportClearance, 180);
  assert.equal(b.goodsValue, 35000);
  assert.equal(b.estimated, false);
  assert.ok(Math.abs(cifComponents(b) - 36460) < 0.005);
});
