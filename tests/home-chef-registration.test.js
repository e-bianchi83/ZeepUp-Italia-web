const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(
  path.join(root, "home-chef-registration.html"),
  "utf8"
);
const migration = fs.readFileSync(
  path.join(root, "supabase", "add_home_chef_address_column.sql"),
  "utf8"
);

test("home-chef registration collects an accessible required street address", () => {
  assert.match(page, /<label for="chef-address">Indirizzo/);
  assert.match(
    page,
    /<input[\s\S]*?id="chef-address"[\s\S]*?name="address"[\s\S]*?autocomplete="street-address"[\s\S]*?required/
  );
});

test("home-chef registration collects a separate required street number", () => {
  assert.match(page, /<label for="chef-street-number">Numero civico/);
  assert.match(
    page,
    /<input[\s\S]*?id="chef-street-number"[\s\S]*?name="street_number"[\s\S]*?required/
  );
});

test("home-chef registration submits the address and street number to Supabase", () => {
  assert.match(page, /address:\s*formData\.get\("address"\)\?\.trim\(\)/);
  assert.match(
    page,
    /street_number:\s*formData\.get\("street_number"\)\?\.trim\(\)/
  );
  assert.match(page, /const TABLE_NAME = "home_chef_registration_italia"/);
});

test("Supabase migration manages the home-chef address column", () => {
  assert.match(
    migration,
    /alter table public\.home_chef_registration_italia[\s\S]*add column if not exists address text/i
  );
});

test("Supabase migration manages the home-chef street-number column", () => {
  const streetNumberMigration = fs.readFileSync(
    path.join(root, "supabase", "add_home_chef_street_number_column.sql"),
    "utf8"
  );

  assert.match(
    streetNumberMigration,
    /alter table public\.home_chef_registration_italia[\s\S]*add column if not exists street_number text/i
  );
});
