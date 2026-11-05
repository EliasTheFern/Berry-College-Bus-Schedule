/* =========================================================
   site.js — shared by both pages
   1. Remembers whether the admin is logged in (localStorage)
   2. Shows "Admin login" or "Log out" in the top-right corner
   3. Shows the college logo once you add the file
   ========================================================= */

// ⚠️ PROTOTYPE ONLY: anyone can read these by viewing the page source.
// Before this goes live, the login has to move to a server (see README.md).
const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "Password123";

// localStorage is a small key → value store built into every browser.
// What you put there survives reloads and even closing the browser.
const LOGIN_KEY = "berryBus.adminLoggedIn";


/* ---------- Safe localStorage helpers ----------
   Some browsers block storage (strict privacy settings, some file:// setups).
   Wrapping each call in try/catch keeps the page working anyway. */

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // Storage is blocked, so there is nothing to remove.
  }
}


/* ---------- Login ---------- */

// The username ignores capital letters ("admin" works too); the password doesn't.
function credentialsMatch(username, password) {
  const nameMatches = username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase();
  return nameMatches && password === ADMIN_PASSWORD;
}

// The admin stays logged in until they click "Log out",
// even after closing the browser. Returns false if storage is blocked.
function rememberAdminLogin() {
  return writeStorage(LOGIN_KEY, "yes");
}

function isAdminLoggedIn() {
  return readStorage(LOGIN_KEY) === "yes";
}

function logOut() {
  removeStorage(LOGIN_KEY);
}


/* ---------- The top-right corner ---------- */

function renderAdminArea() {
  const area = document.getElementById("adminArea");
  if (!area) return; // the login page doesn't have this spot

  area.replaceChildren(); // empty it, then rebuild

  if (!isAdminLoggedIn()) {
    const loginLink = document.createElement("a");
    loginLink.className = "admin-link";
    loginLink.href = "login.html";
    loginLink.textContent = "Admin login";
    area.append(loginLink);
    return;
  }

  const status = document.createElement("span");
  status.className = "admin-status";
  status.textContent = "Signed in as Admin";

  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "admin-link";
  logoutButton.textContent = "Log out";
  logoutButton.addEventListener("click", () => {
    logOut();
    announceLoginChange();
  });

  area.append(status, logoutButton);
}

// Redraws the corner and tells the rest of the page (schedule.js listens
// for "loginchange") that someone logged in or out.
function announceLoginChange() {
  renderAdminArea();
  document.dispatchEvent(new CustomEvent("loginchange"));
}


/* ---------- The logo ----------
   decode() waits for the image to load:
   success → show the logo; failure (no file yet) → keep the text name. */

function setUpLogo() {
  document.querySelectorAll(".brand-logo").forEach((logo) => {
    logo.decode()
      .then(() => logo.closest(".brand").classList.add("has-logo"))
      .catch(() => logo.remove());
  });
}


// If the admin logs in or out in another tab, update this tab as well.
window.addEventListener("storage", (event) => {
  if (event.key === LOGIN_KEY || event.key === null) {
    announceLoginChange();
  }
});

renderAdminArea();
setUpLogo();
