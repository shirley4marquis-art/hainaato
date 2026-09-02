import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLangParam, isSupportedLang } from "./regions.ts";

test("manual ?lang= override normalisation", () => {
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
