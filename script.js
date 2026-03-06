const STORAGE_KEY = "cableCutHelperMobileWizard";

const state = {
  currentPage: 1,
  job: {
    soNumber: "",
    operatorName: "",
    partNumber: "",
    trackingNumber: "",
    totalLength: "",
    numberOfCuts: "",
    endMeterValue: "",
    offsetValue: "",
    direction: "ascending",
    cutLength: "",
    startReading: "",
    cuts: []
  }
};

let html5QrCode = null;
let scannerRunning = false;

const els = {
  soNumber: document.getElementById("soNumber"),
  operatorName: document.getElementById("operatorName"),
  partNumber: document.getElementById("partNumber"),
  trackingNumber: document.getElementById("trackingNumber"),
  totalLength: document.getElementById("totalLength"),
  numberOfCuts: document.getElementById("numberOfCuts"),
  endMeterValue: document.getElementById("endMeterValue"),
  offsetValue: document.getElementById("offsetValue"),

  scanSoBtn: document.getElementById("scanSoBtn"),
  stopScanBtn: document.getElementById("stopScanBtn"),
  scannerWrap: document.getElementById("scannerWrap"),

  sumSo: document.getElementById("sumSo"),
  sumDoneHeader: document.getElementById("sumDoneHeader"),
  sumRemainingHeader: document.getElementById("sumRemainingHeader"),

  cutLengthPreview: document.getElementById("cutLengthPreview"),
  startReadingPreview: document.getElementById("startReadingPreview"),

  resCutLength: document.getElementById("resCutLength"),
  resDone: document.getElementById("resDone"),
  resRemaining: document.getElementById("resRemaining"),
  cutsList: document.getElementById("cutsList"),
  resultsSummaryText: document.getElementById("resultsSummaryText"),

  nextPendingBtn: document.getElementById("nextPendingBtn"),

  finalSo: document.getElementById("finalSo"),
  finalOperator: document.getElementById("finalOperator"),
  finalPart: document.getElementById("finalPart"),
  finalTracking: document.getElementById("finalTracking"),
  finalTotalLength: document.getElementById("finalTotalLength"),
  finalCutCount: document.getElementById("finalCutCount"),
  finalCutLength: document.getElementById("finalCutLength"),
  finalDirection: document.getElementById("finalDirection"),
  finalCutsCompactList: document.getElementById("finalCutsCompactList"),

  page1: document.getElementById("page1"),
  page2: document.getElementById("page2"),
  page3: document.getElementById("page3"),
  page4: document.getElementById("page4"),
  page5: document.getElementById("page5"),

  stepDot1: document.getElementById("stepDot1"),
  stepDot2: document.getElementById("stepDot2"),
  stepDot3: document.getElementById("stepDot3"),
  stepDot4: document.getElementById("stepDot4"),
  stepDot5: document.getElementById("stepDot5"),

  p1NextBtn: document.getElementById("p1NextBtn"),
  p2BackBtn: document.getElementById("p2BackBtn"),
  p2NextBtn: document.getElementById("p2NextBtn"),
  p3BackBtn: document.getElementById("p3BackBtn"),
  generateBtn: document.getElementById("generateBtn"),
  p4BackBtn: document.getElementById("p4BackBtn"),
  regenerateBtn: document.getElementById("regenerateBtn"),
  markAllDoneBtn: document.getElementById("markAllDoneBtn"),
  p5BackBtn: document.getElementById("p5BackBtn"),
  startNewJobBtn: document.getElementById("startNewJobBtn"),
  clearAllBtn: document.getElementById("clearAllBtn")
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if (parsed && parsed.job) {
      state.currentPage = parsed.currentPage || 1;
      state.job = {
        ...state.job,
        ...parsed.job,
        cuts: Array.isArray(parsed.job.cuts) ? parsed.job.cuts : []
      };
    }
  } catch (error) {
    console.error("Failed to load state:", error);
  }
}

function syncInputsFromState() {
  if (els.soNumber) els.soNumber.value = state.job.soNumber || "";
  if (els.operatorName) els.operatorName.value = state.job.operatorName || "";
  if (els.partNumber) els.partNumber.value = state.job.partNumber || "";
  if (els.trackingNumber) els.trackingNumber.value = state.job.trackingNumber || "";
  if (els.totalLength) els.totalLength.value = state.job.totalLength || "";
  if (els.numberOfCuts) els.numberOfCuts.value = state.job.numberOfCuts || "";
  if (els.endMeterValue) els.endMeterValue.value = state.job.endMeterValue || "";
  if (els.offsetValue) els.offsetValue.value = state.job.offsetValue || "";

  const radios = document.querySelectorAll('input[name="direction"]');
  radios.forEach(radio => {
    radio.checked = radio.value === state.job.direction;
  });
}

