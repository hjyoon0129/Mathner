(function () {
  const App = window.MathnerKidsRoom;

  App.register(function eventsModule(App) {
    const $ = App.$;
    const $$ = App.$$;
    const els = App.els;
    const state = App.state;
    const API = App.API;

    function shouldRetryGuestbookPost(result, payload) {
      if (!result || result.ok) return false;
      if (!payload || typeof payload !== "object") return false;
      if (!payload.content) return false;

      const status = Number(result.status || 0);
      const errorText = String(result.error || "").toLowerCase();

      if (status === 400 || status === 422 || status === 500) return true;
      if (errorText.includes("unexpected")) return true;
      if (errorText.includes("field")) return true;
      if (errorText.includes("invalid")) return true;
      if (errorText.includes("요청에 실패")) return true;

      return false;
    }

    async function postGuestbookWithFallback(url, payload) {
      const result = await App.postJson(url, payload);

      if (result.ok) return result;

      /*
        서버가 아직 font/effect payload를 받지 못하는 경우가 있어서
        content만 다시 보내는 fallback을 둔다.
        이렇게 하면 친구 방명록 작성 자체는 막히지 않는다.
      */
      if (shouldRetryGuestbookPost(result, payload)) {
        const fallback = await App.postJson(url, {
          content: payload.content,
        });

        if (fallback.ok) {
          return {
            ...fallback,
            style_payload_fallback_used: true,
          };
        }
      }

      return result;
    }

    App.bindStaticEvents = function bindStaticEvents() {
      $$(".side-tab-btn[data-tab-target], .btn-menu[data-tab-target]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const target = btn.dataset.tabTarget;
          if (!target) return;

          e.preventDefault();
          App.closeNamePopover();

          if (target === "edit") {
            window.switchRightEditPanel?.("avatar");
            return;
          }

          await App.activateMainTab(target);
        });
      });

      $$(".avatar-edit-subtab-btn, .kids-tab-btn").forEach((btn) => {
        if (!btn.dataset.editSubtab) return;

        btn.addEventListener("click", async () => {
          App.closeNamePopover();

          const target = btn.dataset.editSubtab || "avatar";

          App.setActiveEditSubtab(target);
          await App.loadInventoryIfNeeded(false);
        });
      });

      document.addEventListener("click", async (e) => {
        const filterBtn = e.target.closest(".inventory-filter-btn");

        if (filterBtn) {
          App.closeNamePopover();

          const group = filterBtn.dataset.filterGroup;
          const filter = filterBtn.dataset.filter || "all";

          if (group === "gender") {
            state.activeInventoryGenderFilter = filter;
            App.updateInventoryFilterButtons();
            App.renderInventory();
            return;
          }

          if (group === "type") {
            state.activeInventoryTypeFilter = filter;
            App.updateInventoryFilterButtons();
            App.renderInventory();
            return;
          }

          if (group === "set-type") {
            state.activeSetTypeFilter = filter;
            App.updateInventoryFilterButtons();
            App.renderSetInventory();
            return;
          }

          if (group === "unique-type") {
            state.activeUniqueTypeFilter = filter;
            App.updateInventoryFilterButtons();
            App.renderUniqueInventory();
            return;
          }
        }

        const clearBtn = e.target.closest("[data-clear-slot]");

        if (clearBtn) {
          App.closeNamePopover();

          const slot = App.normalizeSlotName(clearBtn.dataset.clearSlot);
          if (!App.SUPPORTED_SLOTS.has(slot)) return;

          state.draftAvatar[App.getDraftKeyBySlot(slot)] = null;

          App.renderAvatarCanvas();
          App.updateEquippedSlotState();
          App.renderInventory();
          App.renderSetInventory();
          App.renderUniqueInventory();

          return;
        }

        const equipBtn = e.target.closest('[data-action="equip-item"]');

        if (equipBtn) {
          App.closeNamePopover();

          const slot = App.normalizeSlotName(equipBtn.dataset.slot);
          const itemId = Number(equipBtn.dataset.itemId || 0);

          if (!App.SUPPORTED_SLOTS.has(slot) || !itemId) return;

          const draftKey = App.getDraftKeyBySlot(slot);
          const isSame = Number(state.draftAvatar[draftKey]) === itemId;

          state.draftAvatar[draftKey] = isSame ? null : itemId;

          App.renderAvatarCanvas();
          App.updateEquippedSlotState();
          App.renderInventory();
          App.renderSetInventory();
          App.renderUniqueInventory();

          return;
        }

        const fontBtn = e.target.closest('[data-action="select-font-item"]');

        if (fontBtn) {
          App.closeNamePopover();

          const itemId = Number(fontBtn.dataset.itemId || 0);
          const selectedItem = App.itemByItemId(itemId);

          if (!selectedItem || !App.isProfileFontItem(selectedItem)) {
            state.selectedFontItemId = null;
            state.previewFont.itemId = null;
            state.previewFont.fontKey = "";

            App.renderFontInventory({ preservePage: true });
            App.renderEffectInventory({ preservePage: true });
            App.applyLiveNicknamePreview();
            App.syncNicknameToolUI();

            return;
          }

          state.selectedFontItemId = itemId || null;
          state.previewFont.itemId = itemId || null;
          state.previewFont.fontKey = selectedItem.font_key || "";
          state.previewFont.effectKey = App.currentSelectedEffectKey();
          state.previewFont.nicknameScale = Number(state.viewerFontPref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE);
          state.previewFont.nicknameLetterSpacing = Number(state.viewerFontPref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING);

          if (els.resetFontDefaultBtn) {
            els.resetFontDefaultBtn.dataset.resetMode = "false";
          }

          App.renderFontInventory({ preservePage: true });
          App.renderEffectInventory({ preservePage: true });
          App.applyLiveNicknamePreview();
          App.syncNicknameToolUI();

          return;
        }

        const effectBtn = e.target.closest('[data-action="select-effect-item"]');

        if (effectBtn) {
          App.closeNamePopover();

          const effectKey = String(effectBtn.dataset.effectKey || "none");

          App.setEffectSelection(effectKey, { preservePage: true });
          state.previewFont.effectKey = effectKey;

          if (els.resetFontDefaultBtn) {
            els.resetFontDefaultBtn.dataset.resetMode = "false";
          }

          App.renderFontInventory({ preservePage: true });
          App.renderEffectInventory({ preservePage: true });
          App.applyLiveNicknamePreview();
          App.syncNicknameToolUI();

          return;
        }

        const dayBtn = e.target.closest('[data-action="pick-diary-date"]');

        if (dayBtn) {
          App.closeNamePopover();
          await App.handleDiaryDatePick(dayBtn.dataset.date || "");
          return;
        }

        const nameBtn = e.target.closest(".js-name-pop");

        if (nameBtn) {
          e.preventDefault();
          e.stopPropagation();

          const roomUrl = nameBtn.dataset.roomUrl || "";

          App.toggleNamePopover(nameBtn, roomUrl);
          return;
        }

        if (els.popover && !els.popover.contains(e.target)) {
          App.closeNamePopover();
        }
      });

      $$(".gender-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          App.closeNamePopover();

          state.draftAvatar.gender = btn.dataset.gender || "male";

          App.updateGenderButtons();
          App.renderAvatarCanvas();
        });
      });

      els.nicknameSizeDownBtn?.addEventListener("click", () => {
        state.previewFont.nicknameScale = App.clamp(
          Number(state.previewFont.nicknameScale ?? state.viewerFontPref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE) - 0.1,
          App.MIN_NICKNAME_SCALE,
          App.MAX_NICKNAME_SCALE
        );

        App.applyLiveNicknamePreview();
        App.syncNicknameToolUI();
      });

      els.nicknameSizeUpBtn?.addEventListener("click", () => {
        state.previewFont.nicknameScale = App.clamp(
          Number(state.previewFont.nicknameScale ?? state.viewerFontPref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE) + 0.1,
          App.MIN_NICKNAME_SCALE,
          App.MAX_NICKNAME_SCALE
        );

        App.applyLiveNicknamePreview();
        App.syncNicknameToolUI();
      });

      els.nicknameSpacingDownBtn?.addEventListener("click", () => {
        state.previewFont.nicknameLetterSpacing = App.clamp(
          Number(state.previewFont.nicknameLetterSpacing ?? state.viewerFontPref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING) - 0.5,
          App.MIN_NICKNAME_SPACING,
          App.MAX_NICKNAME_SPACING
        );

        App.applyLiveNicknamePreview();
        App.syncNicknameToolUI();
      });

      els.nicknameSpacingUpBtn?.addEventListener("click", () => {
        state.previewFont.nicknameLetterSpacing = App.clamp(
          Number(state.previewFont.nicknameLetterSpacing ?? state.viewerFontPref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING) + 0.5,
          App.MIN_NICKNAME_SPACING,
          App.MAX_NICKNAME_SPACING
        );

        App.applyLiveNicknamePreview();
        App.syncNicknameToolUI();
      });

      els.resetFontDefaultBtn?.addEventListener("click", async () => {
        state.selectedFontItemId = null;
        state.previewFont = {
          itemId: null,
          fontKey: "",
          effectKey: "none",
          nicknameScale: App.DEFAULT_NICKNAME_SCALE,
          nicknameLetterSpacing: App.DEFAULT_NICKNAME_SPACING,
        };

        App.setEffectSelection("none");

        if (els.resetFontDefaultBtn) {
          els.resetFontDefaultBtn.dataset.resetMode = "true";
        }

        App.applyLiveNicknamePreview();
        await App.saveFontPreference();
      });

      els.fontPrevBtn?.addEventListener("click", () => {
        state.fontPage = Math.max(0, state.fontPage - 1);
        App.updateFontEffectCarousels();
      });

      els.fontNextBtn?.addEventListener("click", () => {
        state.fontPage += 1;
        App.updateFontEffectCarousels();
      });

      els.effectPrevBtn?.addEventListener("click", () => {
        state.effectPage = Math.max(0, state.effectPage - 1);
        App.updateFontEffectCarousels();
      });

      els.effectNextBtn?.addEventListener("click", () => {
        state.effectPage += 1;
        App.updateFontEffectCarousels();
      });

      window.addEventListener("scroll", () => {
        if (els.popover && !els.popover.classList.contains("is-hidden")) {
          App.positionPopover();
        }
      }, { passive: true });

      let resizeTimer = null;

      window.addEventListener("resize", () => {
        if (els.popover && !els.popover.classList.contains("is-hidden")) {
          App.closeNamePopover();
        }

        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(() => {
          App.updateFontEffectCarousels();
        }, 80);
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") App.closeNamePopover();
      });

      els.popoverVisitBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (state.currentVisitUrl) {
          const url = state.currentVisitUrl;
          App.closeNamePopover();
          window.location.href = url;
        }
      });

      els.closeEditDrawerBtn?.addEventListener("click", async () => {
        App.closeNamePopover();
        await App.activateMainTab("avatar");
      });

      els.closeFontDrawerBtn?.addEventListener("click", async () => {
        App.closeNamePopover();
        await App.activateMainTab("avatar");
      });

      els.saveAvatarChangesBtn?.addEventListener("click", async () => {
        App.closeNamePopover();
        await App.saveCurrentState();
      });

      els.saveFontPreferenceBtn?.addEventListener("click", async () => {
        App.closeNamePopover();

        if (els.resetFontDefaultBtn) {
          els.resetFontDefaultBtn.dataset.resetMode = "false";
        }

        await App.saveFontPreference();
      });

      els.resetAvatarBtn?.addEventListener("click", async () => {
        App.closeNamePopover();

        const ok = await App.openConfirmModal();
        if (!ok) return;

        if (els.resetAvatarBtn) {
          els.resetAvatarBtn.disabled = true;
          els.resetAvatarBtn.textContent = "초기화 중...";
        }

        try {
          const result = await App.postJson(API.avatarResetUrl, {});

          if (!result.ok) {
            alert(result.error || "아바타 초기화에 실패했어요.");
            return;
          }

          state.avatar = App.normalizeAvatarState(result.avatar || state.avatar);
          state.draftAvatar = App.deepCopy(state.avatar);
          state.ownedItems = App.normalizeInventoryItems(result.inventory || result.items || state.ownedItems);

          if (Array.isArray(result.effects)) {
            state.ownedEffects = App.normalizeOwnedEffects(result.effects);
          }

          App.mergeEffectInventoryFromOwnedItems();
          state.inventoryLoaded = true;

          App.renderAll();
          App.openEditMode();
          App.setActiveEditSubtab(state.activeEditSubtab || "avatar");
          App.updateSaveHint("아바타가 초기화됐어요.");
        } finally {
          if (els.resetAvatarBtn) {
            els.resetAvatarBtn.disabled = false;
            els.resetAvatarBtn.textContent = "다 벗기";
          }
        }
      });

      els.visitFriendBtn?.addEventListener("click", () => {
        App.closeNamePopover();

        const username = els.friendSelect?.value || "";

        if (!username) {
          alert("먼저 친구를 골라주세요.");
          return;
        }

        window.location.href = `${API.friendAvatarBase}${username}/`;
      });

      els.goMyRoomBtn?.addEventListener("click", () => {
        App.closeNamePopover();
        window.location.href = API.myRoomUrl;
      });

      els.toggleRoomLikeBtn?.addEventListener("click", async () => {
        App.closeNamePopover();

        const username = App.ownerUsername();
        const result = await App.postJson(App.buildUrl(API.socialRoomLikeUrlBase, username, "/like/"), {});

        if (!result.ok) {
          alert(result.error || "좋아요 처리에 실패했어요.");
          return;
        }

        if (result.stats) {
          App.setRoomStats(result.stats);
        }
      });

      els.sendFriendRequestBtn?.addEventListener("click", async () => {
        App.closeNamePopover();

        const btn = els.sendFriendRequestBtn;
        const username = App.ownerUsername();

        if (!btn || !username) return;
        if (state.friendshipStatus === "accepted") return;

        btn.disabled = true;

        try {
          if (state.friendshipStatus === "pending" && state.friendshipDirection === "incoming" && state.friendshipId) {
            const result = await App.postJson(
              `${API.socialFriendRespondUrlBase}${state.friendshipId}/`,
              { action: "accept" }
            );

            if (!result.ok) {
              alert(result.error || "친구 수락에 실패했어요.");
              return;
            }

            App.applyFriendRequestActionResult({ action: "accepted", ...result });
            state.friendOptionsLoaded = false;
            await App.loadFriendSelectOptions(true);
            return;
          }

          const result = await App.postJson(`${API.socialFriendRequestUrlBase}${username}/`, {});

          if (!result.ok) {
            alert(result.error || "친구 요청 처리에 실패했어요.");
            return;
          }

          App.applyFriendRequestActionResult(result);
          state.friendOptionsLoaded = false;
          await App.loadFriendSelectOptions(true);
        } finally {
          if (state.friendshipStatus !== "accepted") {
            btn.disabled = false;
          }
        }
      });

      els.guestbookSubmitBtn?.addEventListener("click", async () => {
        App.closeNamePopover();

        const content = App.normalizeTypedText(els.guestbookContentInput?.value || "").trim();

        if (!content) {
          alert("방명록 내용을 적어주세요.");
          return;
        }

        const payload = typeof App.buildGuestbookStylePayload === "function"
          ? App.buildGuestbookStylePayload({ content })
          : {
              content,
              nickname_font_key: state.viewerFontPref.nickname_font_key || "",
              nickname_effect_key: state.viewerFontPref.nickname_effect_key || "none",
              nickname_scale: state.viewerFontPref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE,
              nickname_letter_spacing: state.viewerFontPref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING,
              content_font_key: state.viewerFontPref.content_font_key || state.viewerFontPref.nickname_font_key || "",
              content_effect_key: "none",
            };

        const result = await postGuestbookWithFallback(API.guestbookCreateUrl, payload);

        if (!result.ok) {
          alert(result.error || "방명록 작성에 실패했어요.");
          return;
        }

        if (els.guestbookContentInput) {
          els.guestbookContentInput.value = "";
        }

        await App.loadGuestbookEntries(true);
      });

      els.guestbookList?.addEventListener("click", App.handleGuestbookAction);

      els.diaryDateInput?.addEventListener("change", async () => {
        App.closeNamePopover();

        const dateStr = els.diaryDateInput.value;
        if (!dateStr) return;

        const parts = dateStr.split("-").map(Number);

        if (parts.length === 3) {
          state.calendarYear = parts[0];
          state.calendarMonth = parts[1] - 1;
        }

        App.setDiarySelectedDate(dateStr);
        await App.loadDiaryMonth(true);
        await App.loadDiaryByDate(dateStr, true);
      });

      els.diarySubmitBtn?.addEventListener("click", async () => {
        App.closeNamePopover();

        const entryId = els.diaryEntryIdInput?.value?.trim() || "";

        const rawPayload = {
          title: App.normalizeTypedText(els.diaryTitleInput?.value || "").trim(),
          content: App.normalizeTypedText(els.diaryContentInput?.value || "").trim(),
          entry_date: els.diaryDateInput?.value || state.selectedDiaryDate,
        };

        const payload = typeof App.buildDiaryStylePayload === "function"
          ? App.buildDiaryStylePayload(rawPayload)
          : {
              ...rawPayload,
              title_font_key: state.viewerFontPref.title_font_key || state.viewerFontPref.nickname_font_key || "",
              title_effect_key: state.viewerFontPref.title_effect_key || state.viewerFontPref.nickname_effect_key || "none",
              content_font_key: state.viewerFontPref.content_font_key || state.viewerFontPref.nickname_font_key || "",
              content_effect_key: "none",
            };

        if (!payload.entry_date) {
          alert("먼저 날짜를 골라주세요.");
          return;
        }

        if (!payload.title || !payload.content) {
          alert("제목과 내용을 모두 적어주세요.");
          return;
        }

        const url = entryId ? `${API.diaryUpdateUrlBase}${entryId}/update/` : API.diaryCreateUrl;
        const result = await App.postJson(url, payload);

        if (!result.ok) {
          const fallbackPayload = {
            title: payload.title,
            content: payload.content,
            entry_date: payload.entry_date,
          };

          const fallbackResult = await App.postJson(url, fallbackPayload);

          if (!fallbackResult.ok) {
            alert(result.error || fallbackResult.error || "일기 저장에 실패했어요.");
            return;
          }

          if (els.diaryEntryIdInput) {
            els.diaryEntryIdInput.value = fallbackResult.entry?.id || "";
          }
        } else if (els.diaryEntryIdInput) {
          els.diaryEntryIdInput.value = result.entry?.id || "";
        }

        await App.loadDiaryMonth(true);
        await App.loadDiaryByDate(payload.entry_date, true);
      });

      els.diaryClearBtn?.addEventListener("click", () => {
        App.closeNamePopover();
        App.clearDiaryForm(true);
      });

      els.diaryDeleteBtn?.addEventListener("click", async () => {
        App.closeNamePopover();

        const entryId = els.diaryEntryIdInput?.value?.trim() || "";

        if (!entryId) {
          alert("이 날짜에는 지울 일기가 없어요.");
          return;
        }

        await App.handleDiaryDelete(entryId);
      });

      els.diaryList?.addEventListener("click", async (e) => {
        const inlineDeleteBtn = e.target.closest(".diary-inline-delete-btn");
        if (!inlineDeleteBtn) return;

        App.closeNamePopover();
        await App.handleDiaryDelete(inlineDeleteBtn.dataset.entryId);
      });

      els.calendarPrevBtn?.addEventListener("click", async () => {
        App.closeNamePopover();

        state.calendarMonth -= 1;

        if (state.calendarMonth < 0) {
          state.calendarMonth = 11;
          state.calendarYear -= 1;
        }

        await App.loadDiaryMonth(true);
      });

      els.calendarNextBtn?.addEventListener("click", async () => {
        App.closeNamePopover();

        state.calendarMonth += 1;

        if (state.calendarMonth > 11) {
          state.calendarMonth = 0;
          state.calendarYear += 1;
        }

        await App.loadDiaryMonth(true);
      });
    };

    App.init = async function init() {
      document.body.classList.add("kids-theme-body");

      App.setDiarySelectedDate(state.selectedDiaryDate);

      if (els.fontEffectSelect) {
        els.fontEffectSelect.value = state.viewerFontPref.nickname_effect_key || "none";
      }

      App.mergeEffectInventoryFromOwnedItems();

      App.setVisible(els.avatarHeroCard, true, "block");
      App.setVisible(els.stageContentCard, false, "block");

      if (els.avatarSideEdit) {
        els.avatarSideEdit.setAttribute("hidden", "hidden");
        els.avatarSideEdit.setAttribute("aria-hidden", "true");
        els.avatarSideEdit.style.display = "none";
      }

      App.renderCalendar();
      App.renderAll();

      App.setFriendshipState(state.friendshipStatus, state.friendshipDirection, state.friendshipId);

      App.bindStaticEvents();

      App.setActiveSideTab("avatar");
      App.updateMainPanels("avatar");

      if (!App.isOwner) {
        await App.recordRoomVisit();
      }

      await App.loadRoomStats(true);
      await App.loadFriendSelectOptions();

      App.applyCurrentFontPreferenceToEditors();
      App.updateFontEffectCarousels();
      App.closeNamePopover();
    };
  });
})();

