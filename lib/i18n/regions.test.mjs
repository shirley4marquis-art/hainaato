import test from "node:test";
import assert from "node:assert/strict";
import { autoTranslateLang, normalizeLangParam, isSupportedLang } from "./regions.ts";

test("region -> language mapping", () => {
  assert.equal(autoTranslateLang("VE"), "es");
  assert.equal(autoTranslateLang("ve"), "es");
  assert.equal(autoTranslateLang("CO"), "es");
  assert.equal(autoTranslateLang("BR"), "pt");
  assert.equal(autoTranslateLang("FR"), "fr");
  assert.equal(autoTranslateLang("RU"), "ru");
  assert.equal(autoTranslateLang("SA"), "ar");
  assert.equal(autoTranslateLang("TW"), "zh-TW");
  assert.equal(autoTranslateLang("HK"), "zh-TW");
});

test("unknown / missing country falls back to English (no translation)", () => {
  assert.equal(autoTranslateLang("US"), "en");
  assert.equal(autoTranslateLang("GB"), "en");
  assert.equal(autoTranslateLang(null), "en");
  assert.equal(autoTranslateLang(undefined), "en");
  assert.equal(autoTranslateLang(""), "en");
});

test("?lang= override normalisation", () => {
  assert.equal(normalizeLangParam("es"), "es");
  assert.equal(normalizeLangParam("ES"), "es");
  assert.equal(normalizeLangParam("es-VE"), "es");
  assert.equal(normalizeLangParam("pt-BR"), "pt");
  assert.equal(normalizeLangParam("zh"), "zh-CN");
  assert.equal(normalizeLangParam("zh-TW"), "zh-TW");
  assert.equal(normalizeLangParam("klingon"), null);
  assert.equal(normalizeLangParam(""), null);
  assert.equal(normalizeLangParam(null), null);
});

test("isSupportedLang", () => {
  assert.equal(isSupportedLang("es"), true);
  assert.equal(isSupportedLang("en"), true);
  assert.equal(isSupportedLang("xx"), false);
  assert.equal(isSupportedLang(null), false);
});
