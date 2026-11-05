/* =========================================================
   ride.js — the "Request a ride" form (home page)
   1. Fills the two dropdowns from one list of stops
   2. Checks the form before it's sent
   3. Shows the "Your bus will arrive shortly" popup
   ========================================================= */

/* ---------- The stops ----------
   The Main Campus list is the shuttle's loop, in route order, from Berry's
   published bus schedule. Mountain Campus and Oak Hill are by request.
   To add or rename a stop, change it here and both dropdowns update. */
const STOP_GROUPS = [
  {
    label: "Main Campus shuttle stops",
    stops: [
      "Krannert Center / McAllister Hall",
      "Welcome Center",
      "Ford Auditorium / Ford Classrooms",
      "West Mary / East Mary Lower Lot",
      "Westcott Building",
      "Admissions / Alumni Center / Clara Archway",
      "Ladd Center / Morgan-Deerfield / Townhouses",
      "Hermann Hall / McAllister Hall",
      "Cage Center / Evans Hall",
      "Centennial / College Chapel / Cook Building / Green Hall",
      "Dana / Library / Thomas Berry",
      "Richards Gym",
      "Morton-Lemley / Blackstone Hall",
      "Laughlin Building / Moon Building",
    ],
  },
  {
    label: "By request",
    stops: [
      "Mountain Campus (Friendship / Pilgrim)",
      "Oak Hill",
    ],
  },
];

/* ---------- Elements on the page ---------- */
const rideForm = document.getElementById("rideForm");
const studentIdInput = document.getElementById("studentId");
const pickupSelect = document.getElementById("pickup");
const dropoffSelect = document.getElementById("dropoff");
const rideError = document.getElementById("rideError");
const rideDialog = document.getElementById("rideDialog");
const rideDialogDetail = document.getElementById("rideDialogDetail");
const rideDialogClose = document.getElementById("rideDialogClose");


/* ---------- 1. Fill the dropdowns ---------- */

function fillStops(select) {
  STOP_GROUPS.forEach((group) => {
    // <optgroup> draws a heading inside the dropdown
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;

    group.stops.forEach((stop) => {
      const option = document.createElement("option");
      option.value = stop;
      option.textContent = stop;
      optgroup.append(option);
    });

    select.append(optgroup);
  });
}

fillStops(pickupSelect);
fillStops(dropoffSelect);


/* ---------- 2. Check the form ---------- */

rideForm.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the browser from reloading the page

  const studentId = studentIdInput.value.trim();
  const pickup = pickupSelect.value;
  const dropoff = dropoffSelect.value;

  // /^[0-9]+$/ means "only digits, from start to end"
  if (studentId === "" || !/^[0-9]+$/.test(studentId)) {
    showRideError("Enter your student ID number using digits only.", studentIdInput);
    return;
  }

  if (pickup === "") {
    showRideError("Choose a pickup location.", pickupSelect);
    return;
  }

  if (dropoff === "") {
    showRideError("Choose a drop-off location.", dropoffSelect);
    return;
  }

  if (pickup === dropoff) {
    showRideError("Pickup and drop-off can't be the same stop.", dropoffSelect);
    return;
  }

  // ⚠️ PROTOTYPE ONLY: nothing is sent anywhere yet. A real version would
  // send the request to the Office of Student Involvement (see README.md).
  hideRideError();
  rideDialogDetail.textContent = `Pickup at ${pickup}, heading to ${dropoff}.`;
  rideDialog.showModal(); // opens the popup and dims the rest of the page
  rideForm.reset();
});

function showRideError(message, field) {
  rideError.textContent = message;
  rideError.hidden = false;
  field.focus();
}

function hideRideError() {
  rideError.hidden = true;
}


/* ---------- 3. Closing the popup ---------- */

rideDialogClose.addEventListener("click", () => rideDialog.close());

// Clicking the dimmed area outside the popup closes it too.
// (Inside the popup, the click lands on a child element, not the dialog itself.)
rideDialog.addEventListener("click", (event) => {
  if (event.target === rideDialog) rideDialog.close();
});

// After the popup closes, put the cursor back at the top of the form.
rideDialog.addEventListener("close", () => studentIdInput.focus());
