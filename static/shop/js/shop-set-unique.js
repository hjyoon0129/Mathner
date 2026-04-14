window.ShopApp = window.ShopApp || {};

window.ShopApp.setUnique = {
  init() {
    this.app = window.ShopApp;
    this.bindUniqueCards();
    this.bindUniqueHoverFX();
    this.decorateUniqueCards();
  },

  decorateUniqueCards() {
    document.querySelectorAll(".shop-unique-card").forEach((card) => {
      if (card.querySelector(".shop-unique-float-particles")) return;

      const particleLayer = document.createElement("div");
      particleLayer.className = "shop-unique-float-particles";
      particleLayer.innerHTML = `
        <span class="unique-float-dot dot-1"></span>
        <span class="unique-float-dot dot-2"></span>
        <span class="unique-float-dot dot-3"></span>
        <span class="unique-float-dot dot-4"></span>
        <span class="unique-float-dot dot-5"></span>
      `;

      const thumb = card.querySelector(".shop-unique-thumb");
      if (thumb) {
        thumb.appendChild(particleLayer);
      }
    });
  },

  bindUniqueHoverFX() {
    document.querySelectorAll(".shop-unique-card").forEach((card) => {
      const thumb = card.querySelector(".shop-unique-thumb");
      if (!thumb) return;

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rx = ((y / rect.height) - 0.5) * -5;
        const ry = ((x / rect.width) - 0.5) * 7;

        card.style.setProperty("--ux", `${x}px`);
        card.style.setProperty("--uy", `${y}px`);
        card.style.setProperty("--tilt-x", `${rx.toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${ry.toFixed(2)}deg`);
      });

      card.addEventListener("mouseleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  },

  bindUniqueCards() {
    const app = this.app;

    document.querySelectorAll(".shop-unique-card .shop-select-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".shop-unique-card");
        if (!card) return;

        const itemId = String(card.dataset.itemId || "");
        const ownedQty = Number(app.state.ownedMap[itemId] || 0);
        const isPremium = card.dataset.isPremium === "true";

        if (ownedQty > 0) return;

        if (isPremium) {
          app.openPremiumModal();
          return;
        }

        if (app.state.activeMainTab !== "unique") return;

        card.classList.toggle("selected");

        if (card.classList.contains("selected")) {
          this.spawnSelectBurst(card);
        }

        app.updateSelectButtons();
        app.renderSummary();
      });
    });
  },

  spawnSelectBurst(card) {
    const thumb = card.querySelector(".shop-unique-thumb");
    if (!thumb) return;

    const burst = document.createElement("div");
    burst.className = "shop-unique-select-burst";
    burst.innerHTML = `
      <span class="burst-line line-1"></span>
      <span class="burst-line line-2"></span>
      <span class="burst-line line-3"></span>
      <span class="burst-line line-4"></span>
      <span class="burst-line line-5"></span>
      <span class="burst-line line-6"></span>
    `;
    thumb.appendChild(burst);

    setTimeout(() => {
      burst.remove();
    }, 900);
  },
};