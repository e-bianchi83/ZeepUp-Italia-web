const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(
  path.join(__dirname, "..", "store-registration.html"),
  "utf8"
);

test("store registration does not collect or submit passwords", () => {
  assert.doesNotMatch(page, /type=["']password["']/i);
  assert.doesNotMatch(page, /name=["']password(?:_confirmation)?["']/i);
  assert.doesNotMatch(page, /formData\.get\(["']password/i);
});

test("store registration uses accessible field-level validation", () => {
  assert.match(page, /<form[^>]+id="store-registration-form"[^>]+novalidate/);
  assert.match(page, /invalid\.scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
  assert.match(page, /invalid\.focus\(\{ preventScroll: true \}\)/);
  assert.match(page, /field\.classList\.toggle\("has-error", Boolean\(message\)\)/);
  assert.match(page, /Completa i campi evidenziati in rosso\./);
});
