
const activityTypeNames = {
  LECT: "Lecture",
  TUT: "Tutorial",
  PRAC: "Practical",
  PROB: "Problems Class",
  PROBA: "Problems Class",
};

const namingModes = {
  short: "short",
  full: "full",
};

const state = {
  mode: "html",
  academicYearKey: "",
  namingMode: namingModes.short,
  activities: [],
  events: [],
};

const els = {
  htmlInput: document.querySelector("#htmlInput"),
  htmlFileInput: document.querySelector("#htmlFileInput"),
  dropZone: document.querySelector("#dropZone"),
  urlInput: document.querySelector("#urlInput"),
  fetchUrlButton: document.querySelector("#fetchUrlButton"),
  extractButton: document.querySelector("#extractButton"),
  clearButton: document.querySelector("#clearButton"),
  downloadButton: document.querySelector("#downloadButton"),
  defaultDate: document.querySelector("#defaultDate"),
  defaultDuration: document.querySelector("#defaultDuration"),
  calendarName: document.querySelector("#calendarName"),
  eventsTable: document.querySelector("#eventsTable"),
  eventCount: document.querySelector("#eventCount"),
  summaryText: document.querySelector("#summaryText"),
  message: document.querySelector("#message"),
};

const monthNames = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const dayOffsets = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const fallbackTeachingWeekConfig = {
  years: {
    "2026-27": {
      label: "2026-27",
      week0Start: "2026-07-13",
      teachingWeeks: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 41, 42, 43, 44, 45, 46, 47, 48, 49],
      teachingWeekRanges: [
        { term: "Michaelmas", startDurhamWeek: 12, endDurhamWeek: 21, startTeachingWeek: 1 },
        { term: "Epiphany", startDurhamWeek: 26, endDurhamWeek: 35, startTeachingWeek: 11 },
        { term: "Easter", startDurhamWeek: 41, endDurhamWeek: 49, startTeachingWeek: 21 },
      ],
      termEnds: {
        michaelmas: "2026-12-18",
        epiphany: "2027-03-19",
        easter: "2027-06-25",
      },
    },
  },
  moduleShortNames: {
    "Statistical Inference Ii": "SI2",
    "Statistical Inference II": "SI2",
    "Machine Learning": "Machine Learning",
  },
};

let teachingWeekConfig = fallbackTeachingWeekConfig;
let teachingWeekConfigLoadedFromJson = false;

init();

async function init() {
  await loadTeachingWeekConfig();
  els.defaultDate.value = new Date().toISOString().slice(0, 10);

  document.querySelectorAll("[data-source-mode]").forEach((button) => {
    button.addEventListener("click", () => setSourceMode(button.dataset.sourceMode));
  });

  els.fetchUrlButton.addEventListener("click", fetchUrl);
  els.htmlFileInput.addEventListener("change", loadHtmlFile);
  els.dropZone.addEventListener("dragenter", handleDragEnter);
  els.dropZone.addEventListener("dragover", handleDragOver);
  els.dropZone.addEventListener("dragleave", handleDragLeave);
  els.dropZone.addEventListener("drop", handleDrop);
  els.extractButton.addEventListener("click", extractFromCurrentSource);
  els.downloadButton.addEventListener("click", downloadCalendar);
  els.clearButton.addEventListener("click", clearAll);

  renderEvents();
}

async function loadTeachingWeekConfig() {
  try {
    const response = await fetch("teaching-weeks.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`teaching-weeks.json returned ${response.status}`);
    }

    const loadedConfig = await response.json();

    if (!loadedConfig || typeof loadedConfig !== "object") {
      throw new Error("teaching-weeks.json did not contain an object.");
    }

    if (!loadedConfig.years || typeof loadedConfig.years !== "object") {
      throw new Error("teaching-weeks.json did not contain a years object.");
    }

    teachingWeekConfig = {
      years: {
        ...fallbackTeachingWeekConfig.years,
        ...loadedConfig.years,
      },
      moduleShortNames: {
        ...fallbackTeachingWeekConfig.moduleShortNames,
        ...(loadedConfig.moduleShortNames || {}),
      },
    };

    teachingWeekConfigLoadedFromJson = true;
  } catch (error) {
    teachingWeekConfig = fallbackTeachingWeekConfig;
    teachingWeekConfigLoadedFromJson = false;

    showMessage(
      `Could not load teaching-weeks.json. Using embedded fallback teaching-week data. ${error.message}`,
      "note",
    );
  }
}

function loadHtmlFile() {
  const [file] = els.htmlFileInput.files;
  if (!file) {
    return;
  }

  readHtmlFile(file);
}