/* =========================================================
   FINAL PATCH 20260503
   Guestbook nickname font final fix
   - 방명록/댓글 닉네임 이펙트는 유지
   - 방명록/댓글 닉네임 font-family를 마지막에 강제 적용
   - 옷/폰트 분류는 건드리지 않음
   ========================================================= */

(function () {
  const App = window.MathnerKidsRoom;

  if (!App || typeof App.register !== "function") return;

  App.register(function finalGuestNameFontPatch(App) {
    const $$ = App.$$;
    const els = App.els;
    const state = App.state;

    const FONT_FAMILY_MAP = {
      default: 'var(--kids-font), sans-serif',
      pretendard: 'var(--kids-font), sans-serif',

      jua: '"Jua", var(--kids-font), sans-serif',
      bubblegum_sans: '"Jua", var(--kids-font), sans-serif',

      gamja_flower: '"Gamja Flower", var(--kids-font), cursive',
      delius_swash_caps: '"Gamja Flower", var(--kids-font), cursive',

      dongle: '"Dongle", var(--kids-font), sans-serif',
      boogaloo: '"Dongle", var(--kids-font), sans-serif',

      hi_melody: '"Hi Melody", var(--kids-font), cursive',
      love_ya_like_a_sister: '"Hi Melody", var(--kids-font), cursive',

      do_hyeon: '"Do Hyeon", var(--kids-font), sans-serif',
      luckiest_guy: '"Do Hyeon", var(--kids-font), sans-serif',

      gaegu: '"Gaegu", var(--kids-font), cursive',
      coming_soon: '"Gaegu", var(--kids-font), cursive',

      cute_font: '"Cute Font", var(--kids-font), cursive',
      life_savers: '"Cute Font", var(--kids-font), cursive',

      single_day: '"Single Day", var(--kids-font), cursive',
      chewy: '"Single Day", var(--kids-font), cursive',

      poor_story: '"Poor Story", var(--kids-font), cursive',
      cabin_sketch: '"Poor Story", var(--kids-font), cursive',

      gugi: '"Gugi", var(--kids-font), cursive',
      mouse_memoirs: '"Gugi", var(--kids-font), cursive',

      black_han_sans: '"Black Han Sans", var(--kids-font), sans-serif',
      londrina_shadow: '"Black Han Sans", var(--kids-font), sans-serif',

      nanum_pen: '"Nanum Pen Script", var(--kids-font), cursive',
      nanum_pen_script: '"Nanum Pen Script", var(--kids-font), cursive',
      amatic_sc: '"Nanum Pen Script", var(--kids-font), cursive',

      gowun_dodum: '"Gowun Dodum", var(--kids-font), sans-serif',
      capriola: '"Gowun Dodum", var(--kids-font), sans-serif',

      sunflower: '"Sunflower", var(--kids-font), sans-serif',
      mclaren: '"Sunflower", var(--kids-font), sans-serif',

      gowun_batang: '"Gowun Batang", var(--kids-font), serif',
      dokdo: '"Dokdo", var(--kids-font), cursive',
      modak: '"Modak", var(--kids-font), cursive',
    };

    const FONT_SIZE_MAP = {
      default: 18,
      pretendard: 18,

      jua: 19,
      bubblegum_sans: 19,

      gamja_flower: 23,
      delius_swash_caps: 23,

      dongle: 30,
      boogaloo: 30,

      hi_melody: 24,
      love_ya_like_a_sister: 24,

      do_hyeon: 19,
      luckiest_guy: 19,

      gaegu: 22,
      coming_soon: 22,

      cute_font: 30,
      life_savers: 30,

      single_day: 23,
      chewy: 23,

      poor_story: 22,
      cabin_sketch: 22,

      gugi: 19,
      mouse_memoirs: 19,

      black_han_sans: 18,
      londrina_shadow: 18,

      nanum_pen: 26,
      nanum_pen_script: 26,
      amatic_sc: 26,

      gowun_dodum: 19,
      capriola: 19,

      sunflower: 19,
      mclaren: 19,

      gowun_batang: 19,
      dokdo: 25,
      modak: 21,
    };

    const FONT_WEIGHT_MAP = {
      default: 900,
      pretendard: 900,
      dongle: 700,
      boogaloo: 700,
      gaegu: 700,
      coming_soon: 700,
      sunflower: 700,
      mclaren: 700,
    };

    function normalizePlainKey(value = "") {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_가-힣]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    }

    function normalizeFontKey(fontKey = "") {
      if (typeof App.normalizeGuestbookFontKey === "function") {
        return App.normalizeGuestbookFontKey(fontKey || "");
      }

      if (typeof App.normalizeFontKey === "function") {
        return App.normalizeFontKey(fontKey || "");
      }

      return normalizePlainKey(fontKey || "");
    }

    function normalizeEffectKey(effectKey = "none") {
      if (typeof App.normalizeGuestbookEffectKey === "function") {
        return App.normalizeGuestbookEffectKey(effectKey || "none") || "none";
      }

      if (typeof App.normalizeEffectKey === "function") {
        return App.normalizeEffectKey(effectKey || "none") || "none";
      }

      return normalizePlainKey(effectKey || "none") || "none";
    }

    function effectClassFromKey(effectKey = "none") {
      if (typeof App.effectKeyToClass === "function") {
        return App.effectKeyToClass(effectKey || "none");
      }

      return `effect-${normalizeEffectKey(effectKey).replace(/_/g, "-")}`;
    }

    function fontClassFromKey(fontKey = "") {
      if (typeof App.fontClassFromKey === "function") {
        return App.fontClassFromKey(fontKey || "");
      }

      const key = normalizeFontKey(fontKey || "");
      return key ? `font-${key}` : "font-default";
    }

    function safeNumber(value, fallback) {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    }

    function clamp(value, min, max, fallback) {
      const n = safeNumber(value, fallback);
      return Math.min(max, Math.max(min, n));
    }

    function safeScale(value) {
      return clamp(
        value,
        App.MIN_NICKNAME_SCALE ?? 0.8,
        App.MAX_NICKNAME_SCALE ?? 1.6,
        App.DEFAULT_NICKNAME_SCALE ?? 1
      );
    }

    function safeSpacing(value) {
      return clamp(
        value,
        App.MIN_NICKNAME_SPACING ?? -1,
        App.MAX_NICKNAME_SPACING ?? 6,
        App.DEFAULT_NICKNAME_SPACING ?? 0
      );
    }

    function nicknameInlineStyle(fontKey = "", scale = 1, spacing = 0) {
      const key = normalizeFontKey(fontKey || "");
      const family = FONT_FAMILY_MAP[key] || FONT_FAMILY_MAP.default;
      const baseSize = FONT_SIZE_MAP[key] || FONT_SIZE_MAP.default;
      const weight = FONT_WEIGHT_MAP[key] || 400;

      const sizePx = Math.max(14, Math.round(baseSize * safeScale(scale)));
      const spacingPx = safeSpacing(spacing);

      return [
        `font-family:${family} !important`,
        `font-size:${sizePx}px !important`,
        `font-weight:${weight} !important`,
        `letter-spacing:${spacingPx}px !important`,
        "line-height:1.05 !important",
        "white-space:nowrap !important",
      ].join("; ");
    }

    function clearNameTextClasses(className = "") {
      return String(className || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((cls) => !cls.startsWith("font-") && !cls.startsWith("effect-"))
        .join(" ");
    }

    /*
      핵심:
      방명록 닉네임 생성 함수를 마지막 모듈에서 덮는다.
      여기서 font-family까지 inline으로 박아야 CSS 우선순위에 안 눌린다.
    */
    App.buildNameTextClass = function buildNameTextClassFinal(fontKey = "", effectKey = "none") {
      const normalizedFontKey = normalizeFontKey(fontKey || "");
      const normalizedEffectKey = normalizeEffectKey(effectKey || "none");

      return [
        "guest-name-btn-text",
        fontClassFromKey(normalizedFontKey),
        effectClassFromKey(normalizedEffectKey),
      ].filter(Boolean).join(" ");
    };

    App.makeNameButton = function makeNameButtonFinal(
      displayName,
      roomUrl,
      extraClass = "",
      fontKey = "",
      effectKey = "none",
      scale = App.DEFAULT_NICKNAME_SCALE,
      spacing = App.DEFAULT_NICKNAME_SPACING
    ) {
      const resolvedName =
        typeof App.resolveMessageDisplayName === "function"
          ? App.resolveMessageDisplayName(displayName, roomUrl)
          : String(displayName || "Player");

      const safeName = App.escapeHtml(resolvedName || "Player");
      const safeRoomUrl = App.escapeHtml(roomUrl || "");

      const normalizedFontKey = normalizeFontKey(
        fontKey ||
          state.viewerFontPref?.nickname_font_key ||
          state.ownerFontPref?.nickname_font_key ||
          ""
      );

      const normalizedEffectKey = normalizeEffectKey(effectKey || "none");

      const buttonClasses = [
        "guest-name-btn",
        "guest-name-label-btn",
        "js-name-pop",
        extraClass,
      ].filter(Boolean).join(" ");

      const textClasses = App.buildNameTextClass(normalizedFontKey, normalizedEffectKey);
      const inlineStyle = nicknameInlineStyle(normalizedFontKey, scale, spacing);

      return `
        <button
          type="button"
          class="${buttonClasses}"
          data-room-url="${safeRoomUrl}"
          data-font-key="${App.escapeHtml(normalizedFontKey)}"
          data-effect-key="${App.escapeHtml(normalizedEffectKey)}"
          aria-label="${safeName}의 방 보기"
        >
          <span class="guest-name-label-shell">
            <span
              class="${textClasses}"
              data-font-key="${App.escapeHtml(normalizedFontKey)}"
              data-effect-key="${App.escapeHtml(normalizedEffectKey)}"
              style="${inlineStyle}"
            >${safeName}</span>
          </span>
        </button>
      `;
    };

    /*
      이미 렌더링된 기존 방명록도 즉시 보정.
      새로고침 없이 탭 전환/방명록 로드 후에도 적용되게 한다.
    */
    function forceExistingGuestNameFonts(root = document) {
      $$(".guest-name-btn-text", root).forEach((el) => {
        const fontKey = normalizeFontKey(
          el.dataset.fontKey ||
            el.closest(".guest-name-btn")?.dataset.fontKey ||
            state.viewerFontPref?.nickname_font_key ||
            state.ownerFontPref?.nickname_font_key ||
            ""
        );

        const effectKey = normalizeEffectKey(
          el.dataset.effectKey ||
            el.closest(".guest-name-btn")?.dataset.effectKey ||
            "none"
        );

        const baseClasses = clearNameTextClasses(el.className);

        el.className = [
          baseClasses,
          fontClassFromKey(fontKey),
          effectClassFromKey(effectKey),
        ].filter(Boolean).join(" ");

        el.dataset.fontKey = fontKey;
        el.dataset.effectKey = effectKey;

        el.style.cssText += `; ${nicknameInlineStyle(
          fontKey,
          state.viewerFontPref?.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE,
          state.viewerFontPref?.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING
        )}`;
      });
    }

    const originalLoadGuestbookEntries = App.loadGuestbookEntries?.bind(App);

    if (typeof originalLoadGuestbookEntries === "function") {
      App.loadGuestbookEntries = async function loadGuestbookEntriesFinalNameFont(...args) {
        const result = await originalLoadGuestbookEntries(...args);
        forceExistingGuestNameFonts(els.guestbookList || document);
        return result;
      };
    }

    const originalRenderReplyCard = App.renderReplyCard?.bind(App);

    if (typeof originalRenderReplyCard === "function") {
      App.renderReplyCard = function renderReplyCardFinalNameFont(reply) {
        return originalRenderReplyCard(reply);
      };
    }

    const originalRenderGuestbookEntryCard = App.renderGuestbookEntryCard?.bind(App);

    if (typeof originalRenderGuestbookEntryCard === "function") {
      App.renderGuestbookEntryCard = function renderGuestbookEntryCardFinalNameFont(entry) {
        return originalRenderGuestbookEntryCard(entry);
      };
    }

    const originalHandleGuestbookAction = App.handleGuestbookAction?.bind(App);

    if (typeof originalHandleGuestbookAction === "function") {
      App.handleGuestbookAction = async function handleGuestbookActionFinalNameFont(event) {
        const result = await originalHandleGuestbookAction(event);
        forceExistingGuestNameFonts(els.guestbookList || document);
        return result;
      };
    }

    forceExistingGuestNameFonts(document);
  });
})();