function syncStateFromInputs() {
  state.job.soNumber = els.soNumber ? els.soNumber.value.trim() : "";
  state.job.operatorName = els.operatorName ? els.operatorName.value.trim() : "";
  state.job.partNumber = els.partNumber ? els.partNumber.value.trim() : "";
  state.job.trackingNumber = els.trackingNumber ? els.trackingNumber.value.trim() : "";
  state.job.totalLength = els.totalLength ? els.totalLength.value.trim() : "";
  state.job.numberOfCuts = els.numberOfCuts ? els.numberOfCuts.value.trim() : "";
  state.job.endMeterValue = els.endMeterValue ? els.endMeterValue.value.trim() : "";
  state.job.offsetValue = els.offsetValue ? els.offsetValue.value.trim() : "";

  const selectedDirection = document.querySelector('input[name="direction"]:checked');
  state.job.direction = selectedDirection ? selectedDirection.value : "ascending";
}

function updateSummaryHeader() {
  if (els.sumSo) els.sumSo.textContent = state.job.soNumber || "-";

  const cuts = state.job.cuts || [];
  const doneCount = cuts.filter(cut => cut.done).length;
  const remainingCount = cuts.length - doneCount;

  if (els.sumDoneHeader) els.sumDoneHeader.textContent = doneCount;
  if (els.sumRemainingHeader) els.sumRemainingHeader.textContent = remainingCount;
}

function formatOneDecimal(num) {
  return Number(num).toFixed(1);
}

function getCutLengthNumber() {
  const totalLength = Number(state.job.totalLength);
  const numberOfCuts = Number(state.job.numberOfCuts);

  if (!Number.isFinite(totalLength) || !Number.isFinite(numberOfCuts) || numberOfCuts <= 0) {
    return null;
  }

  return Number((totalLength / numberOfCuts).toFixed(1));
}

function getStartReadingNumber() {
  const E = Number(state.job.endMeterValue);
  const e = Number(state.job.offsetValue);
  const direction = state.job.direction;

  if (!Number.isFinite(E) || !Number.isFinite(e)) {
    return null;
  }

  if (direction === "ascending") {
    return Number((E - e).toFixed(1));
  }

  return Number((E + e).toFixed(1));
}

function updateLivePreviews() {
  syncStateFromInputs();

  const cutLength = getCutLengthNumber();
  state.job.cutLength = cutLength === null ? "" : formatOneDecimal(cutLength);
  if (els.cutLengthPreview) {
    els.cutLengthPreview.textContent = cutLength === null ? "-" : `${formatOneDecimal(cutLength)} m`;
  }

  const startReading = getStartReadingNumber();
  state.job.startReading = startReading === null ? "" : formatOneDecimal(startReading);
  if (els.startReadingPreview) {
    els.startReadingPreview.textContent = startReading === null ? "-" : `${formatOneDecimal(startReading)} m`;
  }

  updateSummaryHeader();
  saveState();
}

function showPage(pageNumber) {
  state.currentPage = pageNumber;

  [1, 2, 3, 4, 5].forEach(n => {
    if (els[`page${n}`]) {
      els[`page${n}`].classList.toggle("active", n === pageNumber);
    }
    if (els[`stepDot${n}`]) {
      els[`stepDot${n}`].classList.toggle("active", n === pageNumber);
    }
  });

  saveState();
}

function validatePage1() {
  syncStateFromInputs();

  if (!state.job.soNumber) {
    alert("Please enter or scan SO number.");
    return false;
  }

  if (!state.job.operatorName) {
    alert("Please enter operator name.");
    return false;
  }

  saveState();
  updateSummaryHeader();
  return true;
}

