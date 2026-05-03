(function () {
  const currentScript = document.currentScript;
  const src = currentScript && currentScript.src ? currentScript.src : "";
  const basePath = src.replace(/kids-room\.js(\?.*)?$/i, "");

  const files = [
    "kids-room-core.js",
    "kids-room-inventory-font.js",
    "kids-room-community.js",
    "kids-room-shop-match-patch.js",
    "kids-room-events.js",
  ];

  const VERSION = "20260503-final-guest-name-font-1";

  function loadScript(fileName) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${basePath}${fileName}?v=${VERSION}`;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${fileName}`));
      document.head.appendChild(script);
    });
  }

  async function boot() {
    for (const file of files) {
      await loadScript(file);
    }

    if (window.MathnerKidsRoom && typeof window.MathnerKidsRoom.start === "function") {
      window.MathnerKidsRoom.start();
    }
  }

  boot().catch((error) => {
    console.error("[MathnerKidsRoom] boot failed:", error);
  });
})();
