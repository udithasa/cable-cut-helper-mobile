const STORAGE_KEY_CURRENT = "cableCutMobileCurrentJob";
const STORAGE_KEY_HISTORY = "cableCutMobileHistory";

let currentJob = {
  soNumber: "",
  operatorName: "",
  cuts: []
};

const soNumberInput = document.getElementById("soNumber");
const operatorNameInput = document.getElementById("operatorName");
const partNumberInput = document.getElementById("partNumber");
const lengthInput = document.getElementById("length");
const qtyInput = document.getElementById("qty");

const saveJobBtn = document.getElementById("saveJobBtn");
const newJobBtn = document.getElementById("newJobBtn");
const addCutBtn = document.getElementById("addCutBtn");
const refresh3Btn = document.getElementById("refresh3Btn");
const clearCutsBtn = document.getElementById("clearCutsBtn");
const viewHistoryBtn = document.getElementById("viewHistoryBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const totalCutsEl = document.getElementById("totalCuts");
const doneCutsEl = document.getElementById("doneCuts");
const remainingCutsEl = document.getElementById("remainingCuts");

const nextThreeList = document.getElementById("nextThreeList");
const allCutsList = document.getElementById("allCutsList");

const historyPanel = document.getElementById("historyPanel");
const historyList = document.getElementById("historyList");

function saveCurrentJobToStorage() {
  localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(currentJob));
}

function loadCurrentJobFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
  if (saved) {
    currentJob = JSON.parse(saved);
  }
}

function getHistory() {
  const history = localStorage.getItem(STORAGE_KEY_HISTORY);
  return history ? JSON.parse(history) : [];
}

function saveHistory(historyArray) {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyArray));
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function updateFormFromJob() {
  soNumberInput.value = currentJob.soNumber || "";
  operatorNameInput.value = currentJob.operatorName || "";
}

function saveJobDetails() {
  currentJob.soNumber = soNumberInput.value.trim();
  currentJob.operatorName = operatorNameInput.value.trim();

  saveCurrentJobToStorage();
  alert("Job details saved.");
  renderAll();
}

function createCutObject(partNumber, length, qty) {
  return {
    id: Date.now() + Math.random().toString(16).slice(2),
    partNumber,
    length,
    qty,
    done: false,
    createdAt: new Date().toISOString(),
    doneAt: null
  };
}

function addCut() {
  const partNumber = partNumberInput.value.trim();
  const length = lengthInput.value.trim();
  const qty = parseInt(qtyInput.value, 10);

  if (!currentJob.soNumber.trim()) {
    alert("Please enter and save SO number first.");
    return;
  }

  if (!currentJob.operatorName.trim()) {
    alert("Please enter and save operator name first.");
    return;
  }

  if (!partNumber) {
    alert("Please enter part number.");
    return;
  }

  if (!length) {
    alert("Please enter length.");
    return;
  }

  if (!qty || qty < 1) {
    alert("Quantity must be at least 1.");
    return;
  }

  const cut = createCutObject(partNumber, length, qty);
  currentJob.cuts.push(cut);

  saveCurrentJobToStorage();

  partNumberInput.value = "";
  lengthInput.value = "";
  qtyInput.value = "1";

  renderAll();
}

function markCutDone(cutId) {
  const cut = currentJob.cuts.find(c => c.id === cutId);
  if (!cut) return;

  cut.done = true;
  cut.doneAt = new Date().toISOString();

  saveCurrentJobToStorage();
  renderAll();
}

function markCutUndone(cutId) {
  const cut = currentJob.cuts.find(c => c.id === cutId);
  if (!cut) return;

  cut.done = false;
  cut.doneAt = null;

  saveCurrentJobToStorage();
  renderAll();
}

function deleteCut(cutId) {
  const confirmed = confirm("Delete this cut?");
  if (!confirmed) return;

  currentJob.cuts = currentJob.cuts.filter(c => c.id !== cutId);
  saveCurrentJobToStorage();
  renderAll();
}

function getPendingCuts() {
  return currentJob.cuts.filter(c => !c.done);
}

function renderSummary() {
  const total = currentJob.cuts.length;
  const done = currentJob.cuts.filter(c => c.done).length;
  const remaining = total - done;

  totalCutsEl.textContent = total;
  doneCutsEl.textContent = done;
  remainingCutsEl.textContent = remaining;
}

