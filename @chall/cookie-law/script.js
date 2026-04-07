const cookieBox = document.querySelector(".wrapper");
const buttons = document.querySelectorAll(".button");

const executeCodes = () => {
  if (document.cookie.includes("profile")) return;

  cookieBox.classList.add("show");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      cookieBox.classList.remove("show");
      if (button.id == "acceptBtn") {
        //cookies for 1 month 60=1min 60=1hr 30=30days samesitestrict only within the orignpage
        document.cookie =
          "cookieBy= profile; SameSite=Strict; max-age= " + 60 * 60 * 24 * 30;
      }
    });
  });
};

window.addEventListener("load", executeCodes);
