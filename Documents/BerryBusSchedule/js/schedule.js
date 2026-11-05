/* =========================================================
   schedule.js — the weekly bus calendar (home page)

   The big idea:
   • The calendar is a grid: 7 day columns × one row per half hour.
   • Each blue half hour is saved as a short text key, "day-minute":
       "0-450" = Monday (day 0), 450 minutes after midnight = 7:30 AM
   • Every week is saved separately, under the date of its Monday:
       { "2026-11-02": ["0-450", "0-480", ...], "2026-11-09": [...] }
   • It all lives in localStorage, so the public view shows exactly
     what the admin painted.
   ========================================================= */


/* ---------- Settings you can change ---------- */
const FIRST_HOUR = 7;     // calendar starts at 7:00 AM
const LAST_HOUR = 23;     // calendar ends at 11:00 PM (24 = midnight)
const SLOT_MINUTES = 30;  // length of one row: 15, 30 or 60
const SCHEDULE_KEY = "berryBus.schedule"; // where the blue blocks are saved

/* ---------- Worked out from the settings ---------- */
const DAY_START = FIRST_HOUR * 60;  // in minutes after midnight
const DAY_END = LAST_HOUR * 60;
const ROWS = (DAY_END - DAY_START) / SLOT_MINUTES;

/* ---------- Elements on the page ---------- */
const calendar = document.getElementById("calendar");
const calendarEmpty = document.getElementById("calendarEmpty");
const weekTitle = document.getElementById("weekTitle");
const weekTag = document.getElementById("weekTag");
const weekSummary = document.getElementById("weekSummary");
const adminToolbar = document.getElementById("adminToolbar");
const saveNote = document.getElementById("saveNote");
const prevWeekButton = document.getElementById("prevWeek");
const nextWeekButton = document.getElementById("nextWeek");
const thisWeekButton = document.getElementById("thisWeek");
const copyWeekButton = document.getElementById("copyWeek");
const clearWeekButton = document.getElementById("clearWeek");
const busSign = document.getElementById("busSign");
const busSignTitle = document.getElementById("busSignTitle");
const busSignDetail = document.getElementById("busSignDetail");

/* ---------- What the page knows right now ---------- */
let schedule = loadSchedule();          // every saved week
let shownMonday = mondayOf(new Date()); // the week on screen
let weekSlots = new Set();              // the blue half hours of the week on screen
let editing = false;                    // true while the admin is logged in
let drag = null;                        // details of a drag in progress


/* =========================================================
   1. Dates and times
   ========================================================= */

