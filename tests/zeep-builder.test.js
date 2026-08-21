const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { MAX_BYTES, isMediaOverLimit } = require("../assets/js/zeep-builder-media-limit.js");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "zeep-builder-home-chef.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

test("Zeep Builder has a responsive full-page collapsible panel", () => {
  assert.match(page, /\.panel\{[^}]*min-height:100%[^}]*overflow:visible/);
  assert.match(page, /id="panelHide"/);
  assert.match(page, /id="panelShow"/);
  assert.match(page, /function setPanelCollapsed\(collapsed\)/);
  assert.match(page, /@media\(max-width:980px\)/);
});

test("Zeep Builder rejects an actual 45 MB video at the 40 MB boundary", (t) => {
  const testVideo = path.join(os.tmpdir(), `zeepup-${process.pid}-${Date.now()}-45mb.mp4`);
  const descriptor = fs.openSync(testVideo, "w");
  fs.ftruncateSync(descriptor, 45 * 1024 * 1024);
  fs.closeSync(descriptor);
  t.after(() => fs.rmSync(testVideo, { force: true }));

  const size = fs.statSync(testVideo).size;
  assert.equal(MAX_BYTES, 40 * 1024 * 1024);
  assert.equal(size, 45 * 1024 * 1024);
  assert.equal(isMediaOverLimit(size), true);
  assert.match(page, /if\(isMediaOverLimit\(file\.size\)\)/);
  assert.match(page, /Il video deve essere inferiore a 40 MB\./);
  assert.match(page, /setStatus\('mediaStatus',message,'bad'\)/);
  assert.match(page, /\.status\.bad\{[^}]*color:#b0003a/);
  assert.doesNotMatch(page, /ff\._fetchFile/);
  assert.match(page, /new Uint8Array\(await blob\.arrayBuffer\(\)\)/);
  assert.match(page, /return false/);
});

test("local preview exposes the Zeep Builder clean route", () => {
  assert.match(server, /['"]\/zeep-builder-home-chef['"]:\s*['"]zeep-builder-home-chef\.html['"]/);
});
