function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

function getSourceText() {
  const textarea = document.querySelector("textarea");
  return textarea ? textarea.value : "";
}

function getTranslatedText() {
  const output = document.querySelector('[aria-live="polite"]');
  return output ? output.innerText : "";
}

function toCSV(pairs) {
  return pairs.map(p => `"${p[0]}","${p[1]}"`).join("\n");
}

function downloadCSV(csv) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "translations.csv";
  a.click();

  URL.revokeObjectURL(url);
}

async function process() {
  const source = getSourceText();
  const sentences = splitSentences(source);

  let pairs = [];

  for (let sentence of sentences) {
    document.querySelector("textarea").value = sentence;
    document.querySelector("textarea").dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise(r => setTimeout(r, 1500)); // wait for translation

    const translated = getTranslatedText();
    pairs.push([sentence.trim(), translated.trim()]);
  }

  const csv = toCSV(pairs);
  downloadCSV(csv);
}