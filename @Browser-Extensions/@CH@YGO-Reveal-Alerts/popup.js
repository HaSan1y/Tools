document.addEventListener("DOMContentLoaded", () => {

const log = document.getElementById("log");

chrome.runtime.sendMessage(
{ action: "checkCards" },
(response) => {

  log.innerHTML = "";

  if(!response || !response.cards || response.cards.length === 0){
    log.textContent = "No recent cards found.";
    return;
  }

  response.cards.forEach(card => {

    const cardBox = document.createElement("div");
    cardBox.className = "card";

    const name = document.createElement("a");
    name.className = "card-name";
    name.textContent = card.name;
    name.href = card.url;
    name.target = "_blank";

    const type = document.createElement("div");
    type.className = "card-type";
    type.textContent = card.type;

    const date = document.createElement("div");
    date.className = "card-date";
    date.textContent = "Released: " + card.release;

    const set = document.createElement("div");
    set.className = "card-set";
    set.textContent = "Set: " + card.setName;

    const pack = document.createElement("div");
    pack.className = "card-setpack";
    pack.textContent = "Pack: " + card.setPack;

    cardBox.appendChild(name);
    cardBox.appendChild(type);
    cardBox.appendChild(date);
    cardBox.appendChild(set);
    cardBox.appendChild(pack);

    log.appendChild(cardBox);

  });

}

);

});
