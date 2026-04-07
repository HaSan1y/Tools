var api = typeof browser !== "undefined" ? browser : chrome;

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "process_in_background") {
		processAndOpenTab(request.content, request.language, request.provider, request.model, request.apiKey);
	}

	if (request.action === "process_readme") {
		processAndReturn(request.content, request.language, request.provider, request.model, request.apiKey, sendResponse);
		return true;
	}
});
async function processAndOpenTab(content, language, provider, model, apiKey) {
	const output = await processWithLLM(content, language, provider, model, apiKey);

	const encoded = encodeURIComponent(output);

	api.tabs.create({
		url: api.runtime.getURL("result.html") + "?data=" + encoded,
	});
}
async function processAndReturn(content, language, provider, model, apiKey, sendResponse) {
	let output = await processWithLLM(content, language, provider, model, apiKey);

	sendResponse({ output });
}
function smartTruncate(text, maxLength) {
	if (text.length <= maxLength) return text;

	let truncated = text.substring(0, maxLength);

	// Try to cut at nearest heading
	const lastHeading = truncated.lastIndexOf("\n#");
	if (lastHeading > 5000) {
		return truncated.substring(0, lastHeading);
	}

	// Otherwise cut at last paragraph break
	const lastBreak = truncated.lastIndexOf("\n\n");
	if (lastBreak > 5000) {
		return truncated.substring(0, lastBreak);
	}

	return truncated;
}

async function processWithLLM(content, language, provider, model, apiKey) {
	console.log("Provider:", provider);
	if (!provider) {
		provider = "lmstudio";
	}
	const MAX_LENGTH = 10000;
	const truncated_ReadMeText = smartTruncate(content, MAX_LENGTH);
	const prompt = ` You are a technical documentation optimizer. Rewrite the following GitHub README. If the README is not in English: 1) First summarize each section briefly. 2) Then translate summary into clear technical English. 3) Then restructure. Remove: - badges - donation links - marketing fluff - redundant explanations Always preserve: - License sections - Security warnings - Important external links Do NOT remove license information or legal disclaimers. Preserve any sections related to licensing or security warnings. Preserve important project links such as: - Official website - Documentation - Release page - Installation packages Structure strictly as: # Project Summary # Requirements # Installation # Minimal Usage # Important Notes Translate everything into: ${language} Return clean markdown only. README: ${truncated_ReadMeText} `;

	if (provider === "lmstudio") {
		return await callLMStudio(prompt, model);
	}

	if (provider === "openai") {
		return await callOpenAI(prompt, model, apiKey);
	}
}
async function callLMStudio(prompt, model) {
	const response = await fetch("http://localhost:1234/v1/chat/completions", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: model || "mistral-7b-instruct-v0.3",
			messages: [
				{
					role: "user",
					content: "You clean and restructure README files.\n\n" + prompt,
				},
			],
			temperature: 0.3,
			max_tokens: 800,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error("LM Studio raw error:", errorText);
		throw new Error("HTTP Error: " + response.status);
	}
	const data = await response.json();

	if (!data.choices || !data.choices.length) {
		console.error("Unexpected API format:", data);
		throw new Error("Invalid AI response format");
	}

	return data.choices[0].message.content;
}

async function callOpenAI(prompt, model, apiKey) {
	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: "Bearer " + apiKey,
		},
		body: JSON.stringify({
			model: model || "gpt-4o-mini",
			messages: [
				{ role: "system", content: "You clean and restructure README files." },
				{ role: "user", content: prompt },
			],
			temperature: 0.3,
		}),
	});

	const data = await response.json();
	if (!response.ok) {
		console.error("OpenAI Error:", data);
		throw new Error(data.error?.message || "OpenAI request failed");
	}

	if (!data.choices || !data.choices.length) {
		console.error("Unexpected OpenAI format:", data);
		throw new Error("Invalid OpenAI response format");
	}
	return data.choices[0].message.content;
}
