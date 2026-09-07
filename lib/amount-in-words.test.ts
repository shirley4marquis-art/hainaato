import test from "node:test";
import assert from "node:assert/strict";
import { amountInWords } from "./amount-in-words";

test("Spanish USD amounts, matching the reference quotation", () => {
  assert.equal(amountInWords(7600, "USD", "es"), "siete mil seiscientos dólares de los Estados Unidos de América");
  assert.equal(amountInWords(10667.36, "USD", "es"), "diez mil seiscientos sesenta y siete dólares de los Estados Unidos de América con 36/100");
  assert.equal(amountInWords(1, "USD", "es"), "uno dólares de los Estados Unidos de América");
  assert.equal(amountInWords(21000, "USD", "es"), "veintiún mil dólares de los Estados Unidos de América");
  assert.equal(amountInWords(100, "USD", "es"), "cien dólares de los Estados Unidos de América");
  assert.equal(amountInWords(315, "USD", "es"), "trescientos quince dólares de los Estados Unidos de América");
});

test("English amounts", () => {
  assert.equal(amountInWords(7600, "USD", "en"), "Seven thousand six hundred United States dollars");
  assert.equal(amountInWords(10667.36, "USD", "en"), "Ten thousand six hundred sixty-seven United States dollars and 36/100");
  assert.equal(amountInWords(42500, "EUR", "en"), "Forty-two thousand five hundred euros");
});
