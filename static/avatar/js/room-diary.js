(function () {
  function boot() {
    const shared = window.RoomPage;
    if (!shared || shared.__diaryBooted) return;
    shared.__diaryBooted = true;

    const { els, state, API } = shared;

    const escapeHtml =
      shared.escapeHtml ||
      function (value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

    const normalizeTypedText =
      shared.normalizeTypedText ||
      function (value) {
        return String(value ?? "")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/\u00a0/g, " ")
          .replace(/^\s+/gm, "");
      };

    const escapeHtmlPreserveText =
      shared.escapeHtmlPreserveText ||
      function (value) {
        return escapeHtml(normalizeTypedText(value));
      };

    const fetchJson = shared.fetchJson;
    const postJson = shared.postJson;
    const withPending = shared.withPending;
    const formatDateLocal = shared.formatDateLocal;
    const applyViewerWritingPreview = shared.applyViewerWritingPreview || function () {};
    const closeNamePopover = shared.closeNamePopover || function () {};

    const fontClassFromKey =
      shared.fontClassFromKey ||
      function (key) {
        return key ? `font-${key}` : "font-default";
      };

    const effectKeyToClass =
      shared.effectKeyToClass ||
      function (effectKey) {
        return `effect-${String(effectKey || "none").trim().replace(/_/g, "-")}`;
      };

    function buildStyledBody(content, fontKey = "") {
      return `<div class="message-body ${fontClassFromKey(fontKey)}">${escapeHtmlPreserveText(content || "")}</div>`;
    }

    function buildDiaryTitle(title, fontKey = "", effectKey = "none") {
      return `<strong class="diary-entry-title ${fontClassFromKey(fontKey)} ${effectKeyToClass(effectKey)}">${escapeHtml(title || "")}</strong>`;
    }

    function renderDiaryListEntry(entry) {
      return `
        <div class="message-card diary-entry-card" data-entry-id="${escapeHtml(entry.id)}">
          <div class="message-top diary-entry-top">
            ${buildDiaryTitle(
              entry.title || "",
              entry.title_font_key || "",
              entry.title_effect_key || "none"
            )}
            <span>${escapeHtml(entry.entry_date || "")}</span>
          </div>

          ${buildStyledBody(entry.content, entry.content_font_key || "")}

          ${
            entry.can_delete
              ? `<div class="message-actions">
                   <button type="button" class="mini-action-btn danger diary-inline-delete-btn" data-entry-id="${escapeHtml(entry.id)}">
                     Delete
                   </button>
                 </div>`
              : ""
          }
        </div>
      `;
    }

    function renderDiaryList(entries) {
      if (!els.diaryList) return;
      els.diaryList.innerHTML = entries?.length
        ? entries.map(renderDiaryListEntry).join("")
        : `<div class="empty-text">No diary entry on this date.</div>`;
      closeNamePopover();
    }

    function setDiarySelectedDate(dateStr) {
      state.selectedDiaryDate = dateStr;
      if (els.diaryDateInput) els.diaryDateInput.value = dateStr;
      if (els.diarySelectedDateText) {
        els.diarySelectedDateText.textContent = `Selected date: ${dateStr}`;
      }
    }

    function clearDiaryForm(keepDate = true) {
      if (els.diaryEntryIdInput) els.diaryEntryIdInput.value = "";
      if (els.diaryTitleInput) els.diaryTitleInput.value = "";
      if (els.diaryContentInput) els.diaryContentInput.value = "";

      if (!keepDate && formatDateLocal) {
        setDiarySelectedDate(formatDateLocal(new Date()));
      }

      applyViewerWritingPreview();
    }

    function renderCalendar() {
      if (!els.calendarGrid || !els.calendarMonthLabel) return;

      const firstDay = new Date(state.calendarYear, state.calendarMonth, 1);
      const lastDay = new Date(state.calendarYear, state.calendarMonth + 1, 0);
      const startWeekday = firstDay.getDay();
      const daysInMonth = lastDay.getDate();

      els.calendarMonthLabel.textContent = `${state.calendarYear}.${String(
        state.calendarMonth + 1
      ).padStart(2, "0")}`;

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
        if (state.monthDiaryDaysMap && state.monthDiaryDaysMap[cellDate]) classes.push("has-entry");

        html.push(`
          <button
            type="button"
            class="${classes.join(" ")}"
            data-action="pick-diary-date"
            data-date="${cellDate}"
          >
            ${day}
          </button>
        `);
      }

      els.calendarGrid.innerHTML = html.join("");
    }

    async function loadDiaryMonth(force = false) {
      if (!API.diaryCalendarUrl) return null;

      return withPending("diaryMonthPromise", async () => {
        const url = `${API.diaryCalendarUrl}?year=${state.calendarYear}&month=${state.calendarMonth + 1}`;
        const result = await fetchJson(url);

        state.monthDiaryDaysMap = Object.create(null);

        if (result.ok) {
          for (const item of result.days || []) {
            state.monthDiaryDaysMap[item.date] = item;
          }
        }

        renderCalendar();
        closeNamePopover();
        return result;
      }, force);
    }

    async function loadDiaryByDate(dateStr, force = false) {
      if (!dateStr || !API.diaryDateUrlBase) return null;

      setDiarySelectedDate(dateStr);
      renderCalendar();

      return withPending("diaryDatePromise", async () => {
        const result = await fetchJson(`${API.diaryDateUrlBase}${dateStr}/`);

        if (!result.ok || !result.entry) {
          renderDiaryList([]);
          if (shared.isOwner) clearDiaryForm(true);
          return result;
        }

        const entry = result.entry;
        renderDiaryList([entry]);

        if (shared.isOwner) {
          if (els.diaryEntryIdInput) els.diaryEntryIdInput.value = entry.id || "";
          if (els.diaryTitleInput) els.diaryTitleInput.value = entry.title || "";
          if (els.diaryContentInput) els.diaryContentInput.value = entry.content || "";
        }

        applyViewerWritingPreview();
        return result;
      }, force);
    }

    async function handleDiaryDatePick(dateStr) {
      setDiarySelectedDate(dateStr);
      renderCalendar();

      if (shared.isOwner) {
        clearDiaryForm(true);
        if (els.diaryDateInput) els.diaryDateInput.value = dateStr;
      }

      closeNamePopover();
      await loadDiaryByDate(dateStr, true);
    }

    async function handleDiaryDelete(entryId) {
      if (!window.confirm("Delete this diary?")) return;

      const result = await postJson(`${API.diaryDeleteUrlBase}${entryId}/delete/`, {});
      if (!result.ok) {
        alert(result.error || "Failed to delete diary.");
        return;
      }

      clearDiaryForm(true);
      closeNamePopover();
      await loadDiaryMonth(true);
      await loadDiaryByDate(state.selectedDiaryDate, true);
    }

    function bindDiaryEvents() {
      document.addEventListener("click", async (e) => {
        const dayBtn = e.target.closest('[data-action="pick-diary-date"]');
        if (dayBtn) {
          closeNamePopover();
          await handleDiaryDatePick(dayBtn.dataset.date || "");
          return;
        }
      });

      els.diaryDateInput?.addEventListener("change", async () => {
        closeNamePopover();
        const dateStr = els.diaryDateInput.value;
        if (!dateStr) return;

        const parts = dateStr.split("-").map(Number);
        if (parts.length === 3) {
          state.calendarYear = parts[0];
          state.calendarMonth = parts[1] - 1;
        }

        setDiarySelectedDate(dateStr);
        await loadDiaryMonth(true);
        await loadDiaryByDate(dateStr, true);
      });

      els.diarySubmitBtn?.addEventListener("click", async () => {
        closeNamePopover();

        const entryId = els.diaryEntryIdInput?.value?.trim() || "";
        const payload = {
          title: normalizeTypedText(els.diaryTitleInput?.value || "").trim(),
          content: normalizeTypedText(els.diaryContentInput?.value || "").trim(),
          entry_date: els.diaryDateInput?.value || state.selectedDiaryDate,
          title_font_key: state.viewerFontPref?.title_font_key || "",
          title_effect_key:
            state.viewerFontPref?.title_effect_key ||
            state.viewerFontPref?.nickname_effect_key ||
            "none",
          content_font_key: state.viewerFontPref?.content_font_key || "",
          content_effect_key: "none",
        };

        if (!payload.entry_date) {
          alert("Choose a diary date first.");
          return;
        }

        if (!payload.title || !payload.content) {
          alert("Please enter both title and content.");
          return;
        }

        const url = entryId
          ? `${API.diaryUpdateUrlBase}${entryId}/update/`
          : API.diaryCreateUrl;

        const result = await postJson(url, payload);
        if (!result.ok) {
          alert(result.error || "Failed to save diary.");
          return;
        }

        if (els.diaryEntryIdInput) {
          els.diaryEntryIdInput.value = result.entry?.id || "";
        }

        await loadDiaryMonth(true);
        await loadDiaryByDate(payload.entry_date, true);
      });

      els.diaryClearBtn?.addEventListener("click", () => {
        closeNamePopover();
        clearDiaryForm(true);
      });

      els.diaryDeleteBtn?.addEventListener("click", async () => {
        closeNamePopover();
        const entryId = els.diaryEntryIdInput?.value?.trim() || "";
        if (!entryId) {
          alert("No saved diary on this selected date.");
          return;
        }
        await handleDiaryDelete(entryId);
      });

      els.diaryList?.addEventListener("click", async (e) => {
        const inlineDeleteBtn = e.target.closest(".diary-inline-delete-btn");
        if (!inlineDeleteBtn) return;
        closeNamePopover();
        await handleDiaryDelete(inlineDeleteBtn.dataset.entryId);
      });

      els.calendarPrevBtn?.addEventListener("click", async () => {
        closeNamePopover();
        state.calendarMonth -= 1;
        if (state.calendarMonth < 0) {
          state.calendarMonth = 11;
          state.calendarYear -= 1;
        }
        await loadDiaryMonth(true);
      });

      els.calendarNextBtn?.addEventListener("click", async () => {
        closeNamePopover();
        state.calendarMonth += 1;
        if (state.calendarMonth > 11) {
          state.calendarMonth = 0;
          state.calendarYear += 1;
        }
        await loadDiaryMonth(true);
      });
    }

    shared.renderCalendar = renderCalendar;
    shared.loadDiaryMonth = loadDiaryMonth;
    shared.loadDiaryByDate = loadDiaryByDate;
    shared.handleDiaryDatePick = handleDiaryDatePick;
    shared.setDiarySelectedDate = setDiarySelectedDate;
    shared.clearDiaryForm = clearDiaryForm;
    shared.renderDiaryList = renderDiaryList;
    shared.bindDiaryEvents = bindDiaryEvents;

    bindDiaryEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();