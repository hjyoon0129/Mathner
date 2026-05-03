// static/shop/js/kids-shop-05-summary-buy.js

(function () {
  "use strict";

  const S = window.MathnerShop;
  if (!S) return;

  function getVisibleSelectedCards() {
    let selector = "";

    if (S.state.activeMainTab === "effect") {
      selector = "#shopEffectsSection .effect-card.selected";
    } else if (S.state.activeMainTab === "set") {
      selector = "#shopSetSection .cute-item-card.selected";
    } else if (S.state.activeMainTab === "unique") {
      selector = "#shopUniqueSection .cute-item-card.selected";
    } else if (S.state.activeMainTab === "font") {
      selector = "#shopItemsSection .font-card.selected";
    } else {
      selector = "#shopItemsSection .cute-item-card.selected:not(.font-card)";
    }

    return Array.from(document.querySelectorAll(selector)).filter((card) => {
      return card.style.display !== "none" && !card.classList.contains("is-owned");
    });
  }

  function renderSummary() {
    const selectedCards = getVisibleSelectedCards();
    let totalCost = 0;

    if (S.els.summaryList) {
      S.els.summaryList.innerHTML = "";
    }

    if (selectedCards.length === 0) {
      if (S.els.summaryList) {
        S.els.summaryList.innerHTML = `<div class="summary-empty">담은 아이템이 없어요.</div>`;
      }
    } else {
      selectedCards.forEach((card) => {
        const isEffect = card.classList.contains("effect-card");
        const name = isEffect ? card.dataset.effectName : card.dataset.itemName;
        const price = Number(isEffect ? card.dataset.effectPrice : card.dataset.itemPrice) || 0;

        totalCost += price;

        const item = document.createElement("div");
        item.className = "summary-item";
        item.textContent = `${name} · ⭐ ${price}`;
        S.els.summaryList.appendChild(item);
      });
    }

    const remain = S.state.currentStars - totalCost;
    const enoughStars = remain >= 0;

    if (S.els.summaryCount) S.els.summaryCount.textContent = `${selectedCards.length}개`;
    if (S.els.summaryCost) S.els.summaryCost.textContent = String(totalCost);

    if (S.els.summaryRemain) {
      S.els.summaryRemain.textContent = String(Math.max(0, remain));
      S.els.summaryRemain.style.color = enoughStars ? "#2f3a45" : "#e84848";
    }

    if (S.els.buyBtn) {
      S.els.buyBtn.disabled = S.state.isBuying || selectedCards.length === 0 || !enoughStars;
      S.els.buyBtn.style.opacity = S.els.buyBtn.disabled ? "0.58" : "1";
    }
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": S.getCsrfToken()
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({
      ok: false,
      error: "서버 응답을 읽지 못했어요."
    }));

    if (typeof data.ok === "undefined") {
      data.ok = response.ok;
    }

    return data;
  }

  function markBoughtItemsAsOwned(ids, result) {
    if (Array.isArray(result.bought_items) && result.bought_items.length > 0) {
      result.bought_items.forEach((item) => {
        const itemId = item.item_id || item.id;
        if (itemId != null) {
          S.state.ownedMap[String(itemId)] = item.quantity || 1;
        }
      });
      return;
    }

    ids.forEach((id) => {
      S.state.ownedMap[String(id)] = 1;
    });
  }

  function markBoughtEffectsAsOwned(effectKeys, result) {
    if (Array.isArray(result.bought_effects) && result.bought_effects.length > 0) {
      result.bought_effects.forEach((effect) => {
        const effectKey = effect.effect_key || effect.key;
        if (effectKey) {
          S.state.ownedEffectMap[S.normalizeKey(effectKey)] = effect.quantity || 1;
        }
      });
      return;
    }

    effectKeys.forEach((key) => {
      S.state.ownedEffectMap[S.normalizeKey(key)] = 1;
    });
  }

  function restoreBuyButtonText() {
    if (!S.els.buyBtn) return;
    S.els.buyBtn.textContent = "구매하기 ✨";
  }

  async function handleBuyClick() {
    if (S.state.isBuying) return;

    const selectedCards = getVisibleSelectedCards();

    if (selectedCards.length === 0) {
      alert("먼저 아이템을 담아주세요.");
      return;
    }

    const totalCost = selectedCards.reduce((sum, card) => {
      const isEffect = card.classList.contains("effect-card");
      const price = Number(isEffect ? card.dataset.effectPrice : card.dataset.itemPrice) || 0;
      return sum + price;
    }, 0);

    if (S.state.currentStars < totalCost) {
      alert("별이 부족해요.");
      renderSummary();
      return;
    }

    const isEffectPurchase = S.state.activeMainTab === "effect";
    const url = isEffectPurchase ? S.state.buyEffectsUrl : S.state.buyUrl;

    const ids = selectedCards.map((card) => {
      if (isEffectPurchase) return String(card.dataset.effectId || "");
      return Number(card.dataset.itemId || 0);
    }).filter(Boolean);

    if (!url) {
      alert("구매 주소가 설정되지 않았어요.");
      return;
    }

    S.state.isBuying = true;

    if (S.els.buyBtn) {
      S.els.buyBtn.textContent = "구매 중...";
      S.els.buyBtn.disabled = true;
    }

    try {
      const payload = isEffectPurchase ? { effect_keys: ids } : { item_ids: ids };
      const result = await postJson(url, payload);

      if (!result.ok) {
        if (result.already_owned) {
          alert("이미 보유한 아이템이 있어요. 화면을 다시 확인할게요.");
          S.items.applyOwnedState();
          renderSummary();
          return;
        }

        alert(result.error || "구매에 실패했어요.");
        return;
      }

      S.state.currentStars = Number(
        result.remaining_stars ?? Math.max(0, S.state.currentStars - totalCost)
      );

      if (S.els.starsLabel) {
        S.els.starsLabel.textContent = String(S.state.currentStars);
      }

      if (isEffectPurchase) {
        markBoughtEffectsAsOwned(ids, result);
      } else {
        markBoughtItemsAsOwned(ids, result);
      }

      selectedCards.forEach((card) => {
        card.classList.remove("selected");
      });

      S.items.markPremiumState();
      S.items.applyOwnedState();
      renderSummary();

      alert("구매 완료! 내 방에서 바로 사용해보세요 ✨");
    } catch (error) {
      alert("서버 연결에 실패했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      S.state.isBuying = false;
      restoreBuyButtonText();
      renderSummary();
    }
  }

  S.summary = {
    getVisibleSelectedCards,
    renderSummary,
    postJson,
    markBoughtItemsAsOwned,
    markBoughtEffectsAsOwned,
    restoreBuyButtonText,
    handleBuyClick
  };
})();