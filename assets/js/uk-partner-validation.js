(function (root, factory) {
  const validation = factory();
  if (typeof module === "object" && module.exports) module.exports = validation;
  if (root) root.ZeepUpPartnerValidation = validation;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  function isValidEmail(value) {
    const email = String(value || "").trim();
    return email.length > 0 && email.length <= 254 && emailPattern.test(email);
  }

  function isValidUkMobile(value) {
    const phone = String(value || "").replace(/[\s().-]/g, "");
    return /^07\d{9}$/.test(phone) || /^\+447\d{9}$/.test(phone) || /^00447\d{9}$/.test(phone);
  }

  return { isValidEmail, isValidUkMobile };
}));
