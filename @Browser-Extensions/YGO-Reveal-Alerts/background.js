console.log("Background script started");

async function checkForNewCards() {
	const res = await fetch("https://db.ygoprodeck.com/api/v7/cardsets.php");
	const sets = await res.json();
	const now = new Date();
	let recentSets = [];

	sets.forEach((set) => {
		const release = new Date(set.tcg_date);
		const diffDays = (now - release) / (1000 * 60 * 60 * 24);
		if (diffDays <= 7) {
			recentSets.push(set);
		}
	});

	let newCards = [];

	for (const set of recentSets) {
		const res = await fetch("https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=" + encodeURIComponent(set.set_name));
		const data = await res.json();
		data.data.forEach((card) => {
			newCards.push({
				name: card.name,
				type: card.type,
				release: set.tcg_date,
				setName: set.set_name,
				setPack: set.num_of_cards,
				url: "https://ygoprodeck.com/card/?search=" + card.id
			});
		});
	}
	return newCards;
}

function createAlarm() {
	console.log("Creating alarm...");

	chrome.alarms.create("checkCards", {
		delayInMinutes: 10,
	});
	chrome.alarms.getAll((alarms) => {
		console.log("Current alarms:", alarms);
	});
}

createAlarm();
chrome.runtime.onInstalled.addListener(createAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
	console.log("Alarm triggered:", alarm);
	if (alarm.name === "checkCards") {
		console.log("Alarm fired");
		checkForNewCards();
	}
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.action === "checkCards") {
		checkForNewCards().then((cards) => {
			sendResponse({ cards: cards });
		});
    chrome.notifications.create({
      type: "basic",
      iconUrl: "16.png",
      title: "Test Notification",
      message: "A New Card?!"
    });
		return true;
	}
});
