let email, y;

function validateEmail(email) {
  var re = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  return re.test(email);
}

function showMainDiv() {
  email = document.getElementById("name").value;
  if (!validateEmail(email)) {
    alert("Invalid email address!");
    return false;
  } else {
    email = document.getElementById("name").value;
    y = document.getElementById("asdf").innerText = email;

    document.querySelector(".main").style.display = "block";
    document.querySelector("main").style.display = "none";
  }
}
