/** Load Alpine after portfolio JSON is ready */
(function () {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.body.appendChild(s);
    });
  }

  async function boot() {
    await window.portfolioDataReady;
    await loadScript("/assets/js/app.js");
    await loadScript("/assets/js/vendor/alpine.min.js");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
