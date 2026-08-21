(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ZeepBuilderMediaLimit = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MAX_BYTES = 40 * 1024 * 1024;
  const TARGET_BYTES = 37 * 1024 * 1024;

  function isMediaOverLimit(size) {
    return Number(size) > MAX_BYTES;
  }

  return { MAX_BYTES, TARGET_BYTES, isMediaOverLimit };
});