function handleDragEnter(event) {
  event.preventDefault();
  els.dropZone.classList.add("is-dragging");
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  els.dropZone.classList.add("is-dragging");
}

function handleDragLeave(event) {
  if (!els.dropZone.contains(event.relatedTarget)) {
    els.dropZone.classList.remove("is-dragging");
  }
}

function handleDrop(event) {
  event.preventDefault();
  els.dropZone.classList.remove("is-dragging");

  const [file] = event.dataTransfer.files;
  if (!file) {
    return;
  }

  readHtmlFile(file);
}

function readHtmlFile(file) {
  if (!isHtmlFile(file)) {
    showMessage("Drop or choose an .html or .htm file.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    els.htmlInput.value = String(reader.result || "");
    showMessage(`Loaded ${file.name}. Extract entries when ready.`, "note");
  });
  reader.addEventListener("error", () => {
    showMessage(`Could not read ${file.name}.`);
  });
  reader.readAsText(file);
}

function isHtmlFile(file) {
  const name = file.name.toLowerCase();
  return file.type === "text/html" || name.endsWith(".html") || name.endsWith(".htm");
}

function setSourceMode(mode) {
  state.mode = mode;
  document.querySelectorAll("[data-source-mode]").forEach((button) => {
    const isActive = button.dataset.sourceMode === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === mode);
  });
  clearMessage();
}

async function fetchUrl() {
  const html = await fetchUrlHtml();
  if (!html) {
    return null;
  }

  els.htmlInput.value = html;
  setSourceMode("html");
  showMessage("Fetched the page HTML. Review it if needed, then extract entries.", "note");
  return html;
}

async function fetchUrlHtml() {
  const url = els.urlInput.value.trim();
  if (!url) {
    showMessage("Enter a timetable URL first.");
    return null;
  }

  try {
    els.fetchUrlButton.disabled = true;
    els.extractButton.disabled = true;
    els.fetchUrlButton.textContent = "Fetching";
    clearMessage();

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`The server responded with ${response.status}.`);
    }

    return await response.text();
  } catch (error) {
    showMessage(`Could not fetch that URL from the browser. Many sites block direct static-app reads with CORS. Open the page, copy the timetable HTML or visible text, and paste it here. ${error.message}`);
    return null;
  } finally {
    els.fetchUrlButton.disabled = false;
    els.extractButton.disabled = false;
    els.fetchUrlButton.textContent = "Fetch";
  }
}

async function extractFromCurrentSource() {
  let source = state.mode === "url" ? els.urlInput.value.trim() : els.htmlInput.value.trim();

  if (!source) {
    showMessage("Paste or upload a saved Durham timetable HTML file before extracting.");
    return;
  }

  if (state.mode === "url") {
    source = await fetchUrlHtml();
    if (!source) {
      state.activities = [];
      state.events = [];
      renderEvents();
      return;
    }
  }

  const result = extractTimetable(source);
  state.activities = result.activities;
  state.events = result.events;
  renderEvents();

  if (result.errors.length > 0) {
    showMessage(result.errors[0]);
    return;
  }

  if (result.events.length === 0) {
    showMessage(result.warnings[0] || "The Durham timetable was recognised, but no dated calendar events could be generated.");
    return;
  }

  const eventGroups = getPreviewEventGroups(state.events);

  console.table(
    eventGroups.map((group) => {
      const first = group.events[0];

      return {
        title: first.title,
        weeks: formatPreviewWeeks(group),
        day: first.start.toLocaleDateString("en-GB", {
          weekday: "short",
        }),
        start: formatTime(first.start),
        end: formatTime(first.end),
        durationMinutes: (first.end - first.start) / 60000,
        location: first.location,
        count: group.events.length,
        interval: group.interval,
      };
    })
  );

  showMessage(
    [
      `Detected academic year ${state.academicYearKey}.`,
      `Activities parsed: ${result.activities.length}.`,
      `Occurrences generated: ${result.events.length}.`,
      `Grouped events: ${eventGroups.length}.`,
      result.warnings.length > 0 ? `Warnings: ${result.warnings.length}.` : "Warnings: 0.",
    ].join(" "),
    "note",
  );
}

function parseDocument(source) {
  return new DOMParser().parseFromString(source, "text/html");
}

