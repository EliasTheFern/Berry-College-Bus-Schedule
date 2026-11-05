/* =========================================================
   login.js — the admin login form (login.html only)
   Uses credentialsMatch() and rememberAdminLogin() from site.js
   ========================================================= */

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("loginError");

// Already logged in? Skip the form and go straight to the schedule.
if (isAdminLoggedIn()) {
  window.location.replace("index.html");
}

usernameInput.focus();

loginForm.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the browser from reloading the page

  const username = usernameInput.value;
  const password = passwordInput.value;

  if (username.trim() === "" || password === "") {
    showLoginError("Enter both a username and a password.");
    return;
  }

  if (!credentialsMatch(username, password)) {
    showLoginError("That username and password don't match. Check both and try again.");
    passwordInput.value = "";
    passwordInput.focus();
    return;
  }

  if (!rememberAdminLogin()) {
    showLoginError("This browser is blocking saved data, so the login can't be kept. Open the site with VS Code's Live Server (see README.md).");
    return;
  }

  // Back to the schedule, now in editing mode.
  window.location.href = "index.html";
});

function showLoginError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}