// Midnight on the Monday of the week that contains `date`.
function mondayOf(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % 7; // getDay() counts Sunday as 0
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Monday = 0 … Sunday = 6
function dayIndexOf(date) {
  return (date.getDay() + 6) % 7;
}

// "2026-11-02". Built by hand on purpose: toISOString() switches to UTC time,
// which on a US evening is already tomorrow, so you could land in the wrong week.
function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// 0 = this week, 1 = next week, -1 = last week …
function weeksFromNow(monday) {
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // in milliseconds
  return Math.round((monday - mondayOf(new Date())) / oneWeek);
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isPM(minutes) {
  return minutes % 1440 >= 720;
}

// 450 → "7:30 AM"    (withAmPm = false → "7:30")
function formatTime(minutes, withAmPm = true) {
  const hours24 = Math.floor(minutes / 60) % 24;
  const hours12 = hours24 % 12 || 12;
  const mins = String(minutes % 60).padStart(2, "0");
  const clock = `${hours12}:${mins}`;
  return withAmPm ? `${clock} ${isPM(minutes) ? "PM" : "AM"}` : clock;
}

// 420 → "7 AM" (the labels down the left side)
function formatHour(minutes) {
  const hours24 = Math.floor(minutes / 60) % 24;
  return `${hours24 % 12 || 12} ${isPM(minutes) ? "PM" : "AM"}`;
}

// "7:30 – 9:30 AM", or "11:30 AM – 1:00 PM" when it crosses noon
function formatRange(start, end) {
  const sameHalfOfDay = isPM(start) === isPM(end) && end - start < 720;
  return `${formatTime(start, !sameHalfOfDay)} – ${formatTime(end)}`;
}

// "November 2 – 8, 2026" or "October 26 – November 1, 2026"
function formatWeekRange(monday) {
  const sunday = addDays(monday, 6);
  const month = (date) => date.toLocaleDateString("en-US", { month: "long" });

  if (monday.getFullYear() !== sunday.getFullYear()) {
    return `${month(monday)} ${monday.getDate()}, ${monday.getFullYear()} – ${month(sunday)} ${sunday.getDate()}, ${sunday.getFullYear()}`;
  }
  if (monday.getMonth() !== sunday.getMonth()) {
    return `${month(monday)} ${monday.getDate()} – ${month(sunday)} ${sunday.getDate()}, ${sunday.getFullYear()}`;
  }
  return `${month(monday)} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

function weekLabel(offset) {
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  if (offset === -1) return "Last week";
  return "";
}


/* =========================================================
   2. Saving and loading
   ========================================================= */

function slotKey(day, minute) {
  return `${day}-${minute}`;
}

function loadSchedule() {
  try {
    const saved = JSON.parse(readStorage(SCHEDULE_KEY)); // text → object
    return saved && typeof saved === "object" ? saved : {};
  } catch (error) {
    return {}; // the saved text was damaged, so start fresh
  }
}

function slotsForWeek(monday) {
  return new Set(schedule[dateKey(monday)] || []);
}

// Saves the week on screen. Returns true if the browser stored it.
function saveShownWeek() {
  const key = dateKey(shownMonday);
  if (weekSlots.size > 0) {
    schedule[key] = [...weekSlots].sort(compareSlotKeys);
  } else {
    delete schedule[key]; // don't keep empty weeks around
  }
  return writeStorage(SCHEDULE_KEY, JSON.stringify(schedule)); // object → text
}

// Sorts "day-minute" keys by day, then by time (just keeps storage tidy).
function compareSlotKeys(a, b) {
  const [dayA, minuteA] = a.split("-").map(Number);
  const [dayB, minuteB] = b.split("-").map(Number);
  return dayA - dayB || minuteA - minuteB;
}

// Where a blue block that starts at `start` ends (in minutes).
function blockEnd(slots, day, start) {
  let end = start;
  while (end < DAY_END && slots.has(slotKey(day, end))) {
    end += SLOT_MINUTES;
  }
  return end;
}

// A day's blue blocks as [start, end] pairs, e.g. [[450, 570], [690, 810]]
function blocksForDay(slots, day) {
  const blocks = [];
  for (let minute = DAY_START; minute < DAY_END; minute += SLOT_MINUTES) {
    const isOn = slots.has(slotKey(day, minute));
    const isFirst = minute === DAY_START || !slots.has(slotKey(day, minute - SLOT_MINUTES));
    if (isOn && isFirst) {
      blocks.push([minute, blockEnd(slots, day, minute)]);
    }
  }
  return blocks;
}


/* =========================================================
   3. Building the calendar grid (runs once)
   ========================================================= */

function buildCalendar() {
  const cells = document.createDocumentFragment();

  // Top row: an empty corner, then one heading per day.
  const corner = document.createElement("div");
  corner.className = "cal-corner";
  cells.append(corner);

  for (let day = 0; day < 7; day++) {
    const heading = document.createElement("div");
    heading.className = "cal-day";
    heading.dataset.day = day;
    heading.innerHTML = '<span class="cal-day-name"></span><span class="cal-day-date"></span>';
    cells.append(heading);
  }

  // Then one row per half hour: a time label, then 7 slots.
  for (let row = 0; row < ROWS; row++) {
    const minute = DAY_START + row * SLOT_MINUTES;
    const onTheHour = minute % 60 === 0;

    const label = document.createElement("div");
    label.className = onTheHour ? "cal-time on-hour" : "cal-time";
    label.textContent = onTheHour ? formatHour(minute) : "";
    cells.append(label);

    for (let day = 0; day < 7; day++) {
      const slot = document.createElement("div");
      slot.className = onTheHour ? "slot on-hour" : "slot";
      slot.dataset.day = day;
      slot.dataset.minute = minute;
      cells.append(slot);
    }
  }

  calendar.append(cells);
}


/* =========================================================
   4. Drawing the week on screen
   ========================================================= */

// Everything about the week: title, day headings, blue blocks, text list.
function renderWeek() {
  const today = new Date();
  const offset = weeksFromNow(shownMonday);

  weekTitle.textContent = formatWeekRange(shownMonday);
  weekTag.textContent = weekLabel(offset);
  thisWeekButton.hidden = offset === 0;

  calendar.querySelectorAll(".cal-day").forEach((heading) => {
    const date = addDays(shownMonday, Number(heading.dataset.day));
    heading.querySelector(".cal-day-name").textContent = date.toLocaleDateString("en-US", { weekday: "short" });
    heading.querySelector(".cal-day-date").textContent = date.getDate();
    heading.classList.toggle("is-today", dateKey(date) === dateKey(today));
  });

  const todayColumn = offset === 0 ? dayIndexOf(today) : -1;
  calendar.querySelectorAll(".slot").forEach((slot) => {
    slot.classList.toggle("is-today", Number(slot.dataset.day) === todayColumn);
  });

  renderBlocks();
  renderNowLine(today, offset === 0);
  renderSummary();

  const previousWeek = schedule[dateKey(addDays(shownMonday, -7))] || [];
  copyWeekButton.disabled = previousWeek.length === 0;
}

// Just the blue blocks. This runs on every drag movement, so it stays small.
function renderBlocks() {
  calendar.querySelectorAll(".slot").forEach((slot) => {
    const day = Number(slot.dataset.day);
    const minute = Number(slot.dataset.minute);
    const isOn = weekSlots.has(slotKey(day, minute));
    const isFirst = isOn && !weekSlots.has(slotKey(day, minute - SLOT_MINUTES));
    const isLast = isOn && !weekSlots.has(slotKey(day, minute + SLOT_MINUTES));

    slot.classList.toggle("on", isOn);
    slot.classList.toggle("block-start", isFirst);
    slot.classList.toggle("block-end", isLast);

    // The first half hour of every block shows the block's times.
    let label = slot.querySelector(".block-label");
    if (isFirst) {
      if (!label) {
        label = document.createElement("span");
        label.className = "block-label";
        slot.append(label);
      }
      label.textContent = formatRange(minute, blockEnd(weekSlots, day, minute));
    } else if (label) {
      label.remove();
    }
  });

  const isEmpty = weekSlots.size === 0;
  calendarEmpty.hidden = !isEmpty;
  calendarEmpty.textContent = editing
    ? "Drag down a day to add the first bus times for this week."
    : "No bus times have been posted for this week yet.";
  clearWeekButton.disabled = isEmpty;
}

// A gold line across today's column at the current time.
function renderNowLine(now, showingThisWeek) {
  calendar.querySelector(".now-line")?.remove();

  const minute = minutesSinceMidnight(now);
  if (!showingThisWeek || minute < DAY_START || minute >= DAY_END) return;

  const slotMinute = minute - ((minute - DAY_START) % SLOT_MINUTES);
  const slot = calendar.querySelector(`.slot[data-day="${dayIndexOf(now)}"][data-minute="${slotMinute}"]`);
  const line = document.createElement("span");
  line.className = "now-line";
  line.style.top = `${((minute - slotMinute) / SLOT_MINUTES) * 100}%`;
  slot.append(line);
}

// The same times as plain text, one line per day.
function renderSummary() {
  const heading = document.createElement("h3");
  heading.textContent = "Bus times by day";

  const list = document.createElement("dl");
  for (let day = 0; day < 7; day++) {
    const date = addDays(shownMonday, day);
    const blocks = blocksForDay(weekSlots, day);

    const dayName = document.createElement("dt");
    dayName.textContent = date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

    const times = document.createElement("dd");
    if (blocks.length === 0) {
      times.textContent = "No buses";
    }
    blocks.forEach(([start, end], index) => {
      if (index > 0) times.append(", ");
      const range = document.createElement("span");
      range.className = "time-range"; // CSS keeps each range on one line
      range.textContent = formatRange(start, end);
      times.append(range);
    });

    list.append(dayName, times);
  }

  weekSummary.replaceChildren(heading, list);
}


/* =========================================================
   5. The "next bus" sign at the top of the page
   ========================================================= */

function renderSign() {
  const now = new Date();
  const nowMinute = minutesSinceMidnight(now);

  // Look at today, then each of the next 7 days, for the first bus that isn't over.
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const date = addDays(now, daysAhead);
    const blocks = blocksForDay(slotsForWeek(mondayOf(date)), dayIndexOf(date));

    for (const [start, end] of blocks) {
      if (daysAhead === 0 && end <= nowMinute) continue; // already finished today

      if (daysAhead === 0 && start <= nowMinute) {
        setSign("running", "Running now", `until ${formatTime(end)}`);
      } else {
        setSign("next", "Next bus", `${dayWords(daysAhead, date)} at ${formatTime(start)}`);
      }
      return;
    }
  }

  setSign("none", "No buses scheduled", "in the next 7 days");
}

function dayWords(daysAhead, date) {
  if (daysAhead === 0) return "today";
  if (daysAhead === 1) return "tomorrow";
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return daysAhead === 7 ? `next ${weekday}` : weekday;
}

function setSign(state, title, detail) {
  busSign.dataset.state = state; // CSS colors the sign by state
  busSignTitle.textContent = title;
  busSignDetail.textContent = detail;
}


/* =========================================================
   6. Touch-and-drag painting (admin only)
      Works the same with a mouse, a finger or a pen,
      because Pointer Events treat them all alike.
   ========================================================= */

// Which slot is under this point on the screen?
// We ask the page directly because during a touch drag the browser keeps
// reporting the slot where the finger *started*, not the one it's over now.
function slotAt(x, y) {
  const element = document.elementFromPoint(x, y);
  return element ? element.closest(".slot") : null;
}

function gridPosition(slot) {
  return {
    day: Number(slot.dataset.day),
    row: (Number(slot.dataset.minute) - DAY_START) / SLOT_MINUTES,
  };
}

function paint(day, row) {
  const key = slotKey(day, DAY_START + row * SLOT_MINUTES);
  if (drag.mode === "add") {
    weekSlots.add(key);
  } else {
    weekSlots.delete(key);
  }
}

calendar.addEventListener("pointerdown", (event) => {
  if (!editing || drag) return;                                    // admin only, one finger at a time
  if (event.pointerType === "mouse" && event.button !== 0) return; // left mouse button only

  const slot = event.target.closest(".slot");
  if (!slot) return;

  event.preventDefault();                      // no text selection while dragging
  calendar.setPointerCapture(event.pointerId); // keep receiving moves, even outside the calendar

  // Start on an empty slot → this drag adds blue. Start on blue → this drag erases.
  const start = gridPosition(slot);
  drag = {
    pointerId: event.pointerId,
    mode: slot.classList.contains("on") ? "erase" : "add",
    last: start,
  };

  paint(start.day, start.row);
  renderBlocks();
});

calendar.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;

  const slot = slotAt(event.clientX, event.clientY);
  if (!slot) return;

  // A fast swipe can skip several slots between two move events,
  // so paint every slot on the straight line from the last one.
  const next = gridPosition(slot);
  const steps = Math.max(Math.abs(next.day - drag.last.day), Math.abs(next.row - drag.last.row));
  for (let step = 1; step <= steps; step++) {
    paint(
      Math.round(drag.last.day + ((next.day - drag.last.day) * step) / steps),
      Math.round(drag.last.row + ((next.row - drag.last.row) * step) / steps)
    );
  }

  drag.last = next;
  if (steps > 0) renderBlocks();
});

// Lifting the finger (or mouse button) saves the week.
function finishDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag = null;
  showSaveResult(saveShownWeek());
  renderWeek();
  renderSign();
}

calendar.addEventListener("pointerup", finishDrag);
calendar.addEventListener("pointercancel", finishDrag);
calendar.addEventListener("lostpointercapture", finishDrag);

function showSaveResult(saved) {
  saveNote.classList.toggle("is-error", !saved);
  saveNote.textContent = saved
    ? `Saved at ${formatTime(minutesSinceMidnight(new Date()))}.`
    : "Not saved: this browser is blocking storage. Open the site with Live Server (see README.md).";
}


/* =========================================================
   7. Buttons
   ========================================================= */

function showWeek(monday) {
  shownMonday = monday;
  weekSlots = slotsForWeek(shownMonday);
  renderWeek();
}

prevWeekButton.addEventListener("click", () => showWeek(addDays(shownMonday, -7)));
nextWeekButton.addEventListener("click", () => showWeek(addDays(shownMonday, 7)));
thisWeekButton.addEventListener("click", () => showWeek(mondayOf(new Date())));

copyWeekButton.addEventListener("click", () => {
  if (weekSlots.size > 0 && !confirm("Replace this week's bus times with the previous week's?")) return;
  weekSlots = slotsForWeek(addDays(shownMonday, -7));
  showSaveResult(saveShownWeek());
  renderWeek();
  renderSign();
});

clearWeekButton.addEventListener("click", () => {
  if (!confirm(`Remove all bus times for ${formatWeekRange(shownMonday)}?`)) return;
  weekSlots.clear();
  showSaveResult(saveShownWeek());
  renderWeek();
  renderSign();
});


/* =========================================================
   8. Editing mode, staying in sync, starting up
   ========================================================= */

function applyLoginState() {
  editing = isAdminLoggedIn();
  document.body.classList.toggle("is-editing", editing); // CSS turns on the editing look
  adminToolbar.hidden = !editing;
  renderWeek();
}

document.addEventListener("loginchange", applyLoginState); // sent by site.js

// Another tab saved new times? Show them here too.
window.addEventListener("storage", (event) => {
  if (event.key !== SCHEDULE_KEY && event.key !== null) return;
  schedule = loadSchedule();
  if (!drag) {
    weekSlots = slotsForWeek(shownMonday);
    renderWeek();
  }
  renderSign();
});

// Keep the sign and the "now" line current while the page stays open.
setInterval(() => {
  if (drag) return;
  renderWeek();
  renderSign();
}, 60 * 1000);

buildCalendar();
weekSlots = slotsForWeek(shownMonday);
applyLoginState();
renderSign();
