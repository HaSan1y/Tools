const storage = chrome?.storage || browser?.storage;

const userInput = document.getElementById("userInput");
const keywordInput = document.getElementById("keywordInput");
const addUserBtn = document.getElementById("addUser");
const addKeywordBtn = document.getElementById("addKeyword");
const userList = document.getElementById("userList");
const keywordList = document.getElementById("keywordList");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const resetCounterBtn = document.getElementById("resetCounter");

const userCount = document.getElementById("userCount");
const keywordCount = document.getElementById("keywordCount");
const filteredCountUI = document.getElementById("filteredCount");

let blockedUsers = [];
let blockedKeywords = [];
let filteredCount = 0;

function safeGet(callback) {
  storage.sync.get(
    ["blockedUsers", "blockedKeywords", "filteredCount"],
    (data) => {
      callback(data || {});
    }
  );
}

function safeSet(data) {
  storage.sync.set(data);
}

safeGet((data) => {
  blockedUsers = data.blockedUsers || [];
  blockedKeywords = data.blockedKeywords || [];
  filteredCount = data.filteredCount || 0;

  renderUsers();
  renderKeywords();
  updateStats();
});

addUserBtn.addEventListener("click", () => {
  const user = userInput.value.trim().toLowerCase().replace("@", "");
  if (!user) return;

  if (!blockedUsers.includes(user)) {
    blockedUsers.push(user);
    safeSet({ blockedUsers });
    renderUsers();
    updateStats();
  }

  userInput.value = "";
});

addKeywordBtn.addEventListener("click", () => {
  const keyword = keywordInput.value.trim().toLowerCase();
  if (!keyword) return;

  if (!blockedKeywords.includes(keyword)) {
    blockedKeywords.push(keyword);
    safeSet({ blockedKeywords });
    renderKeywords();
    updateStats();
  }
  keywordInput.value = "";
});

exportBtn.addEventListener("click", () => {
  const data = { blockedUsers, blockedKeywords };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "twitter-filter-blocklist.json";
  a.click();
});

importBtn.addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", () => {
  const file = importFile.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    const data = JSON.parse(e.target.result);

    blockedUsers = data.blockedUsers || [];
    blockedKeywords = data.blockedKeywords || [];

    safeSet({ blockedUsers, blockedKeywords });

    renderUsers();
    renderKeywords();
    updateStats();
  };

  reader.readAsText(file);
});

resetCounterBtn.addEventListener("click", () => {
  filteredCount = 0;
  safeSet({ filteredCount: 0 });
  updateStats();
});

function renderUsers() {
  userList.innerHTML = "";

  blockedUsers.forEach(user => {
    const li = document.createElement("li");
    li.textContent = "@" + user;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      blockedUsers = blockedUsers.filter(u => u !== user);
      safeSet({ blockedUsers });
      renderUsers();
      updateStats();
    };

    li.appendChild(removeBtn);
    userList.appendChild(li);
  });
}

function renderKeywords() {
  keywordList.innerHTML = "";

  blockedKeywords.forEach(keyword => {
    const li = document.createElement("li");
    li.textContent = keyword;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      blockedKeywords = blockedKeywords.filter(k => k !== keyword);
      safeSet({ blockedKeywords });
      renderKeywords();
      updateStats();
    };

    li.appendChild(removeBtn);
    keywordList.appendChild(li);
  });
}

function updateStats() {
  userCount.innerText = `Users: ${blockedUsers.length}`;
  keywordCount.innerText = `Keywords: ${blockedKeywords.length}`;
  filteredCountUI.innerText = `Filtered: ${filteredCount}`;
}