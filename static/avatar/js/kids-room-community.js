(function () {
  const App = window.MathnerKidsRoom;

  App.register(function communityModule(App) {
    const $ = App.$;
    const $$ = App.$$;
    const els = App.els;
    const state = App.state;
    const API = App.API;

    App.injectGuestbookNameLabelStyles = function injectGuestbookNameLabelStyles() {
      const styleId = "mathner-guestbook-name-label-style";
      if (document.getElementById(styleId)) return;

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .message-card .message-top,
        .guestbook-entry-card .message-top,
        .reply-card .reply-top {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 12px !important;
          width: 100% !important;
          min-height: 0 !important;
          margin: 0 0 14px !important;
          padding: 0 !important;
        }

        .message-card .message-top > span:last-child,
        .guestbook-entry-card .message-top > span:last-child,
        .reply-card .reply-top > span:last-child {
          flex: 0 0 auto !important;
          margin-left: auto !important;
          padding-top: 5px !important;
          color: rgba(255,255,255,.58) !important;
          font-family: var(--kids-font, "Pretendard", sans-serif) !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
          white-space: nowrap !important;
        }

        .guest-name-btn {
          flex: 0 0 auto !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: 72% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 999px !important;
          background: transparent !important;
          box-shadow: none !important;
          outline: none !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
          text-align: left !important;
          cursor: pointer !important;
          vertical-align: top !important;
          overflow: visible !important;
        }

        .guest-name-label-shell {
          position: relative !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: auto !important;
          min-width: 62px !important;
          min-height: 34px !important;
          max-width: 100% !important;
          padding: 7px 16px 8px !important;
          border-radius: 999px !important;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,255,255,.18), rgba(255,255,255,0) 42%),
            linear-gradient(180deg, #172844 0%, #0b1729 100%) !important;
          border: 1px solid rgba(255,255,255,.14) !important;
          box-shadow:
            0 8px 16px rgba(54,104,142,.16),
            inset 0 1px 0 rgba(255,255,255,.16),
            inset 0 -10px 18px rgba(0,0,0,.28) !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        .guest-name-btn:hover .guest-name-label-shell {
          transform: translateY(-1px);
          box-shadow:
            0 10px 20px rgba(54,104,142,.20),
            inset 0 1px 0 rgba(255,255,255,.20),
            inset 0 -10px 18px rgba(0,0,0,.32) !important;
        }

        .guest-name-btn-text {
          position: relative !important;
          z-index: 2 !important;
          display: inline-block !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          line-height: 1.05 !important;
          text-align: center !important;
          white-space: nowrap !important;
          word-break: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          font-weight: 900 !important;
          transform-origin: center center !important;
          backface-visibility: hidden !important;
          -webkit-font-smoothing: antialiased !important;
          text-rendering: optimizeLegibility !important;
        }

        .guest-name-btn-text.effect-rainbow-flow {
          display: inline-block !important;
          min-width: 1px !important;
          white-space: nowrap !important;
        }

        .message-card .message-body,
        .guestbook-entry-card .message-body,
        .reply-card .message-body {
          margin-top: 6px !important;
          padding-left: 0 !important;
          text-align: left !important;
        }

        .reply-card {
          margin-top: 12px !important;
        }

        .diary-entry-title {
          display: inline-block !important;
          max-width: 100% !important;
          line-height: 1.12 !important;
          white-space: normal !important;
          word-break: break-word !important;
        }

        .diary-entry-title.effect-rainbow-flow {
          display: inline-block !important;
        }

        .message-body.effect-rainbow-flow,
        .reply-body.effect-rainbow-flow {
          display: block !important;
        }

        @media (max-width: 720px) {
          .message-card .message-top,
          .guestbook-entry-card .message-top,
          .reply-card .reply-top {
            gap: 8px !important;
          }

          .guest-name-btn {
            max-width: 60% !important;
          }

          .guest-name-label-shell {
            min-height: 31px !important;
            min-width: 56px !important;
            padding: 6px 13px 7px !important;
          }

          .guest-name-btn-text {
            max-width: 180px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .message-card .message-top > span:last-child,
          .guestbook-entry-card .message-top > span:last-child,
          .reply-card .reply-top > span:last-child {
            font-size: 11px !important;
            padding-top: 5px !important;
          }
        }
      `;

      document.head.appendChild(style);
    };

    App.injectGuestbookNameLabelStyles();

    App.resolveMessageDisplayName = function resolveMessageDisplayName(displayName, roomUrl = "") {
      const name = String(displayName || "").trim();
      if (name) return name;

      const ownerName = String(App.ownerDisplayName() || "").trim();
      const ownerUser = String(App.ownerUsername() || "").trim();

      if (roomUrl) {
        try {
          const clean = String(roomUrl).replace(/^https?:\/\/[^/]+/i, "");
          const match = clean.match(/\/avatar\/room\/([^/]+)\/?$/i);

          if (match && match[1]) {
            const usernameFromUrl = decodeURIComponent(match[1]).trim();

            if (usernameFromUrl && ownerUser && usernameFromUrl === ownerUser) {
              return ownerName || ownerUser || "Player";
            }

            return usernameFromUrl || "Player";
          }
        } catch (e) {}
      }

      return ownerName || ownerUser || "Player";
    };

    App.syncOwnerNickname = function syncOwnerNickname() {
      const displayName = App.ownerDisplayName();
      const username = App.ds.avatarOwnerUsername || App.ds.avatarOwner || "";

      [
        $("roomOwnerName"),
        $("ownerDisplayName"),
        $("ownerNickname"),
        $("avatarOwnerName"),
      ].filter(Boolean).forEach((el) => {
        const layer = el.querySelector?.(".room-owner-name-text-layer");
        if (layer) {
          layer.textContent = displayName || username || "Player";
        } else {
          el.textContent = displayName || username || "Player";
        }
      });

      [
        $("roomOwnerUsername"),
        $("ownerUsername"),
        $("avatarOwnerUsername"),
      ].filter(Boolean).forEach((el) => {
        el.textContent = username ? `@${username}` : "";
      });
    };

    App.setActiveSideTab = function setActiveSideTab(tabName) {
      $$(".side-tab-btn[data-tab-target], .btn-menu[data-tab-target]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tabTarget === tabName);
      });
    };

    App.updateMainPanels = function updateMainPanels(tabName) {
      const showAvatar = tabName === "avatar" || tabName === "edit";
      const showContent = tabName === "guestbook" || tabName === "diary";

      App.setVisible(els.avatarHeroCard, showAvatar, "block");
      App.setVisible(els.stageContentCard, showContent, "block");

      if (els.tabGuestbook) {
        els.tabGuestbook.classList.toggle("active", tabName === "guestbook");
        els.tabGuestbook.style.display = tabName === "guestbook" ? "block" : "none";
      }

      if (els.tabDiary) {
        els.tabDiary.classList.toggle("active", tabName === "diary");
        els.tabDiary.style.display = tabName === "diary" ? "block" : "none";
      }

      if (tabName === "guestbook" && els.dynamicPanelTitle) {
        els.dynamicPanelTitle.textContent = "💌 방명록";
      }

      if (tabName === "diary" && els.dynamicPanelTitle) {
        els.dynamicPanelTitle.textContent = "📖 다이어리";
      }

      App.closeNamePopover();
    };

    App.openEditMode = function openEditMode() {
      if (!App.isOwner) return;

      state.currentMainTab = "edit";

      if (els.avatarLayout) {
        els.avatarLayout.classList.add("is-editing");
      }

      if (els.avatarSideEdit) {
        els.avatarSideEdit.removeAttribute("hidden");
        els.avatarSideEdit.setAttribute("aria-hidden", "false");
        els.avatarSideEdit.style.display = "block";
      }

      App.setActiveSideTab("edit");
      App.updateMainPanels("edit");
    };

    App.closeEditMode = function closeEditMode() {
      if (els.avatarLayout) {
        els.avatarLayout.classList.remove("is-editing");
      }

      if (els.avatarSideEdit) {
        els.avatarSideEdit.setAttribute("hidden", "hidden");
        els.avatarSideEdit.setAttribute("aria-hidden", "true");
        els.avatarSideEdit.style.display = "none";
      }

      if (els.avatarEditPanel) {
        els.avatarEditPanel.hidden = true;
        els.avatarEditPanel.style.display = "none";
      }

      if (els.fontEditPanel) {
        els.fontEditPanel.hidden = true;
        els.fontEditPanel.style.display = "none";
      }

      $("openAvatarEditBtn")?.classList.remove("active");
      $("openFontEditBtn")?.classList.remove("active");

      App.closeNamePopover();

      state.previewFont = {
        itemId: state.selectedFontItemId,
        fontKey: state.viewerFontPref.nickname_font_key || "",
        effectKey: state.viewerFontPref.nickname_effect_key || "none",
        nicknameScale: Number(state.viewerFontPref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE),
        nicknameLetterSpacing: Number(state.viewerFontPref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING),
      };

      if (els.fontEffectSelect) {
        els.fontEffectSelect.value = state.previewFont.effectKey || "none";
      }

      App.applyCurrentFontPreferenceToEditors?.();
    };

    App.showAvatarEditPanel = function showAvatarEditPanel(panelName) {
      if (!App.isOwner) return;

      App.openEditMode();

      if (panelName === "font") {
        if (els.avatarEditPanel) {
          els.avatarEditPanel.hidden = true;
          els.avatarEditPanel.style.display = "none";
        }

        if (els.fontEditPanel) {
          els.fontEditPanel.hidden = false;
          els.fontEditPanel.removeAttribute("hidden");
          els.fontEditPanel.style.display = "block";
        }

        $("openAvatarEditBtn")?.classList.remove("active");
        $("openFontEditBtn")?.classList.add("active");

        App.loadInventoryIfNeeded?.(true);
        App.applyCurrentFontPreferenceToEditors?.();
        App.renderFontInventory?.({ preservePage: true });
        App.renderEffectInventory?.({ preservePage: true });
        App.updateFontEffectCarousels?.();
        return;
      }

      if (els.avatarEditPanel) {
        els.avatarEditPanel.hidden = false;
        els.avatarEditPanel.removeAttribute("hidden");
        els.avatarEditPanel.style.display = "block";
      }

      if (els.fontEditPanel) {
        els.fontEditPanel.hidden = true;
        els.fontEditPanel.style.display = "none";
      }

      $("openAvatarEditBtn")?.classList.add("active");
      $("openFontEditBtn")?.classList.remove("active");

      App.setActiveEditSubtab?.(state.activeEditSubtab || "avatar");
      App.loadInventoryIfNeeded?.(true);
    };

    window.switchRightEditPanel = function switchRightEditPanel(panelName) {
      App.showAvatarEditPanel(panelName === "font" ? "font" : "avatar");
    };

    window.closeRightEditPanels = async function closeRightEditPanels() {
      App.closeEditMode();
      await App.activateMainTab("avatar");
    };

    App.normalizeGuestbookFontKey = function normalizeGuestbookFontKey(fontKey = "") {
      if (typeof App.normalizeFontKey === "function") {
        return App.normalizeFontKey(fontKey || "");
      }

      return String(fontKey || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_가-힣]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    };

    App.normalizeGuestbookEffectKey = function normalizeGuestbookEffectKey(effectKey = "none") {
      if (typeof App.normalizeEffectKey === "function") {
        return App.normalizeEffectKey(effectKey || "none") || "none";
      }

      const normalized = String(effectKey || "none")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_가-힣]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

      return normalized || "none";
    };

    App.safeNicknameScale = function safeNicknameScale(value) {
      const fallback = App.DEFAULT_NICKNAME_SCALE ?? 1;
      const min = App.MIN_NICKNAME_SCALE ?? 0.8;
      const max = App.MAX_NICKNAME_SCALE ?? 1.6;
      const n = Number(value ?? fallback);
      const safe = Number.isFinite(n) ? n : fallback;

      return typeof App.clamp === "function" ? App.clamp(safe, min, max) : Math.min(max, Math.max(min, safe));
    };

    App.safeNicknameSpacing = function safeNicknameSpacing(value) {
      const fallback = App.DEFAULT_NICKNAME_SPACING ?? 0;
      const min = App.MIN_NICKNAME_SPACING ?? -1;
      const max = App.MAX_NICKNAME_SPACING ?? 6;
      const n = Number(value ?? fallback);
      const safe = Number.isFinite(n) ? n : fallback;

      return typeof App.clamp === "function" ? App.clamp(safe, min, max) : Math.min(max, Math.max(min, safe));
    };

    App.pickGuestbookStyle = function pickGuestbookStyle(record = {}) {
      const nicknameFontKey = App.normalizeGuestbookFontKey(
        record.nickname_font_key ||
        record.author_nickname_font_key ||
        record.author_font_key ||
        record.profile_font_key ||
        record.font_key ||
        ""
      );

      const nicknameEffectKey = App.normalizeGuestbookEffectKey(
        record.nickname_effect_key ||
        record.author_nickname_effect_key ||
        record.author_effect_key ||
        record.profile_effect_key ||
        record.effect_key ||
        "none"
      );

      const contentFontKey = App.normalizeGuestbookFontKey(
        record.content_font_key ||
        record.author_content_font_key ||
        record.writing_font_key ||
        record.body_font_key ||
        record.font_key ||
        ""
      );

      const contentEffectKey = App.normalizeGuestbookEffectKey(
        record.content_effect_key ||
        record.author_content_effect_key ||
        record.body_effect_key ||
        "none"
      );

      return {
        nicknameFontKey,
        nicknameEffectKey,
        nicknameScale: App.safeNicknameScale(
          record.nickname_scale ??
          record.author_nickname_scale ??
          record.profile_nickname_scale ??
          App.DEFAULT_NICKNAME_SCALE
        ),
        nicknameSpacing: App.safeNicknameSpacing(
          record.nickname_letter_spacing ??
          record.author_nickname_letter_spacing ??
          record.profile_nickname_letter_spacing ??
          App.DEFAULT_NICKNAME_SPACING
        ),
        contentFontKey,
        contentEffectKey,
      };
    };

    App.pickDiaryStyle = function pickDiaryStyle(record = {}) {
      const titleFontKey = App.normalizeGuestbookFontKey(
        record.title_font_key ||
        record.nickname_font_key ||
        record.font_key ||
        ""
      );

      const titleEffectKey = App.normalizeGuestbookEffectKey(
        record.title_effect_key ||
        record.nickname_effect_key ||
        record.effect_key ||
        "none"
      );

      const contentFontKey = App.normalizeGuestbookFontKey(
        record.content_font_key ||
        record.body_font_key ||
        record.font_key ||
        ""
      );

      const contentEffectKey = App.normalizeGuestbookEffectKey(
        record.content_effect_key ||
        record.body_effect_key ||
        "none"
      );

      return {
        titleFontKey,
        titleEffectKey,
        contentFontKey,
        contentEffectKey,
      };
    };

    App.buildGuestbookStylePayload = function buildGuestbookStylePayload(extra = {}) {
      const pref = state.viewerFontPref || {};

      const nicknameFontKey = App.normalizeGuestbookFontKey(
        pref.nickname_font_key || pref.font_key || ""
      );

      const nicknameEffectKey = App.normalizeGuestbookEffectKey(
        pref.nickname_effect_key || "none"
      );

      const contentFontKey = App.normalizeGuestbookFontKey(
        pref.content_font_key || pref.writing_font_key || pref.nickname_font_key || ""
      );

      const contentEffectKey = App.normalizeGuestbookEffectKey(
        pref.content_effect_key || "none"
      );

      return {
        ...extra,
        nickname_font_key: nicknameFontKey,
        nickname_effect_key: nicknameEffectKey,
        nickname_scale: App.safeNicknameScale(pref.nickname_scale),
        nickname_letter_spacing: App.safeNicknameSpacing(pref.nickname_letter_spacing),
        content_font_key: contentFontKey,
        content_effect_key: contentEffectKey,
      };
    };

    App.buildDiaryStylePayload = function buildDiaryStylePayload(extra = {}) {
      const pref = state.viewerFontPref || {};

      const titleFontKey = App.normalizeGuestbookFontKey(
        pref.title_font_key || pref.nickname_font_key || pref.font_key || ""
      );

      const titleEffectKey = App.normalizeGuestbookEffectKey(
        pref.title_effect_key || pref.nickname_effect_key || "none"
      );

      const contentFontKey = App.normalizeGuestbookFontKey(
        pref.content_font_key || pref.nickname_font_key || pref.font_key || ""
      );

      const contentEffectKey = App.normalizeGuestbookEffectKey(
        pref.content_effect_key || "none"
      );

      return {
        ...extra,
        title_font_key: titleFontKey,
        title_effect_key: titleEffectKey,
        content_font_key: contentFontKey,
        content_effect_key: contentEffectKey,
      };
    };

    App.buildNameTextClass = function buildNameTextClass(fontKey = "", effectKey = "none") {
      const normalizedFontKey = App.normalizeGuestbookFontKey(fontKey || "");
      const normalizedEffectKey = App.normalizeGuestbookEffectKey(effectKey || "none");

      return [
        "guest-name-btn-text",
        App.fontClassFromKey(normalizedFontKey),
        App.effectKeyToClass(normalizedEffectKey || "none"),
      ].filter(Boolean).join(" ");
    };

    App.makeNameButton = function makeNameButton(
      displayName,
      roomUrl,
      extraClass = "",
      fontKey = "",
      effectKey = "none",
      scale = App.DEFAULT_NICKNAME_SCALE,
      spacing = App.DEFAULT_NICKNAME_SPACING
    ) {
      const resolvedName = App.resolveMessageDisplayName(displayName, roomUrl);
      const safeName = App.escapeHtml(resolvedName || "Player");
      const safeRoomUrl = App.escapeHtml(roomUrl || "");

      const buttonClasses = [
        "guest-name-btn",
        "guest-name-label-btn",
        "js-name-pop",
        extraClass,
      ].filter(Boolean).join(" ");

      const normalizedFontKey = App.normalizeGuestbookFontKey(fontKey || "");
      const normalizedEffectKey = App.normalizeGuestbookEffectKey(effectKey || "none");
      const textClasses = App.buildNameTextClass(normalizedFontKey, normalizedEffectKey);
      const fontSizePx = Math.max(14, Math.round(18 * App.safeNicknameScale(scale)));
      const letterSpacingPx = App.safeNicknameSpacing(spacing);

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
              style="font-size:${fontSizePx}px !important; letter-spacing:${letterSpacingPx}px !important;"
            >${safeName}</span>
          </span>
        </button>
      `;
    };

    App.buildStyledBody = function buildStyledBody(content, fontKey = "", effectKey = "none", extraClass = "") {
      const normalizedFontKey = App.normalizeGuestbookFontKey(fontKey || "");
      const normalizedEffectKey = App.normalizeGuestbookEffectKey(effectKey || "none");

      return `
        <div class="message-body ${extraClass} ${App.fontClassFromKey(normalizedFontKey)} ${App.effectKeyToClass(normalizedEffectKey)}">
          ${App.escapeHtmlPreserveText(content || "")}
        </div>
      `;
    };

    App.buildDiaryTitle = function buildDiaryTitle(title, fontKey = "", effectKey = "none") {
      const normalizedFontKey = App.normalizeGuestbookFontKey(fontKey || "");
      const normalizedEffectKey = App.normalizeGuestbookEffectKey(effectKey || "none");

      return `
        <strong class="diary-entry-title ${App.fontClassFromKey(normalizedFontKey)} ${App.effectKeyToClass(normalizedEffectKey)}">
          ${App.escapeHtml(title || "")}
        </strong>
      `;
    };

    App.renderReplyCard = function renderReplyCard(reply) {
      const displayName = App.resolveMessageDisplayName(reply.author_display_name, reply.author_room_url);
      const style = App.pickGuestbookStyle(reply || {});

      return `
        <div class="reply-card" data-reply-id="${App.escapeHtml(reply.id)}">
          <div class="reply-top">
            ${App.makeNameButton(
              displayName,
              reply.author_room_url,
              "",
              style.nicknameFontKey,
              style.nicknameEffectKey,
              style.nicknameScale,
              style.nicknameSpacing
            )}
            <span>${App.escapeHtml(reply.created_at || "")}</span>
          </div>

          ${App.buildStyledBody(reply.content, style.contentFontKey, style.contentEffectKey, "reply-body")}

          ${
            reply.can_delete
              ? `<div class="message-actions"><button type="button" class="mini-action-btn danger reply-delete-btn" data-reply-id="${App.escapeHtml(reply.id)}">지우기</button></div>`
              : ""
          }
        </div>
      `;
    };

    App.renderGuestbookEntryCard = function renderGuestbookEntryCard(entry) {
      const displayName = App.resolveMessageDisplayName(entry.author_display_name, entry.author_room_url);
      const style = App.pickGuestbookStyle(entry || {});

      return `
        <div class="message-card guestbook-entry-card" data-entry-id="${App.escapeHtml(entry.id)}">
          <div class="message-top">
            ${App.makeNameButton(
              displayName,
              entry.author_room_url,
              "",
              style.nicknameFontKey,
              style.nicknameEffectKey,
              style.nicknameScale,
              style.nicknameSpacing
            )}
            <span>${App.escapeHtml(entry.created_at || "")}</span>
          </div>

          ${App.buildStyledBody(entry.content, style.contentFontKey, style.contentEffectKey)}

          <div class="message-actions">
            ${entry.can_reply ? `<button type="button" class="mini-action-btn reply-toggle-btn" data-entry-id="${App.escapeHtml(entry.id)}">답글</button>` : ""}
            ${entry.can_delete ? `<button type="button" class="mini-action-btn danger guestbook-delete-btn" data-entry-id="${App.escapeHtml(entry.id)}">지우기</button>` : ""}
          </div>

          <div class="reply-editor is-hidden">
            <textarea class="reply-textarea font-default" placeholder="답글을 적어주세요..."></textarea>
            <div class="reply-editor-actions">
              <button type="button" class="btn-cute btn-yellow reply-submit-btn" data-entry-id="${App.escapeHtml(entry.id)}">답글 올리기</button>
            </div>
          </div>

          <div class="reply-list">
            ${(entry.replies || []).map(App.renderReplyCard).join("")}
          </div>
        </div>
      `;
    };

    App.loadGuestbookEntries = async function loadGuestbookEntries(force = false) {
      if (!els.guestbookList || !API.guestbookListUrl) return null;
      if (!force && state.guestbookPromise) return state.guestbookPromise;

      els.guestbookList.innerHTML = `<div class="empty-text">방명록을 불러오는 중...</div>`;

      state.guestbookPromise = (async () => {
        const result = await App.fetchJson(API.guestbookListUrl);

        if (!result.ok) {
          els.guestbookList.innerHTML = `<div class="empty-text">${App.escapeHtml(result.error || "방명록을 불러오지 못했어요.")}</div>`;
          return result;
        }

        const entries = result.entries || [];

        els.guestbookList.innerHTML = entries.length
          ? entries.map(App.renderGuestbookEntryCard).join("")
          : `<div class="empty-text">아직 방명록이 없어요.</div>`;

        App.injectGuestbookNameLabelStyles();
        App.applyViewerWritingPreview?.();
        App.closeNamePopover();

        return result;
      })();

      try {
        return await state.guestbookPromise;
      } finally {
        state.guestbookPromise = null;
      }
    };

    App.renderDiaryListEntry = function renderDiaryListEntry(entry) {
      const style = App.pickDiaryStyle(entry || {});

      return `
        <div class="message-card diary-entry-card" data-entry-id="${App.escapeHtml(entry.id)}">
          <div class="message-top diary-entry-top">
            ${App.buildDiaryTitle(entry.title || "", style.titleFontKey, style.titleEffectKey)}
            <span>${App.escapeHtml(entry.entry_date || "")}</span>
          </div>

          ${App.buildStyledBody(entry.content, style.contentFontKey, style.contentEffectKey)}

          ${
            entry.can_delete
              ? `<div class="message-actions"><button type="button" class="mini-action-btn danger diary-inline-delete-btn" data-entry-id="${App.escapeHtml(entry.id)}">지우기</button></div>`
              : ""
          }
        </div>
      `;
    };

    App.renderDiaryList = function renderDiaryList(entries) {
      if (!els.diaryList) return;

      els.diaryList.innerHTML = entries?.length
        ? entries.map(App.renderDiaryListEntry).join("")
        : `<div class="empty-text">이 날짜에는 일기가 없어요.</div>`;

      App.closeNamePopover();
    };

    App.setDiarySelectedDate = function setDiarySelectedDate(dateStr) {
      state.selectedDiaryDate = dateStr;

      if (els.diaryDateInput) els.diaryDateInput.value = dateStr;
      if (els.diarySelectedDateText) els.diarySelectedDateText.textContent = `선택한 날짜: ${dateStr}`;
    };

    App.clearDiaryForm = function clearDiaryForm(keepDate = true) {
      if (els.diaryEntryIdInput) els.diaryEntryIdInput.value = "";
      if (els.diaryTitleInput) els.diaryTitleInput.value = "";
      if (els.diaryContentInput) els.diaryContentInput.value = "";

      if (!keepDate) App.setDiarySelectedDate(App.formatDateLocal(new Date()));

      App.applyViewerWritingPreview?.();
    };

    App.renderCalendar = function renderCalendar() {
      if (!els.calendarGrid || !els.calendarMonthLabel) return;

      const firstDay = new Date(state.calendarYear, state.calendarMonth, 1);
      const lastDay = new Date(state.calendarYear, state.calendarMonth + 1, 0);
      const startWeekday = firstDay.getDay();
      const daysInMonth = lastDay.getDate();

      els.calendarMonthLabel.textContent = `${state.calendarYear}.${String(state.calendarMonth + 1).padStart(2, "0")}`;

      const html = [];

      for (let i = 0; i < startWeekday; i += 1) {
        html.push(`<div class="calendar-day is-muted"></div>`);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const cellDate = `${state.calendarYear}-${String(state.calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const classes = ["calendar-day"];

        if (
          state.calendarYear === state.today.getFullYear() &&
          state.calendarMonth === state.today.getMonth() &&
          day === state.today.getDate()
        ) {
          classes.push("is-today");
        }

        if (state.selectedDiaryDate === cellDate) classes.push("is-selected");
        if (state.monthDiaryDaysMap[cellDate]) classes.push("has-entry");

        html.push(`<button type="button" class="${classes.join(" ")}" data-action="pick-diary-date" data-date="${cellDate}">${day}</button>`);
      }

      els.calendarGrid.innerHTML = html.join("");
    };

    App.loadDiaryMonth = async function loadDiaryMonth(force = false) {
      if (!API.diaryCalendarUrl) return null;
      if (!force && state.diaryMonthPromise) return state.diaryMonthPromise;

      state.diaryMonthPromise = (async () => {
        const url = `${API.diaryCalendarUrl}?year=${state.calendarYear}&month=${state.calendarMonth + 1}`;
        const result = await App.fetchJson(url);

        state.monthDiaryDaysMap = Object.create(null);

        if (result.ok) {
          for (const item of result.days || []) {
            state.monthDiaryDaysMap[item.date] = item;
          }
        }

        App.renderCalendar();
        App.closeNamePopover();

        return result;
      })();

      try {
        return await state.diaryMonthPromise;
      } finally {
        state.diaryMonthPromise = null;
      }
    };

    App.loadDiaryByDate = async function loadDiaryByDate(dateStr, force = false) {
      if (!dateStr || !API.diaryDateUrlBase) return null;
      if (!force && state.diaryDatePromise) return state.diaryDatePromise;

      App.setDiarySelectedDate(dateStr);
      App.renderCalendar();

      state.diaryDatePromise = (async () => {
        const result = await App.fetchJson(`${API.diaryDateUrlBase}${dateStr}/`);

        if (!result.ok || !result.entry) {
          App.renderDiaryList([]);

          if (App.isOwner) App.clearDiaryForm(true);

          return result;
        }

        const entry = result.entry;
        App.renderDiaryList([entry]);

        if (App.isOwner) {
          if (els.diaryEntryIdInput) els.diaryEntryIdInput.value = entry.id || "";
          if (els.diaryTitleInput) els.diaryTitleInput.value = entry.title || "";
          if (els.diaryContentInput) els.diaryContentInput.value = entry.content || "";
        }

        App.applyViewerWritingPreview?.();

        return result;
      })();

      try {
        return await state.diaryDatePromise;
      } finally {
        state.diaryDatePromise = null;
      }
    };

    App.handleDiaryDatePick = async function handleDiaryDatePick(dateStr) {
      if (!dateStr) return;

      App.setDiarySelectedDate(dateStr);
      App.renderCalendar();

      if (App.isOwner) {
        App.clearDiaryForm(true);

        if (els.diaryDateInput) {
          els.diaryDateInput.value = dateStr;
        }
      }

      App.closeNamePopover();
      await App.loadDiaryByDate(dateStr, true);
    };

    App.handleDiaryDelete = async function handleDiaryDelete(entryId) {
      if (!entryId) return;
      if (!window.confirm("정말 이 일기를 지울까요?")) return;

      const result = await App.postJson(`${API.diaryDeleteUrlBase}${entryId}/delete/`, {});

      if (!result.ok) {
        alert(result.error || "일기 삭제에 실패했어요.");
        return;
      }

      App.clearDiaryForm(true);
      App.closeNamePopover();

      await App.loadDiaryMonth(true);
      await App.loadDiaryByDate(state.selectedDiaryDate, true);
    };

    App.closeNamePopover = function closeNamePopover() {
      if (!els.popover) return;

      els.popover.classList.add("is-hidden");
      els.popover.style.left = "-9999px";
      els.popover.style.top = "-9999px";

      state.currentVisitUrl = "";
      state.currentPopoverAnchor = null;
    };

    App.positionPopover = function positionPopover() {
      if (!els.popover || els.popover.classList.contains("is-hidden") || !state.currentPopoverAnchor) return;

      const rect = state.currentPopoverAnchor.getBoundingClientRect();
      const pop = els.popover;
      const popRect = pop.getBoundingClientRect();

      let left = window.scrollX + rect.right + 8;
      let top = window.scrollY + rect.top;

      const maxLeft = window.scrollX + window.innerWidth - popRect.width - 12;
      const maxTop = window.scrollY + window.innerHeight - popRect.height - 12;

      if (left > maxLeft) left = window.scrollX + rect.left - popRect.width - 8;
      if (left < window.scrollX + 8) left = window.scrollX + 8;
      if (top > maxTop) top = maxTop;
      if (top < window.scrollY + 8) top = window.scrollY + 8;

      pop.style.left = `${left}px`;
      pop.style.top = `${top}px`;
    };

    App.openNamePopover = function openNamePopover(target, roomUrl) {
      if (!els.popover || !target || !roomUrl) return;

      state.currentVisitUrl = roomUrl;
      state.currentPopoverAnchor = target;

      els.popover.classList.remove("is-hidden");
      els.popover.style.display = "block";
      App.positionPopover();
    };

    App.toggleNamePopover = function toggleNamePopover(target, roomUrl) {
      const isSameTarget =
        state.currentPopoverAnchor === target &&
        els.popover &&
        !els.popover.classList.contains("is-hidden");

      if (isSameTarget) {
        App.closeNamePopover();
        return;
      }

      App.openNamePopover(target, roomUrl);
    };

    App.handleGuestbookAction = async function handleGuestbookAction(event) {
      const target = event.target;

      const toggleBtn = target.closest(".reply-toggle-btn");

      if (toggleBtn) {
        App.closeNamePopover();

        const card = toggleBtn.closest(".guestbook-entry-card");
        const editor = card?.querySelector(".reply-editor");
        const textarea = card?.querySelector(".reply-textarea");

        if (editor) editor.classList.toggle("is-hidden");

        if (textarea) {
          App.applyFontClass(textarea, state.viewerFontPref.content_font_key || "");
          App.applyFontEffect(textarea, state.viewerFontPref.content_effect_key || "none");
          textarea.style.color = "#403932";
        }

        return;
      }

      const submitBtn = target.closest(".reply-submit-btn");

      if (submitBtn) {
        App.closeNamePopover();

        const entryId = submitBtn.dataset.entryId;
        const card = submitBtn.closest(".guestbook-entry-card");
        const textarea = card?.querySelector(".reply-textarea");
        const value = App.normalizeTypedText(textarea?.value || "").trim();

        if (!value) {
          alert("답글을 먼저 적어주세요.");
          return;
        }

        const payload = App.buildGuestbookStylePayload({ content: value });

        const result = await App.postJson(`${API.guestbookReplyCreateUrlBase}${entryId}/reply/create/`, payload);

        if (!result.ok) {
          alert(result.error || "답글 저장에 실패했어요.");
          return;
        }

        await App.loadGuestbookEntries(true);
        return;
      }

      const deleteBtn = target.closest(".guestbook-delete-btn");

      if (deleteBtn) {
        App.closeNamePopover();

        const entryId = deleteBtn.dataset.entryId;
        if (!window.confirm("정말 이 글을 지울까요?")) return;

        const result = await App.postJson(`${API.guestbookDeleteUrlBase}${entryId}/delete/`, {});

        if (!result.ok) {
          alert(result.error || "방명록 삭제에 실패했어요.");
          return;
        }

        await App.loadGuestbookEntries(true);
        return;
      }

      const replyDeleteBtn = target.closest(".reply-delete-btn");

      if (replyDeleteBtn) {
        App.closeNamePopover();

        const replyId = replyDeleteBtn.dataset.replyId;
        if (!window.confirm("정말 이 답글을 지울까요?")) return;

        const result = await App.postJson(`${API.guestbookReplyDeleteUrlBase}${replyId}/delete/`, {});

        if (!result.ok) {
          alert(result.error || "답글 삭제에 실패했어요.");
          return;
        }

        await App.loadGuestbookEntries(true);
      }
    };

    App.openConfirmModal = function openConfirmModal() {
      return new Promise((resolve) => {
        if (!els.confirmModal) {
          resolve(window.confirm("아바타를 초기화할까요?"));
          return;
        }

        const modal = els.confirmModal;

        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        modal.style.display = "block";
        document.body.classList.add("modal-open");

        const close = (result) => {
          modal.classList.remove("is-open");
          modal.setAttribute("aria-hidden", "true");
          modal.style.display = "none";
          document.body.classList.remove("modal-open");

          els.confirmOkBtn?.removeEventListener("click", onOk);
          els.confirmCancelBtn?.removeEventListener("click", onCancel);
          $$("[data-close-confirm]", modal).forEach((el) => el.removeEventListener("click", onCancel));
          document.removeEventListener("keydown", onEsc);

          resolve(result);
        };

        const onOk = () => close(true);
        const onCancel = () => close(false);
        const onEsc = (e) => {
          if (e.key === "Escape") close(false);
        };

        els.confirmOkBtn?.addEventListener("click", onOk);
        els.confirmCancelBtn?.addEventListener("click", onCancel);
        $$("[data-close-confirm]", modal).forEach((el) => el.addEventListener("click", onCancel));
        document.addEventListener("keydown", onEsc);
      });
    };

    App.setRoomStats = function setRoomStats(stats) {
      if (!stats) return;

      const todayEl = $("roomTodayVisits");
      const totalEl = $("roomTotalVisits");
      const likeEl = $("roomLikeCount");

      if (todayEl) todayEl.textContent = stats.today_visits ?? 0;
      if (totalEl) totalEl.textContent = stats.total_visits ?? 0;
      if (likeEl) likeEl.textContent = stats.like_count ?? 0;

      if (els.toggleRoomLikeBtn) {
        const isLiked = Boolean(stats.liked_by_me);

        els.toggleRoomLikeBtn.classList.toggle("is-liked", isLiked);
        els.toggleRoomLikeBtn.classList.toggle("btn-pink", !isLiked);
        els.toggleRoomLikeBtn.classList.toggle("btn-gray", isLiked);

        if (els.toggleRoomLikeBtnText) {
          els.toggleRoomLikeBtnText.textContent = isLiked ? "좋아요 취소" : "좋아요!";
        }
      }
    };

    App.loadRoomStats = async function loadRoomStats(force = false) {
      const username = App.ownerUsername();
      if (!username || !API.socialRoomStatsUrlBase) return null;

      return App.withPending("roomStatsPromise", async () => {
        const result = await App.fetchJson(App.buildUrl(API.socialRoomStatsUrlBase, username, "/stats/"));

        if (result.ok && result.stats) {
          App.setRoomStats(result.stats);
        }

        return result;
      }, force);
    };

    App.recordRoomVisit = async function recordRoomVisit(force = false) {
      const username = App.ownerUsername();
      if (!username || !API.socialRoomVisitUrlBase) return null;
      if (!force && state.hasRecordedVisitThisPage) return null;

      return App.withPending("roomVisitPromise", async () => {
        const result = await App.postJson(App.buildUrl(API.socialRoomVisitUrlBase, username, "/visit/"), {});

        if (result.ok) {
          state.hasRecordedVisitThisPage = true;

          if (result.stats) {
            App.setRoomStats(result.stats);
          }
        }

        return result;
      }, force);
    };

    App.normalizeFriendshipAction = function normalizeFriendshipAction(action) {
      return String(action || "").trim().toLowerCase();
    };

    App.setFriendshipState = function setFriendshipState(status = "none", direction = "none", friendshipId = "") {
      state.friendshipStatus = String(status || "none").trim();
      state.friendshipDirection = String(direction || "none").trim();
      state.friendshipId = String(friendshipId || "").trim();

      const btn = els.sendFriendRequestBtn;
      if (!btn) return;

      btn.dataset.friendshipStatus = state.friendshipStatus;
      btn.dataset.friendshipDirection = state.friendshipDirection;
      btn.dataset.friendshipId = state.friendshipId;

      btn.disabled = false;
      btn.classList.remove("btn-blue", "btn-gray", "btn-green", "avatar-btn-primary", "avatar-btn-secondary");

      if (state.friendshipStatus === "accepted") {
        btn.textContent = "친구입니다!";
        btn.disabled = true;
        btn.classList.add("btn-gray", "avatar-btn-secondary");
        return;
      }

      if (state.friendshipStatus === "pending" && state.friendshipDirection === "outgoing") {
        btn.textContent = "요청 취소";
        btn.classList.add("btn-gray", "avatar-btn-secondary");
        return;
      }

      if (state.friendshipStatus === "pending" && state.friendshipDirection === "incoming") {
        btn.textContent = "수락하기";
        btn.classList.add("btn-green", "avatar-btn-primary");
        return;
      }

      btn.textContent = "친구 추가";
      btn.classList.add("btn-blue", "avatar-btn-primary");
    };

    App.applyFriendRequestActionResult = function applyFriendRequestActionResult(result) {
      const action = App.normalizeFriendshipAction(result?.action);

      if (action === "accepted" || action === "already_friends") {
        App.setFriendshipState("accepted", "none", result?.friendship_id || "");
        return;
      }

      if (action === "sent") {
        App.setFriendshipState("pending", "outgoing", result?.friendship_id || "");
        return;
      }

      if (action === "canceled" || action === "rejected") {
        App.setFriendshipState("none", "none", "");
        return;
      }

      if (result?.friendship_status) {
        App.setFriendshipState(
          result.friendship_status,
          result.friendship_direction || "none",
          result.friendship_id || ""
        );
      }
    };

    App.loadFriendSelectOptions = async function loadFriendSelectOptions(force = false) {
      if (!els.friendSelect || !API.socialFriendListUrl) return null;
      if (state.friendOptionsLoaded && !force) return null;

      return App.withPending("friendListPromise", async () => {
        const result = await App.fetchJson(API.socialFriendListUrl);

        if (!result.ok) return result;

        const current = els.friendSelect.value;
        const options = [`<option value="">누구 방에 놀러갈까?</option>`];

        for (const friend of result.friends || []) {
          const username = App.escapeHtml(friend.username || "");
          const name = App.escapeHtml(friend.display_name || friend.username || "");
          options.push(`<option value="${username}">${name}</option>`);
        }

        els.friendSelect.innerHTML = options.join("");

        if (current) {
          els.friendSelect.value = current;
        }

        state.friendOptionsLoaded = true;
        return result;
      }, force);
    };

    App.activateMainTab = async function activateMainTab(tabName) {
      state.currentMainTab = tabName;

      if (tabName === "avatar") {
        App.closeEditMode();
        App.setActiveSideTab("avatar");
        App.updateMainPanels("avatar");

        if (!App.isOwner) await App.recordRoomVisit();
        await App.loadRoomStats(true);
        return;
      }

      if (tabName === "guestbook") {
        App.closeEditMode();
        App.setActiveSideTab("guestbook");
        App.updateMainPanels("guestbook");

        await App.recordRoomVisit();
        await App.loadRoomStats(true);
        await App.loadGuestbookEntries(true);
        return;
      }

      if (tabName === "diary") {
        App.closeEditMode();
        App.setActiveSideTab("diary");
        App.updateMainPanels("diary");

        await App.recordRoomVisit();
        await App.loadRoomStats(true);
        await App.loadDiaryMonth(true);
        await App.loadDiaryByDate(state.selectedDiaryDate, true);
        return;
      }

      if (tabName === "edit") {
        App.setActiveSideTab("edit");
        App.showAvatarEditPanel("avatar");
        await App.loadInventoryIfNeeded(true);
      }
    };
  });
})();