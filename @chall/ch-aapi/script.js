const ox = document.querySelector('button[type="button"]');
const apiUrl = "https://api.adviceslip.com/advice";

async function api() {
  const response = await fetch(apiUrl + "?" + Math.floor(Math.random() * 10));
  if (response.status != 200) {
    document.querySelector("#err").style.display = "block";
    document.querySelector("span").innerHTML = `${response.status}`;
  } else {
    document.querySelector("#err").style.display = "none";
    var data = await response.json();
    asdf.innerHTML = `${data.slip.advice}`;
    adv.innerHTML = `${data.slip.id}`;
  }
}

ox.addEventListener("click", () => {
  api();
});
