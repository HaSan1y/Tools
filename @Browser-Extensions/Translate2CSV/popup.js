function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

async function translateSentence(sentence, targetLang, apiKey) {
  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      auth_key: apiKey,
      text: sentence,
      target_lang: targetLang
    })
  });

  const data = await response.json();
  return data.translations[0].text;
}

function toCSV(pairs) {
  return pairs
    .map(([src, tgt]) =>
      `"${src.replace(/"/g, '""')}","${tgt.replace(/"/g, '""')}"`
    )
    .join("\n");
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

document.getElementById("run").onclick = async () => {
  const text = document.getElementById("input").value;
  const lang = document.getElementById("lang").value;
  const apiKey = document.getElementById("apiKey").value;
  const status = document.getElementById("status");

  if (!text || !apiKey) {
    status.innerText = "Missing text or API key";
    return;
  }

  status.innerText = "Translating...";

  try {
    const sentences = splitSentences(text);

    const translations = await Promise.all(
      sentences.map(s => translateSentence(s, lang, apiKey))
    );

    const pairs = sentences.map((s, i) => [
      s.trim(),
      translations[i].trim()
    ]);

    const csv = toCSV(pairs);
    downloadCSV(csv);

    status.innerText = "Done!";
  } catch (err) {
    console.error(err);
    status.innerText = "Error occurred";
  }
};