function createCutCard(cut, inNextThree = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "cut-item" + (cut.done ? " done" : "");

  const statusClass = cut.done ? "status-done" : "status-pending";
  const statusText = cut.done ? "DONE" : "PENDING";

  wrapper.innerHTML = `
    <div class="cut-top">
      <div>
        <div class="cut-title">${escapeHtml(cut.partNumber)}</div>
        <div class="cut-meta">
          Length: ${escapeHtml(cut.length)}<br>
          Qty: ${cut.qty}<br>
          Added: ${formatDateTime(cut.createdAt)}
          ${cut.doneAt ? `<br>Done: ${formatDateTime(cut.doneAt)}` : ""}
        </div>
      </div>
      <span class="status-badge ${statusClass}">${statusText}</span>
    </div>
    <div class="cut-actions"></div>
  `;

  const actions = wrapper.querySelector(".cut-actions");

  if (cut.done) {
    const undoBtn = document.createElement("button");
    undoBtn.className = "secondary-btn";
    undoBtn.textContent = "Undo";
    undoBtn.onclick = () => markCutUndone(cut.id);
    actions.appendChild(undoBtn);
  } else {
    const doneBtn = document.createElement("button");
    doneBtn.className = "primary-btn";
    doneBtn.textContent = "Mark Done";
    doneBtn.onclick = () => markCutDone(cut.id);
    actions.appendChild(doneBtn);
  }

  if (!inNextThree) {
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => deleteCut(cut.id);
    actions.appendChild(deleteBtn);
  }

  return wrapper;
}

function renderNextThree() {
  nextThreeList.innerHTML = "";

  const nextThree = getPendingCuts().slice(0, 3);

  if (nextThree.length === 0) {
    nextThreeList.innerHTML = `<p class="empty-text">No pending cuts.</p>`;
    return;
  }

  nextThree.forEach(cut => {
    nextThreeList.appendChild(createCutCard(cut, true));
  });
}

function renderAllCuts() {
  allCutsList.innerHTML = "";

  if (currentJob.cuts.length === 0) {
    allCutsList.innerHTML = `<p class="empty-text">No cuts added yet.</p>`;
    return;
  }

  currentJob.cuts.forEach(cut => {
    allCutsList.appendChild(createCutCard(cut, false));
  });
}

function archiveCurrentJobToHistory() {
  if (!currentJob.soNumber && currentJob.cuts.length === 0) return;

  const history = getHistory();

  const historyItem = {
    id: Date.now(),
    soNumber: currentJob.soNumber || "",
    operatorName: currentJob.operatorName || "",
    cuts: currentJob.cuts,
    savedAt: new Date().toISOString()
  };

  history.unshift(historyItem);
  saveHistory(history);
}

function startNewJob() {
  const hasData =
    currentJob.soNumber.trim() ||
    currentJob.operatorName.trim() ||
    currentJob.cuts.length > 0;

  if (hasData) {
    const shouldSave = confirm(
      "Do you want to save the current job to local history before starting a new job?"
    );

    if (shouldSave) {
      archiveCurrentJobToHistory();
    }
  }

  currentJob = {
    soNumber: "",
    operatorName: "",
    cuts: []
  };

  saveCurrentJobToStorage();
  updateFormFromJob();
  renderAll();
}

function clearAllCuts() {
  if (currentJob.cuts.length === 0) {
    alert("No cuts to clear.");
    return;
  }

  const confirmed = confirm("Clear all cuts in the current job?");
  if (!confirmed) return;

  currentJob.cuts = [];
  saveCurrentJobToStorage();
  renderAll();
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML = `<p class="empty-text">No history yet.</p>`;
    return;
  }

  history.forEach(item => {
    const totalCuts = item.cuts.length;
    const doneCuts = item.cuts.filter(c => c.done).length;

    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div class="history-title">SO: ${escapeHtml(item.soNumber || "-")}</div>
      <div class="history-meta">
        Operator: ${escapeHtml(item.operatorName || "-")}<br>
        Saved: ${formatDateTime(item.savedAt)}<br>
        Total Cuts: ${totalCuts}<br>
        Done Cuts: ${doneCuts}
      </div>
    `;
    historyList.appendChild(div);
  });
}

function toggleHistoryPanel() {
  historyPanel.classList.toggle("hidden");
  if (!historyPanel.classList.contains("hidden")) {
    renderHistory();
  }
}

function clearHistory() {
  const history = getHistory();
  if (history.length === 0) {
    alert("History is already empty.");
    return;
  }

  const confirmed = confirm("Clear all local history?");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY_HISTORY);
  renderHistory();
}

function renderAll() {
  renderSummary();
  renderNextThree();
  renderAllCuts();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

saveJobBtn.addEventListener("click", saveJobDetails);
newJobBtn.addEventListener("click", startNewJob);
addCutBtn.addEventListener("click", addCut);
refresh3Btn.addEventListener("click", renderNextThree);
clearCutsBtn.addEventListener("click", clearAllCuts);
viewHistoryBtn.addEventListener("click", toggleHistoryPanel);
clearHistoryBtn.addEventListener("click", clearHistory);

loadCurrentJobFromStorage();
updateFormFromJob();
renderAll();
