import { formatNumber, t } from "./language.js";

function formatTime(seconds) {
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

export function formatStageTime(stage) {
  if (stage.end !== undefined) return formatTime(stage.start) + "–" + formatTime(stage.end);
  return (stage.kind === "finish" ? "≈" : "") + formatTime(stage.start);
}

export function setupBrewTimer() {
  const byId = (id) => document.getElementById(id);
  const timerToggle = byId("timer-toggle");
  const timerReset = byId("timer-reset");
  let schedule = [];
  let rows = [];
  let timerStartedAt = null;
  let elapsedBeforeRun = 0;
  let timerInterval;
  let activeRow = -1;

  function setText(id, text) {
    const element = byId(id);
    const translated = t(text);
    if (element.textContent !== translated) element.textContent = translated;
  }

  function renderSchedule(stages) {
    schedule = stages;
    activeRow = -1;
    rows = stages.map((stage) => {
      const row = document.createElement("li");
      row.className = stage.kind;
      const time = document.createElement("span");
      time.className = "stage-time";
      time.textContent = formatStageTime(stage);
      const info = document.createElement("div");
      info.className = "stage-info";
      const label = document.createElement("strong");
      label.textContent = t(stage.label, stage.labelValues);
      info.append(label);
      if (stage.note) {
        const note = document.createElement("small");
        note.textContent = t(stage.note, stage.noteValues);
        info.append(note);
      }
      row.append(time, info);
      if (stage.total !== undefined) {
        const weight = document.createElement("span");
        weight.className = "stage-weight";
        weight.textContent = formatNumber(stage.total) + " ";
        const units = document.createElement("small");
        units.textContent = "g";
        weight.append(units);
        row.append(weight);
      }
      return row;
    });
    byId("schedule").replaceChildren(...rows);
    renderTimer();
  }

  function getElapsedMilliseconds() {
    return elapsedBeforeRun + (timerStartedAt === null ? 0 : performance.now() - timerStartedAt);
  }

  function renderTimer() {
    const elapsed = Math.floor(getElapsedMilliseconds() / 1000);
    const hasStarted = elapsedBeforeRun > 0 || timerStartedAt !== null;
    setText("timer-time", formatTime(elapsed));
    setText("timer-toggle", timerStartedAt !== null ? "Pause timer" : hasStarted ? "Resume timer" : "Start timer");
    timerReset.disabled = !hasStarted;

    const nextRow = hasStarted ? schedule.findLastIndex((stage) => stage.start <= elapsed) : -1;
    if (nextRow === activeRow) return;
    if (activeRow >= 0) {
      rows[activeRow].classList.remove("active");
      rows[activeRow].removeAttribute("aria-current");
    }
    activeRow = nextRow;
    if (activeRow >= 0) {
      rows[activeRow].classList.add("active");
      rows[activeRow].setAttribute("aria-current", "step");
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timerStartedAt = null;
    elapsedBeforeRun = 0;
    renderTimer();
  }

  timerToggle.addEventListener("click", () => {
    if (timerStartedAt === null) {
      timerStartedAt = performance.now();
      timerInterval = setInterval(renderTimer, 200);
    } else {
      elapsedBeforeRun = getElapsedMilliseconds();
      timerStartedAt = null;
      clearInterval(timerInterval);
    }
    renderTimer();
  });

  timerReset.addEventListener("click", resetTimer);

  return { renderSchedule, resetTimer };
}
