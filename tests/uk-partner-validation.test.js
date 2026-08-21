const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isValidEmail,
  isValidUkMobile,
} = require("../assets/js/uk-partner-validation.js");

test("accepts common valid email addresses", () => {
  assert.equal(isValidEmail("cook@example.co.uk"), true);
  assert.equal(isValidEmail("first.last+zeepup@example.com"), true);
  assert.equal(isValidEmail(" CHEF@EXAMPLE.ORG "), true);
});

test("rejects invalid email addresses", () => {
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail("cook@example"), false);
  assert.equal(isValidEmail("cook example@example.com"), false);
  assert.equal(isValidEmail("@example.com"), false);
});

test("accepts standard UK mobile formats", () => {
  assert.equal(isValidUkMobile("07123 456789"), true);
  assert.equal(isValidUkMobile("+44 7123 456789"), true);
  assert.equal(isValidUkMobile("0044 7123 456789"), true);
  assert.equal(isValidUkMobile("07123-456-789"), true);
});

test("rejects incomplete or non-UK mobile numbers", () => {
  assert.equal(isValidUkMobile("07123 45678"), false);
  assert.equal(isValidUkMobile("020 7946 0958"), false);
  assert.equal(isValidUkMobile("+1 202 555 0198"), false);
  assert.equal(isValidUkMobile("not a phone"), false);
});