function extractTimetable(source) {
  const doc = parseDocument(source);
  const diagnostics = diagnoseDurhamTimetable(doc);

  if (diagnostics.errors.length > 0) {
    return {
      activities: [],
      events: [],
      errors: diagnostics.errors,
      warnings: diagnostics.warnings,
    };
  }

  const academicYear = resolveAcademicYear(doc);
  state.academicYearKey = academicYear.key;

  if (!teachingWeekConfigLoadedFromJson) {
    diagnostics.warnings.push("Using embedded fallback teaching-week data because teaching-weeks.json was not loaded.");
  }

  if (academicYear.usedFallbackYear) {
    diagnostics.warnings.push(
      academicYear.detectedKey
        ? `Academic year ${academicYear.detectedKey} was detected, but no teaching-week configuration was available. Using ${academicYear.key} as fallback.`
        : `Could not detect academic year. Using ${academicYear.key} as fallback.`,
    );
  }

  const activities = extractDurhamTimetableActivities(doc, academicYear.config);
  activities
    .filter((activity) => !activityTypeNames[String(activity.activityCode || "").toUpperCase()])
    .forEach((activity) => {
      diagnostics.warnings.push(`Unknown activity code: ${activity.activityCode}`);
    });
  const events = expandActivitiesToEvents(activities, academicYear.config).filter(dedupeEvents);

  return {
    activities,
    events,
    errors: [],
    warnings: diagnostics.warnings,
  };
}

function diagnoseDurhamTimetable(doc) {
  const errors = [];
  const warnings = [];

  const timetable = findDurhamTimetable(doc);

  if (!timetable) {
    errors.push(
      "This does not look like a Durham timetable HTML export. Please upload or paste the saved Durham timetable page containing the purple time-grid table.",
    );

    return { errors, warnings };
  }

  const times = getDurhamColumnTimes(timetable);

  if (times.length === 0) {
    errors.push(
      "A Durham timetable table was found, but the time columns could not be read.",
    );
  }

  const weekAnchor = getDurhamWeekAnchor(doc);

  if (!weekAnchor) {
    errors.push(
      "A Durham timetable table was found, but the week/date header could not be read. Expected something like: Weeks: 12-21 (5 Oct 2026, ...).",
    );
  }

  if (!/[A-Z]{2,}\d+\/[A-Z]+\/\d+/.test(timetable.textContent)) {
    warnings.push(
      "The timetable grid was found, but no Durham activity codes were recognised.",
    );
  }

  return { errors, warnings };
}

function resolveAcademicYear(doc) {
  const detectedKey = detectAcademicYearKey(doc);
  const years = teachingWeekConfig.years;

  if (detectedKey && years[detectedKey]) {
    return {
      key: detectedKey,
      config: years[detectedKey],
      usedFallbackYear: false,
      detectedKey,
    };
  }

  const fallbackKey = Object.keys(years)[0];

  return {
    key: fallbackKey,
    config: years[fallbackKey],
    usedFallbackYear: true,
    detectedKey,
  };
}

function detectAcademicYearKey(doc) {
  const weekAnchor = getDurhamWeekAnchor(doc);

  if (!weekAnchor) {
    return "";
  }

  const year = weekAnchor.monday.getFullYear();
  const month = weekAnchor.monday.getMonth();

  const startYear = month >= 7 ? year : year - 1;
  const endYear = startYear + 1;

  return `${startYear}-${String(endYear).slice(-2)}`;
}

function extractEvents(source) {
  return extractTimetable(source).events;
}

function extractDurhamTimetableActivities(doc, academicYear) {
  const timetable = findDurhamTimetable(doc);
  if (!timetable) {
    return [];
  }

  const times = getDurhamColumnTimes(timetable);
  if (times.length === 0 || !academicYear) {
    return [];
  }

  const activities = [];
  let currentDay = null;

  getDirectTableRows(timetable).slice(1).forEach((row) => {
    const cells = Array.from(row.children);
    if (cells.length === 0) {
      return;
    }

    let slot = 0;

    cells.forEach((cell, index) => {
      const dayName = getDurhamDayName(cell);

      if (index === 0 && dayName) {
        currentDay = dayName;
        return;
      }

      if (!currentDay) {
        return;
      }

      const span = Number(cell.getAttribute("colspan") || 1);

      if (isDurhamObjectCell(cell)) {
        const parsed = parseDurhamActivityCell(cell);

        if (parsed && times[slot]) {
          activities.push(createDurhamActivity({
            parsed,
            day: currentDay,
            startTime: times[slot],
            durationMinutes: span * 15,
            academicYear,
          }));
        }
      }

      slot += span;
    });
  });

  return activities;
}

