document.addEventListener("DOMContentLoaded", function () {
  const page = document.getElementById("socialPage");
  if (!page) return;

  const myRoomUrl = page.dataset.myRoomUrl || "/avatar/my-room/";
  const friendAvatarBase = page.dataset.friendAvatarBase || "/avatar/room/";
  const socialFriendRequestUrlBase = page.dataset.socialFriendRequestUrlBase || "/social/api/friends/request/";
  const socialFriendRespondUrlBase = page.dataset.socialFriendRespondUrlBase || "/social/api/friends/respond/";
  const socialFriendRequestsUrl = page.dataset.socialFriendRequestsUrl || "";
  const socialFriendListUrl = page.dataset.socialFriendListUrl || "";
  const socialRoomListUrl = page.dataset.socialRoomListUrl || "";

  let currentSearchQuery = "";
  let roomDirectoryLoaded = false;
  let friendRequestsLoaded = false;
  let friendOptionsLoaded = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fontClassFromKey(key) {
    if (!key) return "font-default";
    return `font-${String(key).trim()}`;
  }

  function effectClassFromKey(key) {
    const normalized = String(key || "none").trim().replace(/_/g, "-");
    return `effect-${normalized || "none"}`;
  }

  function getNicknameFontKey(item) {
    return String(item?.nickname_font_key || "").trim();
  }

  function getNicknameEffectKey(item) {
    return String(item?.nickname_effect_key || "none").trim();
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
    const fontSize = Math.max(14, Math.round(baseSize * scale));
    return `font-size:${fontSize}px; letter-spacing:${spacing}px;`;
  }

  function getDisplayName(item) {
    if (!item) return "Player";
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
      "Player"
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
      } catch (e) {
        data = { ok: false, error: "Invalid JSON response." };
      }

      if (!("ok" in data)) data.ok = res.ok;
      if (!res.ok && !data.error) data.error = `Request failed (${res.status})`;

      return data;
    } catch (error) {
      return { ok: false, error: "Network error." };
    }
  }

  function postJson(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": window.CSRF_TOKEN || "",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload || {}),
    })
      .then(async (res) => {
        const text = await res.text();
        let data = {};

        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          data = { ok: false, error: "Server returned invalid JSON." };
        }

        if (!("ok" in data)) data.ok = res.ok;
        if (!res.ok && !data.error) data.error = `Request failed (${res.status})`;
        return data;
      })
      .catch(() => ({ ok: false, error: "Network error." }));
  }

  function invalidateLists() {
    friendRequestsLoaded = false;
    friendOptionsLoaded = false;
    roomDirectoryLoaded = false;
  }

  async function refreshAllLists() {
    invalidateLists();
    await Promise.all([
      loadFriendRequests(true),
      loadFriendSelectOptions(true),
      loadRoomDirectory(currentSearchQuery, true),
    ]);
  }

  function renderFriendRequests(items) {
    const wrap = document.getElementById("friendRequestList");
    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = `<div class="empty-text">No pending requests.</div>`;
      return;
    }

    wrap.innerHTML = "";

    items.forEach((item) => {
      const displayName = getDisplayName(item);
      const username = getUsername(item);
      const roomUrl = getRoomUrl(item);

      const card = document.createElement("div");
      card.className = "friend-request-card";
      card.innerHTML = `
        <div class="friend-request-top">
          <div class="friend-request-head-left">
            <div
              class="friend-request-name ${fontClassFromKey(getNicknameFontKey(item))} ${effectClassFromKey(getNicknameEffectKey(item))}"
              style="${buildNicknameStyle(item, 14)}"
            >
              ${escapeHtml(displayName)}
            </div>
          </div>
          <div class="friend-request-sub">${escapeHtml(item.created_at || "")}</div>
        </div>
        <div class="friend-request-actions">
          <a href="${roomUrl}" class="social-btn social-btn-secondary">Visit</a>
          <button type="button" class="social-btn social-btn-primary friend-accept-btn" data-id="${item.id}" data-username="${escapeHtml(username)}">Accept</button>
          <button type="button" class="social-btn social-btn-secondary friend-reject-btn" data-id="${item.id}" data-username="${escapeHtml(username)}">Reject</button>
        </div>
      `;
      wrap.appendChild(card);
    });

    wrap.querySelectorAll(".friend-accept-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        btn.disabled = true;

        const result = await postJson(`${socialFriendRespondUrlBase}${id}/`, { action: "accept" });

        btn.disabled = false;

        if (!result.ok) {
          alert(result.error || "Accept failed.");
          return;
        }

        await refreshAllLists();
      });
    });

    wrap.querySelectorAll(".friend-reject-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        btn.disabled = true;

        const result = await postJson(`${socialFriendRespondUrlBase}${id}/`, { action: "reject" });

        btn.disabled = false;

        if (!result.ok) {
          alert(result.error || "Reject failed.");
          return;
        }

        await refreshAllLists();
      });
    });
  }

  async function loadFriendRequests(force = false) {
    const wrap = document.getElementById("friendRequestList");
    if (!socialFriendRequestsUrl) return;
    if (friendRequestsLoaded && !force) return;

    if (wrap) {
      wrap.innerHTML = `<div class="empty-text">Loading requests...</div>`;
    }

    const result = await fetchJson(socialFriendRequestsUrl);
    if (result.ok) {
      renderFriendRequests(result.requests || []);
      friendRequestsLoaded = true;
    } else if (wrap) {
      wrap.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "Failed to load requests.")}</div>`;
    }
  }

  async function loadFriendSelectOptions(force = false) {
    const friendSelect = document.getElementById("friendSelect");
    if (!friendSelect || !socialFriendListUrl) return;
    if (friendOptionsLoaded && !force) return;

    const result = await fetchJson(socialFriendListUrl);
    if (!result.ok) return;

    friendSelect.innerHTML = `<option value="">Choose friend</option>`;
    (result.friends || []).forEach((friend) => {
      const option = document.createElement("option");
      option.value = getUsername(friend);
      option.textContent = getDisplayName(friend);
      friendSelect.appendChild(option);
    });

    friendOptionsLoaded = true;
  }

  function buildFriendActionHtml(item, username) {
    const isFriend = item.friendship_status === "accepted";
    const isPending = item.friendship_status === "pending";

    if (isFriend) {
      return `<span class="mini-pill is-warm">Friend</span>`;
    }

    if (isPending) {
      return `<button type="button" class="social-btn social-btn-secondary directory-add-friend-btn is-pending" data-username="${escapeHtml(username)}">Cancel</button>`;
    }

    return `<button type="button" class="social-btn social-btn-secondary directory-add-friend-btn" data-username="${escapeHtml(username)}">Add Friend</button>`;
  }

  function buildRoomCard(item, index) {
    const number = index + 1;
    const username = getUsername(item);
    const displayName = getDisplayName(item);
    const roomUrl = getRoomUrl(item);

    return `
      <div class="room-row-card">
        <div class="room-row-line">
          <div class="room-row-number">${number}</div>
          <div
            class="room-row-name room-row-name-fixed ${fontClassFromKey(getNicknameFontKey(item))} ${effectClassFromKey(getNicknameEffectKey(item))}"
            style="${buildNicknameStyle(item, 14)}"
          >
            ${escapeHtml(displayName)}
          </div>
          <a href="${roomUrl}" class="social-btn social-btn-primary people-action-btn">Visit</a>
          ${buildFriendActionHtml(item, username)}
        </div>
      </div>
    `;
  }

  async function toggleFriendRequest(username) {
    const result = await postJson(`${socialFriendRequestUrlBase}${username}/`, {});
    if (!result.ok) {
      alert(result.error || "Failed to update friend request.");
      return false;
    }
    return true;
  }

  function renderRoomDirectory(items) {
    const wrap = document.getElementById("roomDirectoryList");
    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = `<div class="empty-text">No users found.</div>`;
      return;
    }

    wrap.innerHTML = items.map((item, index) => buildRoomCard(item, index)).join("");

    wrap.querySelectorAll(".directory-add-friend-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = btn.dataset.username;
        btn.disabled = true;

        const ok = await toggleFriendRequest(username);

        btn.disabled = false;

        if (!ok) return;
        await refreshAllLists();
      });
    });
  }

  async function loadRoomDirectory(query = "", force = false) {
    const wrap = document.getElementById("roomDirectoryList");
    if (!socialRoomListUrl) return;

    currentSearchQuery = query || "";

    if (!force && roomDirectoryLoaded && currentSearchQuery === "") return;

    if (wrap) {
      wrap.innerHTML = `<div class="empty-text">Loading list...</div>`;
    }

    const result = await fetchJson(socialRoomListUrl);
    if (!result.ok) {
      if (wrap) {
        wrap.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "Failed to load users.")}</div>`;
      }
      return;
    }

    let rooms = result.rooms || [];

    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      rooms = rooms.filter((item) => {
        const displayName = String(getDisplayName(item)).toLowerCase();
        const username = String(getUsername(item)).toLowerCase();
        return displayName.includes(q) || username.includes(q);
      });
    }

    renderRoomDirectory(rooms);

    if (currentSearchQuery === "") {
      roomDirectoryLoaded = true;
    }
  }

  async function runUserSearch() {
    const input = document.getElementById("userSearchInput");
    if (!input) return;
    await loadRoomDirectory(input.value.trim(), true);
  }

  const userSearchBtn = document.getElementById("userSearchBtn");
  const userSearchInput = document.getElementById("userSearchInput");
  const visitFriendBtn = document.getElementById("visitFriendBtn");
  const friendSelect = document.getElementById("friendSelect");
  const goMyRoomBtn = document.getElementById("goMyRoomBtn");

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

  if (visitFriendBtn && friendSelect) {
    visitFriendBtn.addEventListener("click", () => {
      const username = friendSelect.value;
      if (!username) {
        alert("Choose a friend first.");
        return;
      }
      window.location.href = `${friendAvatarBase}${username}/`;
    });
  }

  if (goMyRoomBtn) {
    goMyRoomBtn.addEventListener("click", () => {
      window.location.href = myRoomUrl;
    });
  }

  async function bootstrap() {
    await Promise.all([
      loadFriendRequests(true),
      loadFriendSelectOptions(true),
      loadRoomDirectory("", true),
    ]);
  }

  bootstrap();
});