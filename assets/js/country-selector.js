(function () {
  "use strict";

  document.querySelectorAll("[data-country-choice]").forEach(function (link) {
    link.addEventListener("click", function () {
      var country = link.getAttribute("data-country-choice");
      if (country !== "it" && country !== "uk") return;
      document.cookie = "zeepup_country=" + country + "; Max-Age=31536000; Path=/; SameSite=Lax; Secure";
    });
  });
})();