function expandActivitiesToEvents(activities, academicYear) {
  return activities.flatMap((activity) => {
    return activity.expandedWeeks.flatMap((week) => {
      const date = dateForAcademicYearWeekDay(academicYear, week, activity.day);
      if (!date) {
        return [];
      }

      const start = applyTime(date, activity.startTime);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + activity.durationMinutes);

      const teachingWeekInfo = getTeachingWeekInfo(academicYear, week);

      return [{
        id: createOccurrenceId(activity, week),
        activityId: activity.id,
        week,
        teachingWeek: teachingWeekInfo.teachingWeek,
        term: teachingWeekInfo.term,
        title: buildEventTitle(activity, state.namingMode),
        location: activity.location,
        description: buildActivityDescription(activity, teachingWeekInfo),
        start,
        end,
      }];
    });
  });
}

function createDurhamActivity({ parsed, day, startTime, durationMinutes, academicYear }) {
  const codeParts = splitDurhamTimetableCode(parsed.code);
  const expandedWeeks = expandDurhamWeeks(parsed.weeks);

  return {
    id: createActivityId({
      timetableCode: parsed.code,
      day,
      startTime,
      weekPattern: parsed.weeks,
    }),

    moduleCode: codeParts.moduleCode,
    moduleName: parsed.title,
    shortModuleName: teachingWeekConfig.moduleShortNames[parsed.title] || "",

    activityCode: codeParts.activityCode,
    activityType: getActivityTypeName(codeParts.activityCode),

    timetableCode: parsed.code,
    activityNumber: codeParts.activityNumber,
    size: parsed.size,

    staff: parsed.staff,
    location: parsed.location,

    day,
    startTime,
    durationMinutes,

    weekPattern: parsed.weeks,
    expandedWeeks,
  };
}

function buildActivityDescription(activity, teachingWeekInfo) {
  return [
    `Module: ${activity.moduleName}`,
    activity.moduleCode ? `Module Code: ${activity.moduleCode}` : "",
    `Activity: ${activity.activityType}`,
    getActivityGroupLabel(activity) ? `Group: ${getActivityGroupLabel(activity).replace(/[()]/g, "")}` : "",
    activity.location ? `Room: ${activity.location}` : "",
    activity.staff ? `Staff: ${activity.staff}` : "",
    activity.timetableCode ? `Timetable Entry: ${activity.timetableCode}` : "",
    teachingWeekInfo.teachingWeek ? `Teaching Week: ${teachingWeekInfo.teachingWeek}` : "",
    teachingWeekInfo.term ? `Term: ${teachingWeekInfo.term}` : "",
  ].filter(Boolean).join("\n");
}

function buildEventTitle(activity, namingMode = namingModes.short) {
  const moduleLabel = namingMode === namingModes.full
    ? activity.moduleName
    : activity.shortModuleName || activity.moduleName;

  const groupLabel = getActivityGroupLabel(activity);

  return `${moduleLabel}: ${activity.activityType}${groupLabel}`;
}

function getActivityGroupLabel(activity) {
  if (!["TUT", "PRAC"].includes(String(activity.activityCode || "").toUpperCase())) {
    return "";
  }

  const groupNumber = Number(activity.activityNumber);
  return Number.isFinite(groupNumber) && groupNumber > 0
    ? ` (G${groupNumber})`
    : "";
}

function splitDurhamTimetableCode(value) {
  const parts = String(value || "").split("/");

  return {
    moduleCode: parts[0] || "",
    activityCode: parts[1] || "",
    activityNumber: parts[2] || "",
  };
}

function getActivityTypeName(activityCode) {
  const normalized = String(activityCode || "").toUpperCase();
  return activityTypeNames[normalized] || normalized || "Activity";
}

function createActivityId({ timetableCode, day, startTime, weekPattern }) {
  return stableHash([
    timetableCode,
    day,
    formatClockTime(startTime),
    weekPattern,
  ].join("|"));
}

function createOccurrenceId(activity, week) {
  return stableHash([
    activity.timetableCode,
    activity.day,
    formatClockTime(activity.startTime),
    week,
    activity.location,
  ].join("|"));
}

function stableHash(value) {
  let hash = 0;
  const text = String(value || "");

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }

  return `activity-${Math.abs(hash).toString(36)}`;
}

function formatClockTime(time) {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}

function findDurhamTimetable(doc) {
  return Array.from(doc.querySelectorAll("table")).find((table) => {
    const firstRow = getDirectTableRows(table)[0];
    if (!firstRow) {
      return false;
    }
    const labels = Array.from(firstRow.children).map((cell) => cleanText(cell.textContent));
    return labels.includes("9:00") && labels.includes("18:00") && /[A-Z]{2,}\d+\/[A-Z]+\/\d+/.test(table.textContent);
  });
}