function validatePage2() {
  syncStateFromInputs();

  if (!state.job.partNumber) {
    alert("Please enter cable part number.");
    return false;
  }

  if (!state.job.trackingNumber) {
    alert("Please enter tracking number.");
    return false;
  }

  const totalLength = Number(state.job.totalLength);
  const numberOfCuts = Number(state.job.numberOfCuts);

  if (!Number.isFinite(totalLength) || totalLength <= 0) {
    alert("Please enter a valid total length.");
    return false;
  }

  if (!Number.isInteger(numberOfCuts) || numberOfCuts <= 0) {
    alert("Please enter a valid number of cuts.");
    return false;
  }

  const cutLength = getCutLengthNumber();
  state.job.cutLength = formatOneDecimal(cutLength);

  saveState();
  updateSummaryHeader();
  return true;
}

function validatePage3() {
  syncStateFromInputs();

  const E = Number(state.job.endMeterValue);
  const e = Number(state.job.offsetValue);

  if (!Number.isFinite(E)) {
    alert("Please enter a valid end full meter value.");
    return false;
  }

  if (!Number.isFinite(e) || e < 0 || e > 0.9) {
    alert("Please select a valid offset value.");
    return false;
  }

  const startReading = getStartReadingNumber();
  state.job.startReading = formatOneDecimal(startReading);

  saveState();
  updateSummaryHeader();
  return true;
}

function buildCuts() {
  const n = Number(state.job.numberOfCuts);
  const x = Number(getCutLengthNumber());
  const S = Number(getStartReadingNumber());
  const direction = state.job.direction;
  const dir = direction === "ascending" ? 1 : -1;

  const existingDoneMap = new Map(
    (state.job.cuts || []).map(cut => [cut.cutNo, !!cut.done])
  );

  const cuts = [];

  for (let i = 1; i <= n; i += 1) {
    const reading = Number((S + dir * x * i).toFixed(1));
    const lowerMark = Math.floor(reading);
    const upperMark = lowerMark + 1;
    const fromLower = Number((reading - lowerMark).toFixed(1));
    const fromUpper = Number((upperMark - reading).toFixed(1));

    cuts.push({
      cutNo: i,
      reading: formatOneDecimal(reading),
      lowerMark,
      upperMark,
      fromLower: formatOneDecimal(fromLower),
      fromUpper: formatOneDecimal(fromUpper),
      done: existingDoneMap.get(i) || false
    });
  }

  state.job.cutLength = formatOneDecimal(x);
  state.job.startReading = formatOneDecimal(S);
  state.job.cuts = cuts;

  saveState();
  updateSummaryHeader();
}

function getNextPendingCutNo() {
  const nextPending = (state.job.cuts || []).find(cut => !cut.done);
  return nextPending ? nextPending.cutNo : null;
}

function scrollToCut(cutNo) {
  if (!cutNo) return;

  const target = document.getElementById(`cut-card-${cutNo}`);
  if (!target) return;

  setTimeout(() => {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }, 120);
}

function jumpToNextPending() {
  const nextPendingCutNo = getNextPendingCutNo();

  if (!nextPendingCutNo) {
    alert("All cuts are already done.");
    return;
  }

  scrollToCut(nextPendingCutNo);
}

