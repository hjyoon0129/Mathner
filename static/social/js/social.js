document.addEventListener("DOMContentLoaded", function () {
  const page = document.getElementById("socialPage");
  if (!page) return;

  const DEFAULT_FRIEND_AVATAR_BASE = "/avatar/room/";
  const DEFAULT_FRIEND_REQUEST_URL_BASE = "/social/api/friends/request/";
  const DEFAULT_FRIEND_RESPOND_URL_BASE = "/social/api/friends/respond/";

  const friendAvatarBase = page.dataset.friendAvatarBase || DEFAULT_FRIEND_AVATAR_BASE;
  const socialFriendRequestUrlBase =
    page.dataset.socialFriendRequestUrlBase || DEFAULT_FRIEND_REQUEST_URL_BASE;
  const socialFriendRespondUrlBase =
    page.dataset.socialFriendRespondUrlBase || DEFAULT_FRIEND_RESPOND_URL_BASE;
  const socialFriendRequestsUrl = page.dataset.socialFriendRequestsUrl || "";
  const socialRoomListUrl = page.dataset.socialRoomListUrl || "";

  let currentSearchQuery = "";
  let roomDirectoryLoaded = false;
  let friendRequestsLoaded = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCookie(name) {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));

    if (!cookieValue) return "";
    return decodeURIComponent(cookieValue.split("=")[1] || "");
  }

  function getCsrfToken() {
    return window.CSRF_TOKEN || getCookie("csrftoken") || "";
  }

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function fontClassFromKey(key) {
    const normalized = normalizeKey(key);
    if (!normalized) return "font-default";
    return `font-${normalized}`;
  }

  function effectClassFromKey(key) {
    const normalized = normalizeKey(key || "none").replace(/_/g, "-");
    return `effect-${normalized || "none"}`;
  }

  function getNicknameFontKey(item) {
    return String(
      item?.nickname_font_key ||
      item?.font_key ||
      item?.font_family_key ||
      item?.profile_font_key ||
      ""
    ).trim();
  }

  function getNicknameEffectKey(item) {
    return String(
      item?.nickname_effect_key ||
      item?.effect_key ||
      "none"
    ).trim();
  }

  function getNicknameScale(item) {
    const value = Number(item?.nickname_scale ?? 1.0);
    return Number.isFinite(value) ? value : 1.0;
  }

  function getNicknameLetterSpacing(item) {
    const value = Number(item?.nickname_letter_spacing ?? 0.0);
    return Number.isFinite(value) ? value : 0.0;
  }

  function buildNicknameStyle(item, baseSize = 14) {
    const scale = getNicknameScale(item);
    const spacing = getNicknameLetterSpacing(item);
    const fontSize = Math.max(12, Math.round(baseSize * scale));
    return `font-size:${fontSize}px; letter-spacing:${spacing}px;`;
  }

  function getDisplayName(item) {
    if (!item) return "플레이어";

    return String(
      item.display_name ||
      item.nickname ||
      item.current_nickname ||
      item.author_display_name ||
      item.from_display_name ||
      item.owner_display_name ||
      item.profile_nickname ||
      item.username ||
      item.from_username ||
      item.owner_username ||
      item.author_username ||
      "플레이어"
    );
  }

  function getUsername(item) {
    if (!item) return "";

    return String(
      item.username ||
      item.from_username ||
      item.owner_username ||
      item.author_username ||
      ""
    );
  }

  function getRoomUrl(item) {
    const username = getUsername(item);
    return item?.room_url || `${friendAvatarBase}${username}/`;
  }

  function getDateOnly(item) {
    const raw = String(item?.created_date || item?.created_at || "").trim();
    if (!raw) return "";

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(2, 10);
    }

    if (/^\d{2}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 8);
    }

    return raw.split(" ")[0] || raw;
  }

  function getFriendshipStatus(item) {
    return String(item?.friendship_status || "none").trim();
  }

  function getFriendshipDirection(item) {
    return String(item?.friendship_direction || "none").trim();
  }

  async function fetchJson(url) {
    try {
      const res = await fetch(url, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch (error) {
        data = {
          ok: false,
          error: "잘못된 JSON 응답입니다.",
        };
      }

      if (!("ok" in data)) data.ok = res.ok;
      if (!res.ok && !data.error) data.error = `요청 실패 (${res.status})`;

      return data;
    } catch (error) {
      return {
        ok: false,
        error: "네트워크 오류가 발생했습니다.",
      };
    }
  }

  function postJson(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload || {}),
    })
      .then(async (res) => {
        const text = await res.text();
        let data = {};

        try {
          data = text ? JSON.parse(text) : {};
        } catch (error) {
          data = {
            ok: false,
            error: "서버 오류가 발생했습니다.",
          };
        }

        if (!("ok" in data)) data.ok = res.ok;
        if (!res.ok && !data.error) data.error = `요청 실패 (${res.status})`;

        return data;
      })
      .catch(() => ({
        ok: false,
        error: "네트워크 오류가 발생했습니다.",
      }));
  }

  function invalidateLists() {
    friendRequestsLoaded = false;
    roomDirectoryLoaded = false;
  }

  async function refreshAllLists(skipDirectory = false) {
    invalidateLists();

    const tasks = [];

    if (socialFriendRequestsUrl) {
      tasks.push(loadFriendRequests(true));
    }

    if (!skipDirectory && socialRoomListUrl) {
      tasks.push(loadRoomDirectory(currentSearchQuery, true));
    }

    await Promise.all(tasks);
  }

  function setButtonLoading(btn, loadingText = "처리중...") {
    if (!btn) return;

    btn.dataset.originalText = btn.textContent.trim();
    btn.disabled = true;
    btn.textContent = loadingText;
  }

  function restoreButton(btn) {
    if (!btn) return;

    btn.disabled = false;

    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
    }
  }

  function inferFriendActionFromButton(btn) {
    const rawAction = String(btn.dataset.friendAction || "").trim().toLowerCase();

    if (rawAction) return rawAction;

    const status = String(btn.dataset.friendshipStatus || "").trim();
    const direction = String(btn.dataset.friendshipDirection || "").trim();

    if (btn.classList.contains("is-friend") || status === "accepted") {
      return "remove";
    }

    if (btn.classList.contains("is-pending") || (status === "pending" && direction === "outgoing")) {
      return "cancel";
    }

    if (btn.classList.contains("is-incoming") || (status === "pending" && direction === "incoming")) {
      return "accept";
    }

    return "add";
  }

  function getFriendshipFromResult(result) {
    return result?.friendship || {
      friendship_id: result?.friendship_id || "",
      friendship_status: result?.friendship_status || "none",
      friendship_direction: result?.friendship_direction || "none",
    };
  }

  function applyFriendStateToButton(btn, state) {
    if (!btn || !state) return;

    const status = String(state.friendship_status || "none");
    const direction = String(state.friendship_direction || "none");

    btn.dataset.friendshipStatus = status;
    btn.dataset.friendshipDirection = direction;
    btn.dataset.friendshipId = state.friendship_id || "";

    btn.classList.remove(
      "is-friend",
      "is-pending",
      "is-incoming",
      "social-btn-primary",
      "social-btn-secondary",
      "social-btn-yellow"
    );

    btn.classList.add("social-btn");

    if (status === "accepted") {
      btn.classList.add("social-btn-secondary", "is-friend");
      btn.textContent = btn.dataset.friendText || "친구 취소";
      btn.dataset.friendAction = "remove";
      return;
    }

    if (status === "pending" && direction === "outgoing") {
      btn.classList.add("social-btn-secondary", "is-pending");
      btn.textContent = btn.dataset.pendingText || "요청 취소";
      btn.dataset.friendAction = "cancel";
      return;
    }

    if (status === "pending" && direction === "incoming") {
      btn.classList.add("social-btn-primary", "is-incoming");
      btn.textContent = btn.dataset.incomingText || "수락";
      btn.dataset.friendAction = "accept";
      return;
    }

    btn.classList.add("social-btn-yellow");
    btn.textContent = btn.dataset.addText || "친구 신청";
    btn.dataset.friendAction = "add";
  }

  async function handleFriendButtonClick(btn, options = {}) {
    const username =
      btn.dataset.username ||
      btn.dataset.friendUsername ||
      btn.dataset.friendshipUsername ||
      btn.dataset.targetUsername ||
      "";

    if (!username) {
      alert("대상 사용자를 찾을 수 없습니다.");
      return;
    }

    const action = inferFriendActionFromButton(btn);

    if (action === "remove") {
      const ok = confirm("정말 친구를 삭제하시겠습니까?");
      if (!ok) return;
    }

    setButtonLoading(btn);

    const result = await postJson(`${socialFriendRequestUrlBase}${encodeURIComponent(username)}/`, {
      action,
    });

    if (!result.ok) {
      alert(result.error || "친구 요청 처리에 실패했습니다.");
      restoreButton(btn);
      return;
    }

    const state = getFriendshipFromResult(result);

    applyFriendStateToButton(btn, state);
    btn.disabled = false;

    updateMatchingFriendButtons(username, state, btn);

    if (options.refreshPanels !== false) {
      await refreshAllLists(options.skipDirectory === true);
    }
  }

  function updateMatchingFriendButtons(username, state, exceptBtn = null) {
    if (!username) return;

    document
      .querySelectorAll(
        [
          ".directory-add-friend-btn",
          ".avatar-friend-btn",
          ".room-friend-btn",
          "[data-friendship-username]",
          "[data-friend-username]",
          "[data-target-username]",
        ].join(",")
      )
      .forEach((btn) => {
        if (btn === exceptBtn) return;

        const btnUsername =
          btn.dataset.username ||
          btn.dataset.friendUsername ||
          btn.dataset.friendshipUsername ||
          btn.dataset.targetUsername ||
          "";

        if (btnUsername === username) {
          applyFriendStateToButton(btn, state);
        }
      });
  }

  function bindGenericFriendButtons(root = document) {
    root
      .querySelectorAll(
        [
          ".directory-add-friend-btn",
          ".avatar-friend-btn",
          ".room-friend-btn",
          "[data-friendship-username]",
          "[data-friend-username]",
          "[data-target-username]",
        ].join(",")
      )
      .forEach((btn) => {
        if (btn.dataset.friendBound === "1") return;

        btn.dataset.friendBound = "1";

        btn.addEventListener("click", async () => {
          await handleFriendButtonClick(btn);
        });
      });
  }

  function buildFriendActionHtml(item, username) {
    const status = getFriendshipStatus(item);
    const direction = getFriendshipDirection(item);

    if (status === "accepted") {
      return `
        <button
          type="button"
          class="social-btn social-btn-secondary directory-add-friend-btn is-friend"
          data-username="${escapeHtml(username)}"
          data-friendship-status="accepted"
          data-friendship-direction="none"
          data-friend-action="remove"
        >
          친구 취소
        </button>
      `;
    }

    if (status === "pending" && direction === "outgoing") {
      return `
        <button
          type="button"
          class="social-btn social-btn-secondary directory-add-friend-btn is-pending"
          data-username="${escapeHtml(username)}"
          data-friendship-status="pending"
          data-friendship-direction="outgoing"
          data-friend-action="cancel"
        >
          요청 취소
        </button>
      `;
    }

    if (status === "pending" && direction === "incoming") {
      return `
        <button
          type="button"
          class="social-btn social-btn-primary directory-add-friend-btn is-incoming"
          data-username="${escapeHtml(username)}"
          data-friendship-status="pending"
          data-friendship-direction="incoming"
          data-friend-action="accept"
        >
          수락
        </button>
      `;
    }

    return `
      <button
        type="button"
        class="social-btn social-btn-yellow directory-add-friend-btn"
        data-username="${escapeHtml(username)}"
        data-friendship-status="none"
        data-friendship-direction="none"
        data-friend-action="add"
      >
        친구 신청
      </button>
    `;
  }

  function renderFriendRequests(items) {
    const wrap = document.getElementById("friendRequestList");

    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = `<div class="empty-text">대기 중인 요청이 없습니다.</div>`;
      return;
    }

    wrap.innerHTML = "";

    items.forEach((item, index) => {
      const displayName = getDisplayName(item);
      const roomUrl = getRoomUrl(item);
      const number = index + 1;
      const dateOnly = getDateOnly(item);

      const card = document.createElement("div");
      card.className = "friend-request-card";

      card.innerHTML = `
        <div class="friend-request-line">
          <div class="friend-request-number">${number}</div>

          <a
            href="${escapeHtml(roomUrl)}"
            class="friend-request-name ${fontClassFromKey(getNicknameFontKey(item))} ${effectClassFromKey(getNicknameEffectKey(item))}"
            style="${buildNicknameStyle(item, 14)}"
            title="${escapeHtml(displayName)}"
          >
            ${escapeHtml(displayName)}
          </a>

          <span class="friend-request-date">${escapeHtml(dateOnly)}</span>

          <a href="${escapeHtml(roomUrl)}" class="social-btn request-mini-btn request-visit-btn">방문</a>

          <button
            type="button"
            class="social-btn request-mini-btn request-accept-btn friend-accept-btn"
            data-id="${escapeHtml(item.id)}"
          >
            수락
          </button>

          <button
            type="button"
            class="social-btn request-mini-btn request-reject-btn friend-reject-btn"
            data-id="${escapeHtml(item.id)}"
          >
            거절
          </button>
        </div>
      `;

      wrap.appendChild(card);
    });

    wrap.querySelectorAll(".friend-accept-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;

        setButtonLoading(btn);

        const result = await postJson(`${socialFriendRespondUrlBase}${id}/`, {
          action: "accept",
        });

        if (!result.ok) {
          alert(result.error || "수락에 실패했습니다.");
          restoreButton(btn);
          return;
        }

        btn.disabled = false;
        await refreshAllLists(false);
      });
    });

    wrap.querySelectorAll(".friend-reject-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;

        setButtonLoading(btn);

        const result = await postJson(`${socialFriendRespondUrlBase}${id}/`, {
          action: "reject",
        });

        if (!result.ok) {
          alert(result.error || "거절에 실패했습니다.");
          restoreButton(btn);
          return;
        }

        btn.disabled = false;
        await refreshAllLists(false);
      });
    });
  }

  async function loadFriendRequests(force = false) {
    const wrap = document.getElementById("friendRequestList");

    if (!socialFriendRequestsUrl) return;
    if (friendRequestsLoaded && !force) return;

    if (wrap) {
      wrap.innerHTML = `<div class="empty-text">요청을 불러오는 중입니다...</div>`;
    }

    const result = await fetchJson(`${socialFriendRequestsUrl}?t=${Date.now()}`);

    if (result.ok) {
      renderFriendRequests(result.requests || []);
      friendRequestsLoaded = true;
    } else if (wrap) {
      wrap.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "실패했습니다.")}</div>`;
    }
  }

  function buildRoomCard(item, index) {
    const number = index + 1;
    const username = getUsername(item);
    const displayName = getDisplayName(item);
    const roomUrl = getRoomUrl(item);

    return `
      <div class="room-row-card" data-username="${escapeHtml(username)}">
        <div class="room-row-line">
          <div class="room-row-number">${number}</div>

          <div
            class="room-row-name room-row-name-fixed ${fontClassFromKey(getNicknameFontKey(item))} ${effectClassFromKey(getNicknameEffectKey(item))}"
            style="${buildNicknameStyle(item, 14)}"
            title="${escapeHtml(displayName)}"
          >
            ${escapeHtml(displayName)}
          </div>

          <a href="${escapeHtml(roomUrl)}" class="social-btn people-action-btn visit-btn">구경하기</a>

          ${buildFriendActionHtml(item, username)}
        </div>
      </div>
    `;
  }

  function renderRoomDirectory(items) {
    const wrap = document.getElementById("roomDirectoryList");

    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = `<div class="empty-text">사용자를 찾을 수 없습니다.</div>`;
      return;
    }

    wrap.innerHTML = items.map((item, index) => buildRoomCard(item, index)).join("");

    bindGenericFriendButtons(wrap);
  }

  async function loadRoomDirectory(query = "", force = false) {
    const wrap = document.getElementById("roomDirectoryList");

    if (!socialRoomListUrl) return;

    currentSearchQuery = (query || "").trim();

    if (!force && roomDirectoryLoaded && currentSearchQuery === "") return;

    if (wrap) {
      wrap.innerHTML = `<div class="empty-text">목록을 불러오는 중입니다...</div>`;
    }

    const url = currentSearchQuery
      ? `${socialRoomListUrl}?q=${encodeURIComponent(currentSearchQuery)}&t=${Date.now()}`
      : `${socialRoomListUrl}?t=${Date.now()}`;

    const result = await fetchJson(url);

    if (!result.ok) {
      if (wrap) {
        wrap.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "목록을 불러오는데 실패했습니다.")}</div>`;
      }

      return;
    }

    renderRoomDirectory(result.rooms || []);

    if (currentSearchQuery === "") {
      roomDirectoryLoaded = true;
    }
  }

  async function runUserSearch() {
    const input = document.getElementById("userSearchInput");

    if (!input) return;

    await loadRoomDirectory(input.value.trim(), true);
  }

  function initSocialPage() {
    const userSearchBtn = document.getElementById("userSearchBtn");
    const userSearchInput = document.getElementById("userSearchInput");

    if (userSearchBtn) {
      userSearchBtn.addEventListener("click", runUserSearch);
    }

    if (userSearchInput) {
      userSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          runUserSearch();
        }
      });
    }
  }

  async function bootstrapSocialPage() {
    await Promise.all([
      loadFriendRequests(true),
      loadRoomDirectory("", true),
    ]);
  }

  initSocialPage();
  bindGenericFriendButtons(document);
  bootstrapSocialPage();
});