function getDurhamColumnTimes(table) {
  const firstRow = getDirectTableRows(table)[0];
  if (!firstRow) {
    return [];
  }

  return Array.from(firstRow.children)
    .slice(1)
    .map((cell) => parseClockTime(cleanText(cell.textContent)))
    .filter(Boolean);
}

function getDurhamWeekAnchor(doc) {
  const text = cleanText(doc.body?.textContent || "");
  const match = text.match(/Weeks:\s*([0-9,\-\s]+)\s*\((\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (!match) {
    return null;
  }

  const selectedWeeks = expandDurhamWeeks(match[1]);
  const firstWeek = selectedWeeks[0];
  const firstDate = parseNamedDate(match[2]);
  if (!firstWeek || !firstDate) {
    return null;
  }

  return { week: firstWeek, monday: firstDate };
}

function getDurhamDayName(cell) {
  const text = cleanText(cell.textContent).toLowerCase();
  const map = {
    mon: "monday",
    tue: "tuesday",
    wed: "wednesday",
    thu: "thursday",
    fri: "friday",
  };
  return map[text] || null;
}

function isDurhamObjectCell(cell) {
  return /[A-Z]{2,}\d+\/[A-Z]+\/\d+/.test(cell.textContent);
}

function parseDurhamActivityCell(cell) {
  const rows = Array.from(cell.querySelectorAll("table tr"))
    .map((row) => Array.from(row.children).map((rowCell) => cleanText(rowCell.textContent)))
    .filter((row) => row.length >= 2);

  if (rows.length < 3) {
    return null;
  }

  return {
    code: rows[0][0],
    size: rows[0][1],
    title: rows[1][0],
    weeks: rows[1][1],
    staff: rows[2][0],
    location: rows[2][1],
  };
}

function expandDurhamWeeks(pattern) {
  return String(pattern || "")
    .split(",")
    .flatMap((part) => {
      const trimmed = part.trim();
      if (!trimmed) {
        return [];
      }

      const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!range) {
        const week = Number(trimmed);
        return Number.isFinite(week) ? [week] : [];
      }

      const start = Number(range[1]);
      const end = Number(range[2]);
      const weeks = [];
      for (let week = start; week <= end; week += 1) {
        weeks.push(week);
      }
      return weeks;
    });
}

function dateForDurhamWeekDay(anchor, week, dayName) {
  const dayOffset = dayOffsets[dayName];
  if (dayOffset === undefined) {
    return null;
  }

  const date = new Date(anchor.monday);
  date.setDate(date.getDate() + ((week - anchor.week) * 7) + (dayOffset - 1));
  return date;
}

function dateForAcademicYearWeekDay(academicYear, week, dayName) {
  const dayOffset = dayOffsets[dayName];
  if (dayOffset === undefined) {
    return null;
  }

  const week0Start = parseIsoDate(academicYear.week0Start);
  const date = new Date(week0Start);
  date.setDate(date.getDate() + (week * 7) + (dayOffset - 1));
  return date;
}

function getTeachingWeekInfo(academicYear, durhamWeek) {
  const range = academicYear.teachingWeekRanges.find((candidate) =>
    durhamWeek >= candidate.startDurhamWeek &&
    durhamWeek <= candidate.endDurhamWeek
  );

  if (!range) {
    return {
      teachingWeek: null,
      term: "",
    };
  }

  return {
    teachingWeek: range.startTeachingWeek + (durhamWeek - range.startDurhamWeek),
    term: range.term,
  };
}

function parseIsoDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseNamedDate(value) {
  const match = String(value).match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) {
    return null;
  }
  const month = monthNames[match[2].toLowerCase()];
  if (month === undefined) {
    return null;
  }
  return new Date(Number(match[3]), month, Number(match[1]));
}

function parseClockTime(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function getDirectTableRows(table) {
  return Array.from(table.querySelectorAll("tr")).filter((row) => {
    const parent = row.parentElement;
    return parent === table || parent?.parentElement === table;
  });
}

function collectCandidateRows(doc, source) {
  const tableRows = Array.from(doc.querySelectorAll("tr"))
    .map((row) => Array.from(row.children).map((cell) => cleanText(cell.textContent)).filter(Boolean))
    .filter((cells) => cells.length >= 2);

  const listRows = Array.from(doc.querySelectorAll("li, article, .event, .lesson, .class, .session"))
    .map((node) => [cleanText(node.textContent)])
    .filter((cells) => cells[0]);

  const rawText = doc.body?.innerText || source;
  const textRows = rawText
    .split(/\n|(?=\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b)|(?=\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/i)
    .map((line) => [cleanText(line)])
    .filter((cells) => cells[0] && /\d{1,2}[:.]\d{2}|\b\d{1,2}\s*(?:am|pm)\b/i.test(cells[0]));

  return [...tableRows, ...listRows, ...textRows];
}

function rowToEvent(cells, defaultDate, defaultDuration) {
  const rowText = cleanText(cells.join(" | "));
  const date = findDate(rowText, defaultDate);
  const timeRange = findTimeRange(rowText, defaultDuration);

  if (!date || !timeRange) {
    return null;
  }

  const title = findTitle(cells, rowText);
  if (!title) {
    return null;
  }

  const location = findLocation(cells, rowText);
  const description = cells.length > 1 ? cells.join("\n") : rowText;
  const start = applyTime(date, timeRange.start);
  const end = applyTime(date, timeRange.end);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return {
    id: createEventId(),
    title,
    location,
    description,
    start,
    end,
  };
}

function createEventId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function findDate(text, fallbackDate) {
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const year = normalizeYear(numeric[3]) || fallbackDate.getFullYear();
    return new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
  }

  const named = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(20\d{2}|\d{2}))?\b/i);
  if (named && monthNames[named[2].toLowerCase()] !== undefined) {
    const year = normalizeYear(named[3]) || fallbackDate.getFullYear();
    return new Date(year, monthNames[named[2].toLowerCase()], Number(named[1]));
  }

  const dayName = text.match(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/i);
  if (dayName) {
    return nextDateForDay(fallbackDate, dayOffsets[dayName[1].toLowerCase()]);
  }

  return new Date(fallbackDate);
}

