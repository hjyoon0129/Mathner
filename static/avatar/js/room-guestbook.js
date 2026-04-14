(function () {
  "use strict";

  function initGuestbook(app) {
    const { els, API, state, fetchJson, postJson } = app;

    if (!els.guestbookList || !els.guestbookSubmitBtn) return;

    function resolveMessageDisplayName(displayName, roomUrl = "") {
      const name = String(displayName || "").trim();
      if (name) return name;

      const ownerName = String(app.ownerDisplayName() || "").trim();
      const ownerUser = String(app.ownerUsername() || "").trim();

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
    }

    function makeNameButton(
      displayName,
      roomUrl,
      extraClass = "",
      fontKey = "",
      effectKey = "none",
      scale = app.DEFAULT_NICKNAME_SCALE,
      spacing = app.DEFAULT_NICKNAME_SPACING
    ) {
      const resolvedName = resolveMessageDisplayName(displayName, roomUrl);
      const safeName = app.escapeHtml(resolvedName || "Player");
      const safeRoomUrl = app.escapeHtml(roomUrl || "");

      const buttonClasses = ["guest-name-btn", "js-name-pop", extraClass].filter(Boolean).join(" ");
      const textClasses = [
        "guest-name-btn-text",
        app.fontClassFromKey(fontKey),
        app.effectKeyToClass(effectKey),
      ].join(" ");

      const fontSizePx = Math.max(14, Math.round(18 * Number(scale || app.DEFAULT_NICKNAME_SCALE)));
      const letterSpacingPx = Number(spacing || app.DEFAULT_NICKNAME_SPACING);

      return `<button type="button" class="${buttonClasses}" data-room-url="${safeRoomUrl}">
        <span class="${textClasses}" style="font-size:${fontSizePx}px; letter-spacing:${letterSpacingPx}px;">${safeName}</span>
      </button>`;
    }

    function buildStyledBody(content, fontKey = "") {
      return `<div class="message-body ${app.fontClassFromKey(fontKey)}">${app.escapeHtmlPreserveText(content || "")}</div>`;
    }

    function renderReplyCard(reply) {
      const displayName = resolveMessageDisplayName(reply.author_display_name, reply.author_room_url);

      return `
        <div class="reply-card" data-reply-id="${app.escapeHtml(reply.id)}">
          <div class="reply-top">
            ${makeNameButton(
              displayName,
              reply.author_room_url,
              "",
              reply.nickname_font_key || "",
              reply.nickname_effect_key || "none",
              reply.nickname_scale ?? app.DEFAULT_NICKNAME_SCALE,
              reply.nickname_letter_spacing ?? app.DEFAULT_NICKNAME_SPACING
            )}
            <span>${app.escapeHtml(reply.created_at || "")}</span>
          </div>

          ${buildStyledBody(reply.content, reply.content_font_key || "")}

          ${
            reply.can_delete
              ? `<div class="message-actions"><button type="button" class="mini-action-btn danger reply-delete-btn" data-reply-id="${app.escapeHtml(reply.id)}">Delete</button></div>`
              : ""
          }
        </div>
      `;
    }

    function renderGuestbookEntryCard(entry) {
      const displayName = resolveMessageDisplayName(entry.author_display_name, entry.author_room_url);

      return `
        <div class="message-card guestbook-entry-card" data-entry-id="${app.escapeHtml(entry.id)}">
          <div class="message-top">
            ${makeNameButton(
              displayName,
              entry.author_room_url,
              "",
              entry.nickname_font_key || "",
              entry.nickname_effect_key || "none",
              entry.nickname_scale ?? app.DEFAULT_NICKNAME_SCALE,
              entry.nickname_letter_spacing ?? app.DEFAULT_NICKNAME_SPACING
            )}
            <span>${app.escapeHtml(entry.created_at || "")}</span>
          </div>

          ${buildStyledBody(entry.content, entry.content_font_key || "")}

          <div class="message-actions">
            ${entry.can_reply ? `<button type="button" class="mini-action-btn reply-toggle-btn" data-entry-id="${app.escapeHtml(entry.id)}">Reply</button>` : ""}
            ${entry.can_delete ? `<button type="button" class="mini-action-btn danger guestbook-delete-btn" data-entry-id="${app.escapeHtml(entry.id)}">Delete</button>` : ""}
          </div>

          <div class="reply-editor is-hidden">
            <textarea class="reply-textarea font-default" placeholder="Write a reply..."></textarea>
            <div class="reply-editor-actions">
              <button type="button" class="avatar-btn avatar-btn-primary reply-submit-btn" data-entry-id="${app.escapeHtml(entry.id)}">Save Reply</button>
            </div>
          </div>

          <div class="reply-list">
            ${(entry.replies || []).map(renderReplyCard).join("")}
          </div>
        </div>
      `;
    }

    async function loadGuestbookEntries(force = false) {
      if (!API.guestbookListUrl) return null;
      if (!force && state.guestbookPromise) return state.guestbookPromise;

      els.guestbookList.innerHTML = `<div class="empty-text">Loading guestbook...</div>`;

      state.guestbookPromise = (async () => {
        const result = await fetchJson(API.guestbookListUrl);

        if (!result.ok) {
          els.guestbookList.innerHTML = `<div class="empty-text">${app.escapeHtml(result.error || "Failed to load guestbook.")}</div>`;
          return result;
        }

        const entries = result.entries || [];
        els.guestbookList.innerHTML = entries.length
          ? entries.map(renderGuestbookEntryCard).join("")
          : `<div class="empty-text">No guestbook messages yet.</div>`;

        document.dispatchEvent(new CustomEvent("mathner:guestbook-rendered"));
        app.closeNamePopover();
        return result;
      })();

      try {
        return await state.guestbookPromise;
      } finally {
        state.guestbookPromise = null;
      }
    }

    async function handleGuestbookAction(event) {
      const target = event.target;

      const toggleBtn = target.closest(".reply-toggle-btn");
      if (toggleBtn) {
        app.closeNamePopover();
        const card = toggleBtn.closest(".guestbook-entry-card");
        const editor = card?.querySelector(".reply-editor");
        editor?.classList.toggle("is-hidden");
        return;
      }

      const submitBtn = target.closest(".reply-submit-btn");
      if (submitBtn) {
        app.closeNamePopover();
        const entryId = submitBtn.dataset.entryId;
        const card = submitBtn.closest(".guestbook-entry-card");
        const textarea = card?.querySelector(".reply-textarea");
        const value = app.normalizeTypedText(textarea?.value || "").trim();

        if (!value) {
          alert("Please enter a reply.");
          return;
        }

        const payload = {
          content: value,
          nickname_font_key: state.viewerFontPref.nickname_font_key || "",
          nickname_effect_key: state.viewerFontPref.nickname_effect_key || "none",
          nickname_scale: state.viewerFontPref.nickname_scale ?? app.DEFAULT_NICKNAME_SCALE,
          nickname_letter_spacing: state.viewerFontPref.nickname_letter_spacing ?? app.DEFAULT_NICKNAME_SPACING,
          content_font_key: state.viewerFontPref.content_font_key || "",
          content_effect_key: "none",
        };

        const result = await postJson(`${API.guestbookReplyCreateUrlBase}${entryId}/reply/create/`, payload);
        if (!result.ok) {
          alert(result.error || "Failed to save reply.");
          return;
        }

        await loadGuestbookEntries(true);
        return;
      }

      const deleteBtn = target.closest(".guestbook-delete-btn");
      if (deleteBtn) {
        app.closeNamePopover();
        const entryId = deleteBtn.dataset.entryId;
        if (!window.confirm("Delete this message?")) return;

        const result = await postJson(`${API.guestbookDeleteUrlBase}${entryId}/delete/`, {});
        if (!result.ok) {
          alert(result.error || "Failed to delete message.");
          return;
        }

        await loadGuestbookEntries(true);
        return;
      }

      const replyDeleteBtn = target.closest(".reply-delete-btn");
      if (replyDeleteBtn) {
        app.closeNamePopover();
        const replyId = replyDeleteBtn.dataset.replyId;
        if (!window.confirm("Delete this reply?")) return;

        const result = await postJson(`${API.guestbookReplyDeleteUrlBase}${replyId}/delete/`, {});
        if (!result.ok) {
          alert(result.error || "Failed to delete reply.");
          return;
        }

        await loadGuestbookEntries(true);
      }
    }

    els.guestbookSubmitBtn.addEventListener("click", async () => {
      app.closeNamePopover();
      const content = app.normalizeTypedText(document.getElementById("guestbookContent")?.value || "").trim();

      if (!content) {
        alert("Please enter a guestbook message.");
        return;
      }

      const payload = {
        content,
        nickname_font_key: state.viewerFontPref.nickname_font_key || "",
        nickname_effect_key: state.viewerFontPref.nickname_effect_key || "none",
        nickname_scale: state.viewerFontPref.nickname_scale ?? app.DEFAULT_NICKNAME_SCALE,
        nickname_letter_spacing: state.viewerFontPref.nickname_letter_spacing ?? app.DEFAULT_NICKNAME_SPACING,
        content_font_key: state.viewerFontPref.content_font_key || "",
        content_effect_key: "none",
      };

      const result = await postJson(API.guestbookCreateUrl, payload);
      if (!result.ok) {
        alert(result.error || "Failed to leave message.");
        return;
      }

      const input = document.getElementById("guestbookContent");
      if (input) input.value = "";
      await loadGuestbookEntries(true);
    });

    els.guestbookList.addEventListener("click", handleGuestbookAction);

    document.addEventListener("mathner:tab-changed", async (e) => {
      if (e.detail?.tabName === "guestbook") {
        await app.recordRoomVisit();
        await app.loadRoomStats(true);
        await loadGuestbookEntries(true);
      }
    });

    app.guestbook = {
      loadGuestbookEntries,
      renderGuestbookEntryCard,
    };
  }

  function readyHandler(e) {
    initGuestbook(e.detail.app);
  }

  if (window.MathnerRoomApp) {
    initGuestbook(window.MathnerRoomApp);
  } else {
    document.addEventListener("mathner:room-ready", readyHandler, { once: true });
  }
})();