const params = new URLSearchParams(window.location.search);
const data = params.get("data");

if (data) {
  const decoded = decodeURIComponent(data);
  document.getElementById("content").innerHTML = marked.parse(decoded);
}

document.getElementById("printBtn").addEventListener("click", () => {
  window.print();
});