function findTimeRange(text, defaultDuration) {
  const range = text.match(/\b(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/i);
  if (range) {
    const startPeriod = range[3] || inferStartPeriod(range[1], range[4], range[6]);
    return {
      start: parseTimeParts(range[1], range[2], startPeriod),
      end: parseTimeParts(range[4], range[5], range[6] || startPeriod),
    };
  }

  const simpleRange = text.match(/\b(\d{1,2})\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})\s*(am|pm)\b/i);
  if (simpleRange) {
    const startPeriod = simpleRange[2] || inferStartPeriod(simpleRange[1], simpleRange[3], simpleRange[4]);
    return {
      start: parseTimeParts(simpleRange[1], "00", startPeriod),
      end: parseTimeParts(simpleRange[3], "00", simpleRange[4]),
    };
  }

  const single = text.match(/\b(\d{1,2})(?::|\.)(\d{2})\s*(am|pm)?\b/i) || text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (!single) {
    return null;
  }

  const start = parseTimeParts(single[1], single[2] && /^\d{2}$/.test(single[2]) ? single[2] : "00", single[3] || single[2]);
  const endDate = new Date(2000, 0, 1, start.hour, start.minute + defaultDuration);
  return {
    start,
    end: { hour: endDate.getHours(), minute: endDate.getMinutes() },
  };
}

function findTitle(cells, rowText) {
  const ignored = /^(date|day|time|start|end|room|location|venue|teacher|tutor|instructor)$/i;
  const cleanCells = cells
    .map((cell) => stripKnownBits(cell))
    .map(cleanText)
    .filter((cell) => cell && !ignored.test(cell) && !looksMostlyDateTime(cell));

  const longest = cleanCells.sort((a, b) => b.length - a.length)[0];
  if (longest) {
    return longest.slice(0, 140);
  }

  return stripKnownBits(rowText).slice(0, 140);
}

function findLocation(cells, rowText) {
  const labelled = rowText.match(/\b(?:room|location|venue|place)\s*:?\s*([^|,;]+)/i);
  if (labelled) {
    return cleanText(labelled[1]);
  }

  const locationCell = cells.find((cell) => /\b(room|building|hall|lab|studio|theatre|online|zoom|teams)\b/i.test(cell));
  return locationCell ? stripKnownBits(locationCell).slice(0, 120) : "";
}

function stripKnownBits(text) {
  return cleanText(text)
    .replace(/\b(20\d{2})-\d{1,2}-\d{1,2}\b/g, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, "")
    .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+(?:20\d{2}|\d{2}))?\b/gi, "")
    .replace(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/gi, "")
    .replace(/\b\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)?\b/gi, "")
    .replace(/\b\d{1,2}\s*(?:am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}\s*(?:am|pm)\b/gi, "")
    .replace(/\b\d{1,2}(?::|\.)\d{2}\s*(?:am|pm)?\b/gi, "")
    .replace(/\b(?:room|location|venue|place)\s*:?\s*/gi, "")
    .replace(/[|,;]\s*$/g, "")
    .trim();
}

function looksMostlyDateTime(text) {
  const stripped = stripKnownBits(text);
  return stripped.length < 3;
}

