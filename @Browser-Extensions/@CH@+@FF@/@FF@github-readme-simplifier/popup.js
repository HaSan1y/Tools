const simplifyBtn = document.getElementById("simplifyBtn");
const printBtn = document.getElementById("printBtn");
const statusElement = document.getElementById("status");
const outputDiv = document.getElementById("output");
const languageSelect = document.getElementById("language");
const providerSelect = document.getElementById("provider");
const modelInput = document.getElementById("modelName");
const apiKeyInput = document.getElementById("apiKey");
var api = typeof browser !== "undefined" ? browser : chrome;

simplifyBtn.addEventListener("click", async () => {
	statusElement.textContent = "Extracting README...";
	outputDiv.innerHTML = "";
	const openInTab = document.getElementById("openInTab").checked;

	const tabs = await api.tabs.query({ active: true, currentWindow: true });
	const tab = await tabs[0];

	if (api.scripting) {
		await api.scripting.executeScript({
			target: { tabId: tab.id },
			files: ["content.js"],
		});
	} else {
		await api.tabs.executeScript(tab.id, {
			file: "content.js",
		});
	}
	api.tabs.sendMessage(tab.id, { action: "extract_readme" }, (response) => {
		if (api.runtime.lastError) {
			statusElement.textContent = "Error: " + api.runtime.lastError.message;
			return;
		}
		if (!response || !response.content) {
			statusElement.textContent = "Could not find README.";
			return;
		}

		if (openInTab) {
			if (providerSelect.value === "openai" && !apiKeyInput.value.trim()) {
				statusElement.textContent = "Please enter your OpenAI API key.";
				return;
			}
			api.runtime.sendMessage({
				action: "process_in_background",
				content: response.content,
				language: languageSelect.value,
				provider: providerSelect.value,
				model: modelInput.value,
				apiKey: apiKeyInput.value,
			});

			statusElement.textContent = "Processing in new tab...";
			return;
		}
		simplifyBtn.disabled = true;
		statusElement.textContent = "Processing...";

		api.runtime.sendMessage(
			{
				action: "process_readme",
				content: response.content,
				language: languageSelect.value,
				provider: providerSelect.value,
				model: modelInput.value,
				apiKey: apiKeyInput.value,
			},
			(result) => {
				if (api.runtime.lastError) {
					statusElement.textContent = "Error: " + api.runtime.lastError.message;
					simplifyBtn.disabled = false;
					return;
				}
				if (!result || !result.output) {
					statusElement.textContent = "AI processing failed.";
					return;
				}

				statusElement.textContent = "Done.";
				const openInTab = document.getElementById("openInTab").checked;

				if (openInTab) {
					openResultInTab(result.output);
				} else {
					renderMarkdown(result.output);
				}
			},
		);
		simplifyBtn.disabled = false;
	});
});

printBtn.addEventListener("click", () => {
	window.print();
});

function renderMarkdown(markdown) {
	outputDiv.innerHTML = marked.parse(markdown);
}
function openResultInTab(markdown) {
	const encoded = encodeURIComponent(markdown);
	api.tabs.create({
		url: api.runtime.getURL("result.html") + "?data=" + encoded,
	});
}
