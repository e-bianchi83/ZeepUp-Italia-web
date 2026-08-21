const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const emailFunctions = [
  "home-chef-registration-alert",
  "uk-early-signup",
  "uk-partner-registration",
];
const newLogo =
  "https://www.zeepup.com/assets/images/brand/zeepup-header-new.png?v=20260820-3";

for (const functionName of emailFunctions) {
  const source = fs.readFileSync(
    path.join(root, "supabase", "functions", functionName, "index.ts"),
    "utf8"
  );

  test(`${functionName} uses the black ZeepUp email logo`, () => {
    assert.match(source, new RegExp(newLogo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(source, /assets\/images\/brand\/zeepup-logo\.png/);
  });

  test(`${functionName} forces a visible white email canvas`, () => {
    assert.match(source, /<meta name="color-scheme" content="light only">/);
    assert.match(source, /<body bgcolor="#ffffff"[^>]*background:#ffffff/);
    assert.match(
      source,
      /<table role="presentation" width="100%"[^>]*bgcolor="#ffffff"[^>]*background:#ffffff/
    );
    assert.match(
      source,
      /<td align="center" bgcolor="#ffffff"[^>]*background:#ffffff/
    );
  });
}