function parseTimeParts(hourValue, minuteValue, period) {
  let hour = Number(hourValue);
  const minute = Number(minuteValue || 0);
  const normalizedPeriod = period ? String(period).toLowerCase() : "";

  if (normalizedPeriod === "pm" && hour < 12) {
    hour += 12;
  }
  if (normalizedPeriod === "am" && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}

function inferStartPeriod(startHour, endHour, endPeriod) {
  if (!endPeriod) {
    return "";
  }
  const start = Number(startHour);
  const end = Number(endHour);
  if (endPeriod.toLowerCase() === "pm" && start > end) {
    return "am";
  }
  return endPeriod;
}

function applyTime(date, time) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hour, time.minute);
}

function nextDateForDay(baseDate, targetDay) {
  const date = new Date(baseDate);
  const diff = (targetDay - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + diff);
  return date;
}

function parseDateInput(value) {
  if (!value) {
    return new Date();
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function normalizeYear(value) {
  if (!value) {
    return null;
  }
  const year = Number(value);
  return year < 100 ? 2000 + year : year;
}

function dedupeEvents(event, index, events) {
  const key = `${event.title}|${event.start.toISOString()}|${event.end.toISOString()}|${event.location}`;
  return events.findIndex((candidate) => `${candidate.title}|${candidate.start.toISOString()}|${candidate.end.toISOString()}|${candidate.location}` === key) === index;
}

function renderEvents() {
  const eventGroups = getPreviewEventGroups(state.events);

  els.eventCount.textContent = String(eventGroups.length);
  els.downloadButton.disabled = state.events.length === 0;

  if (eventGroups.length === 0) {
    els.summaryText.textContent = "No timetable entries have been extracted yet.";
    els.eventsTable.innerHTML = '<tr class="empty-row"><td colspan="5">Paste a timetable and extract entries to begin.</td></tr>';
    return;
  }

  els.summaryText.textContent = `${eventGroups.length} grouped event${eventGroups.length === 1 ? "" : "s"} ready for calendar export.`;
  els.eventsTable.innerHTML = "";

  eventGroups.forEach((group) => {
    const first = group.events[0];
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><strong>${escapeHtml(first.title)}</strong><br><span class="muted">${escapeHtml(buildPreviewGroupDescription(group))}</span></td>
      <td>${escapeHtml(formatPreviewWeeks(group))}</td>
      <td>${formatTime(first.start)} - ${formatTime(first.end)}</td>
      <td>${first.location ? escapeHtml(first.location) : '<span class="muted">No location</span>'}</td>
      <td><button class="remove-button" type="button" aria-label="Remove event group" data-remove-group-id="${escapeHtml(group.id)}">&times;</button></td>
    `;

    els.eventsTable.append(row);
  });

  els.eventsTable.querySelectorAll("[data-remove-group-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const group = eventGroups.find((candidate) => candidate.id === button.dataset.removeGroupId);
      if (!group) {
        return;
      }

      const idsToRemove = new Set(group.events.map((event) => event.id));
      state.events = state.events.filter((event) => !idsToRemove.has(event.id));
      renderEvents();
    });
  });
}
function getPreviewEventGroups(events) {
  return groupEventsForRecurrence(events)
    .flatMap((group) => recurrenceGroupsForEvents(group))
    .map((group) => ({
      ...group,
      id: createIcsGroupId(group),
    }))
    .sort((a, b) => a.events[0].start - b.events[0].start);
}

function buildPreviewGroupDescription(group) {
  return buildIcsGroupDescription(group);
}

function formatPreviewWeeks(group) {
  const weeks = group.events
    .map((event) => event.teachingWeek)
    .filter((week) => week !== null && week !== undefined)
    .sort((a, b) => a - b);

  return weeks.length > 0
    ? `Teaching Weeks ${formatWeekList(weeks)}`
    : "No teaching weeks";
}

function downloadCalendar() {
  if (state.events.length === 0) {
    return;
  }

  const ics = buildIcs(state.events, els.calendarName.value.trim() || "Imported timetable");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(els.calendarName.value || "timetable")}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildIcs(events, calendarName) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Timetable to Calendar//Static Web App//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];

  buildIcsEventComponents(events).forEach((component) => {
    lines.push(...component);
  });

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).map(foldIcsLine).join("\r\n");
}

function buildIcsEventComponents(events) {
  return groupEventsForRecurrence(events)
    .flatMap((group) => recurrenceGroupsForEvents(group))
    .map((group) => buildIcsEventComponent(group));
}

function groupEventsForRecurrence(events) {
  const groups = new Map();

  events.forEach((event) => {
    const key = [
      event.title,
      event.location,
      formatClockTime({
        hour: event.start.getHours(),
        minute: event.start.getMinutes(),
      }),
      event.end.getTime() - event.start.getTime(),
    ].join("|");

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(event);
  });

  return Array.from(groups.values()).map((group) =>
    [...group].sort((a, b) => a.start - b.start),
  );
}

function recurrenceGroupsForEvents(events) {
  const remaining = [...events].sort((a, b) => a.week - b.week || a.start - b.start);
  const groups = [];

  extractRuns(remaining, 1, groups);
  extractRuns(remaining, 2, groups);

  remaining.forEach((event) => {
    groups.push({
      events: [event],
      interval: 0,
    });
  });

  return groups;
}

function extractRuns(events, interval, groups) {
  let index = 0;

  while (index < events.length) {
    const run = [events[index]];
    let nextIndex = index + 1;

    while (
      nextIndex < events.length &&
      events[nextIndex].week - run[run.length - 1].week === interval
    ) {
      run.push(events[nextIndex]);
      nextIndex += 1;
    }

    if (run.length >= 2) {
      groups.push({
        events: run,
        interval,
      });

      run.forEach((event) => {
        const removeIndex = events.indexOf(event);
        if (removeIndex >= 0) {
          events.splice(removeIndex, 1);
        }
      });

      index = 0;
    } else {
      index += 1;
    }
  }
}

function buildIcsEventComponent(group) {
  const first = group.events[0];

  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcs(createIcsGroupId(group))}@timetable-to-calendar`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART;TZID=Europe/London:${formatIcsLocalDateTime(first.start)}`,
    `DTEND;TZID=Europe/London:${formatIcsLocalDateTime(first.end)}`,
    `SUMMARY:${escapeIcs(first.title)}`,
    first.location ? `LOCATION:${escapeIcs(first.location)}` : "",
    `DESCRIPTION:${escapeIcs(buildIcsGroupDescription(group))}`,
  ];

  if (group.interval > 0 && group.events.length > 1) {
    lines.push(
      `RRULE:FREQ=WEEKLY;INTERVAL=${group.interval};COUNT=${group.events.length}`,
    );
  }

  lines.push("END:VEVENT");
  return lines;
}

function createIcsGroupId(group) {
  const weeks = group.events.map((event) => event.week).join(",");
  const first = group.events[0];

  return stableHash([
    first.activityId,
    first.title,
    first.location,
    formatIcsLocalDateTime(first.start),
    weeks,
  ].join("|"));
}

function buildIcsGroupDescription(group) {
  const first = group.events[0];
  const teachingWeeks = group.events
    .map((event) => event.teachingWeek)
    .filter((week) => week !== null && week !== undefined)
    .sort((a, b) => a - b);

  return [
    removeWeekLines(first.description),
    teachingWeeks.length > 0 ? `Teaching Weeks: ${formatWeekList(teachingWeeks)}` : "",
  ].filter(Boolean).join("\n");
}

function removeWeekLines(description) {
  return String(description || "")
    .split("\n")
    .filter((line) => !/^Teaching Week:/i.test(line))
    .filter((line) => !/^Teaching Weeks:/i.test(line))
    .filter((line) => !/^Durham Week:/i.test(line))
    .filter((line) => !/^Durham Weeks:/i.test(line))
    .filter((line) => !/^Week Pattern:/i.test(line))
    .join("\n")
    .trim();
}

function formatWeekList(weeks) {
  const uniqueWeeks = [...new Set(weeks)].sort((a, b) => a - b);
  const ranges = [];

  let start = null;
  let previous = null;

  uniqueWeeks.forEach((week) => {
    if (start === null) {
      start = week;
      previous = week;
      return;
    }

    if (week === previous + 1) {
      previous = week;
      return;
    }

    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
    start = week;
    previous = week;
  });

  if (start !== null) {
    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
  }

  return ranges.join(", ");
}

function formatIcsLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function formatIcsDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function escapeIcs(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line) {
  if (line.length <= 75) {
    return line;
  }
  const chunks = [];
  let remaining = line;
  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = ` ${remaining.slice(75)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

function clearAll() {
  els.htmlInput.value = "";
  els.htmlFileInput.value = "";
  els.urlInput.value = "";
  state.activities = [];
  state.events = [];
  clearMessage();
  renderEvents();
}

function showMessage(text, type = "error") {
  els.message.textContent = text;
  els.message.hidden = false;
  els.message.classList.toggle("is-note", type === "note");
}

function clearMessage() {
  els.message.hidden = true;
  els.message.textContent = "";
  els.message.classList.remove("is-note");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "timetable";
}