function renderResults() {
  if (!els.cutsList || !els.resultsSummaryText) return;

  const cuts = state.job.cuts || [];
  const nextPendingCutNo = getNextPendingCutNo();

  if (els.resCutLength) {
    els.resCutLength.textContent = state.job.cutLength ? `${state.job.cutLength} m` : "-";
  }

  const doneCount = cuts.filter(cut => cut.done).length;
  if (els.resDone) els.resDone.textContent = doneCount;
  if (els.resRemaining) els.resRemaining.textContent = cuts.length - doneCount;

  if (!cuts.length) {
    els.resultsSummaryText.textContent = "No cuts generated yet.";
    els.cutsList.innerHTML = `<p class="empty-text">No cuts generated yet.</p>`;
    updateSummaryHeader();
    return;
  }

  els.resultsSummaryText.textContent =
    `${cuts.length} cuts generated • Start reading S = ${state.job.startReading} m • Direction = ${capitalize(state.job.direction)}`;

  els.cutsList.innerHTML = cuts
    .map(cut => {
      const statusClass = cut.done ? "done" : "pending";
      const statusText = cut.done ? "DONE" : "PENDING";
      const isNextPending = cut.cutNo === nextPendingCutNo && !cut.done;

      return `
        <div class="compact-cut-card ${cut.done ? "done" : ""} ${isNextPending ? "next-pending" : ""}" id="cut-card-${cut.cutNo}">
          <div class="compact-cut-line1">
            <div class="compact-cut-left">
              <span class="compact-cut-no">Cut ${cut.cutNo}${isNextPending ? " • NEXT" : ""}</span>
              <span class="compact-cut-reading">${escapeHtml(cut.reading)} m</span>
            </div>
            <span class="badge ${statusClass}">${statusText}</span>
          </div>

          <div class="compact-cut-line2">
            <span>${cut.lowerMark}-${cut.upperMark} m</span>
            <span>L:${escapeHtml(cut.fromLower)}</span>
            <span>U:${escapeHtml(cut.fromUpper)}</span>
            <span>X:${escapeHtml(state.job.cutLength)}</span>
          </div>

          <div class="compact-cut-actions">
            <button class="btn primary small" onclick="toggleDone(${cut.cutNo})">
              ${cut.done ? "Undo" : "Done"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  updateSummaryHeader();
}

function renderFinalSummary() {
  if (!els.finalCutsCompactList) return;

  if (els.finalSo) els.finalSo.textContent = state.job.soNumber || "-";
  if (els.finalOperator) els.finalOperator.textContent = state.job.operatorName || "-";
  if (els.finalPart) els.finalPart.textContent = state.job.partNumber || "-";
  if (els.finalTracking) els.finalTracking.textContent = state.job.trackingNumber || "-";
  if (els.finalTotalLength) els.finalTotalLength.textContent = state.job.totalLength ? `${state.job.totalLength} m` : "-";
  if (els.finalCutCount) els.finalCutCount.textContent = state.job.numberOfCuts || "-";
  if (els.finalCutLength) els.finalCutLength.textContent = state.job.cutLength ? `${state.job.cutLength} m` : "-";
  if (els.finalDirection) els.finalDirection.textContent = capitalize(state.job.direction || "-");

  const cuts = state.job.cuts || [];

  if (!cuts.length) {
    els.finalCutsCompactList.innerHTML = `<p class="empty-text">No completed cuts yet.</p>`;
    return;
  }

  els.finalCutsCompactList.innerHTML = cuts
    .map(cut => `
      <div class="compact-cut-row">
        <div class="compact-cut-main">
          <strong>Cut ${cut.cutNo}</strong>
          <span>${escapeHtml(cut.reading)} m</span>
        </div>
        <div class="compact-cut-meta">
          ${cut.lowerMark}-${cut.upperMark} m | L:${escapeHtml(cut.fromLower)} | U:${escapeHtml(cut.fromUpper)}
        </div>
      </div>
    `)
    .join("");
}

function allCutsDone() {
  const cuts = state.job.cuts || [];
  return cuts.length > 0 && cuts.every(cut => cut.done);
}

function goToFinalSummaryIfComplete() {
  if (allCutsDone() && els.page5) {
    renderFinalSummary();
    showPage(5);
  }
}

function toggleDone(cutNo) {
  const cut = state.job.cuts.find(item => item.cutNo === cutNo);
  if (!cut) return;

  cut.done = !cut.done;
  saveState();
  renderResults();

  if (allCutsDone()) {
    goToFinalSummaryIfComplete();
    return;
  }

  const nextPendingCutNo = getNextPendingCutNo();
  scrollToCut(nextPendingCutNo);
}

window.toggleDone = toggleDone;

function markAllDone() {
  if (!state.job.cuts.length) {
    alert("No cuts generated yet.");
    return;
  }

  state.job.cuts = state.job.cuts.map(cut => ({
    ...cut,
    done: true
  }));

  saveState();
  renderResults();
  goToFinalSummaryIfComplete();
}

function resetWholeJob() {
  state.currentPage = 1;
  state.job = {
    soNumber: "",
    operatorName: "",
    partNumber: "",
    trackingNumber: "",
    totalLength: "",
    numberOfCuts: "",
    endMeterValue: "",
    offsetValue: "",
    direction: "ascending",
    cutLength: "",
    startReading: "",
    cuts: []
  };

  stopScanner();
  localStorage.removeItem(STORAGE_KEY);
  syncInputsFromState();
  updateSummaryHeader();
  updateLivePreviews();
  renderResults();
  showPage(1);
}

function clearAll() {
  const ok = confirm("Clear the whole job and all generated cuts?");
  if (!ok) return;
  resetWholeJob();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function startScanner() {
  if (!els.scannerWrap || !els.scanSoBtn || !els.stopScanBtn) return;
  if (scannerRunning) return;

  if (typeof Html5Qrcode === "undefined") {
    alert("Scanner library failed to load. Check internet connection and refresh.");
    return;
  }

  els.scannerWrap.classList.remove("hidden");
  els.scanSoBtn.style.display = "none";
  els.stopScanBtn.style.display = "inline-block";

  try {
    html5QrCode = new Html5Qrcode("reader");
    scannerRunning = true;

    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 120 }
      },
      (decodedText) => {
        if (els.soNumber) els.soNumber.value = decodedText.trim();
        syncStateFromInputs();
        updateSummaryHeader();
        saveState();
        stopScanner();
      },
      () => {}
    );
  } catch (error) {
    console.error("Scanner start failed:", error);
    scannerRunning = false;
    alert("Could not start camera scanner. Please allow camera access and try again.");
    els.scannerWrap.classList.add("hidden");
    els.scanSoBtn.style.display = "inline-block";
    els.stopScanBtn.style.display = "none";
  }
}

async function stopScanner() {
  if (html5QrCode && scannerRunning) {
    try {
      await html5QrCode.stop();
      await html5QrCode.clear();
    } catch (error) {
      console.error("Scanner stop failed:", error);
    }
  }

  html5QrCode = null;
  scannerRunning = false;

  if (els.scannerWrap) els.scannerWrap.classList.add("hidden");
  if (els.scanSoBtn) els.scanSoBtn.style.display = "inline-block";
  if (els.stopScanBtn) els.stopScanBtn.style.display = "none";
}

function attachLiveInputHandlers() {
  [
    els.soNumber,
    els.operatorName,
    els.partNumber,
    els.trackingNumber,
    els.totalLength,
    els.numberOfCuts,
    els.endMeterValue,
    els.offsetValue
  ].forEach(input => {
    if (!input) return;
    input.addEventListener("input", updateLivePreviews);
    input.addEventListener("change", updateLivePreviews);
  });

  document.querySelectorAll('input[name="direction"]').forEach(radio => {
    radio.addEventListener("change", updateLivePreviews);
  });
}

function attachButtonHandlers() {
  if (els.p1NextBtn) {
    els.p1NextBtn.addEventListener("click", () => {
      if (!validatePage1()) return;
      showPage(2);
    });
  }

  if (els.scanSoBtn) els.scanSoBtn.addEventListener("click", startScanner);
  if (els.stopScanBtn) els.stopScanBtn.addEventListener("click", stopScanner);

  if (els.p2BackBtn) els.p2BackBtn.addEventListener("click", () => showPage(1));

  if (els.p2NextBtn) {
    els.p2NextBtn.addEventListener("click", () => {
      if (!validatePage2()) return;
      updateLivePreviews();
      showPage(3);
    });
  }

  if (els.p3BackBtn) els.p3BackBtn.addEventListener("click", () => showPage(2));

  if (els.generateBtn) {
    els.generateBtn.addEventListener("click", () => {
      if (!validatePage1() || !validatePage2() || !validatePage3()) return;
      buildCuts();
      renderResults();
      showPage(4);
    });
  }

  if (els.p4BackBtn) els.p4BackBtn.addEventListener("click", () => showPage(3));

  if (els.regenerateBtn) {
    els.regenerateBtn.addEventListener("click", () => {
      if (!validatePage1() || !validatePage2() || !validatePage3()) return;
      buildCuts();
      renderResults();
      alert("Cuts recalculated.");
    });
  }

  if (els.nextPendingBtn) {
    els.nextPendingBtn.addEventListener("click", jumpToNextPending);
  }

  if (els.markAllDoneBtn) els.markAllDoneBtn.addEventListener("click", markAllDone);

  if (els.p5BackBtn) els.p5BackBtn.addEventListener("click", () => showPage(4));

  if (els.startNewJobBtn) {
    els.startNewJobBtn.addEventListener("click", () => {
      const ok = confirm("Start a new job?");
      if (!ok) return;
      resetWholeJob();
    });
  }

  if (els.clearAllBtn) els.clearAllBtn.addEventListener("click", clearAll);
}

function init() {
  loadState();
  syncInputsFromState();
  updateSummaryHeader();
  updateLivePreviews();
  renderResults();
  renderFinalSummary();
  attachLiveInputHandlers();
  attachButtonHandlers();

  if (state.currentPage === 5 && !allCutsDone()) {
    showPage(4);
  } else {
    showPage(state.currentPage || 1);
  }
}

init();
