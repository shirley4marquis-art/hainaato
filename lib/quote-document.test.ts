import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLineItems,
  estimateVenezuelaNationalization,
  quoteCifTotal,
  quotePriceType,
} from "./quote-document";

test("Venezuela nationalization estimate uses CIF plus duty, VAT and luxury preview", () => {
  const preview = estimateVenezuelaNationalization({
    fobValue: 30000,
    freightCost: 800,
    insuranceCost: 200,
    engineDisplacementLiters: 1.8,
    luxuryThreshold: 50000,
  });

  assert.equal(preview.importDutyRate, 0.2);
  assert.equal(preview.customsServiceFee, 310);
  assert.equal(preview.importDuty, 6200);
  assert.equal(preview.vat, 6001.6);
  assert.equal(preview.luxuryRate, 0);
  assert.equal(preview.total, 12511.6);
});

test("HAINA AUTO quotes default to CIF and do not add freight or insurance again", () => {
  const quote = {
    incoterm: null,
    inlandTransportCost: 120,
    exportDocumentationCost: 180,
    freightCost: 950,
    insuranceCost: 210,
    items: [{ fobFinal: 35000, qty: 2 }],
  };

  assert.equal(quotePriceType(quote.incoterm), "CIF");
  assert.equal(quoteCifTotal(quote), 70000);

  const preview = estimateVenezuelaNationalization({
    cifValue: quoteCifTotal(quote),
    freightCost: 950,
    insuranceCost: 210,
    engineDisplacementLiters: 2.0,
  });
  assert.equal(preview.cifValue, 70000);
});

test("CIF PDF line items mark freight and insurance as included", () => {
  const quote = {
    language: "es" as const,
    incoterm: "CIF" as const,
    inlandTransportCost: 120,
    exportDocumentationCost: 180,
    freightCost: 950,
    insuranceCost: 210,
    items: [
      {
        make: "JAC",
        model: "T9",
        condition: "new" as const,
        qty: 1,
        fobOriginal: 9500,
        fobFinal: 9500,
      },
    ],
  };

  const rows = buildLineItems(quote);
  assert.equal(rows[0].total, 9500);
  assert.equal(rows.some((row) => row.label.includes("Transporte Interno")), false);
  assert.equal(rows.find((row) => row.label.includes("Flete"))?.totalText, "Incluido en CIF");
  assert.equal(rows.find((row) => row.label.includes("Seguro"))?.totalText, "Incluido en CIF");
});

test("Explicit FOB quotes can add supplied logistics costs", () => {
  const quote = {
    incoterm: "FOB",
    inlandTransportCost: 120,
    exportDocumentationCost: 180,
    freightCost: 950,
    insuranceCost: 210,
    items: [{ fobFinal: 35000, qty: 1 }],
  };

  assert.equal(quotePriceType(quote.incoterm), "FOB");
  assert.equal(quoteCifTotal(quote), 36460);
});
