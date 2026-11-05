# Berry College Campus Bus Schedule (prototype)

A home page where students see this week's bus times on a weekly calendar, plus an admin mode where the schedule is drawn by touching and dragging.

## Open it in VS Code

1. Unzip, then in VS Code choose **File → Open Folder…** and pick `berry-bus-schedule`.
2. VS Code will offer to install the recommended **Live Server** extension. Accept.
3. Right-click `index.html` → **Open with Live Server**. The site opens in your browser and reloads every time you save a file.

Double-clicking `index.html` also works in Chrome and Edge. Live Server is the safer choice for the demo, because some browsers (Safari, Firefox) limit saving for pages opened straight from a file.

## Admin login

- Click **Admin login** in the top-right corner.
- Username `Admin`, password `Password123` (the username also works in lowercase).
- You stay logged in until you click **Log out**, even after closing the browser.

## Editing the schedule

- Drag across empty half hours and they turn blue (bus running).
- Start a drag on blue and that drag erases instead.
- Works with a mouse, a finger or a pen. On a phone, scroll by dragging the time column on the left.
- The arrows switch weeks, and every week is saved separately. **Copy previous week** fills the week on screen with last week's times; **Clear week** empties it.
- Changes save the moment you let go. Click **Log out** to see exactly what students see.

## Requesting a ride

At the bottom of the page, a student enters their ID number and picks a pickup and drop-off stop. The stops are Berry's real shuttle stops, taken from the college's published campus bus schedule: the 14 Main Campus loop stops in route order, plus Mountain Campus and Oak Hill, which Berry serves by request. After the form is sent, a popup says the bus will arrive shortly.

The form checks that the ID is digits only, that both stops are chosen, and that they're different. To add, remove or rename a stop, edit the `STOP_GROUPS` list at the top of `js/ride.js`; both dropdowns update from it.

## Adding the logo and real photos

**Logo:** save the official logo as `images/berry-logo.png` (the white version, since the header is navy). It appears automatically; until then the header shows "Berry College" as text.

**Photos:** the pictures are drawn placeholders. Put your photos in `images/` and change the matching `src` in `index.html` (and update the `alt` text to describe your photo):

| Where on the page | Placeholder file |
| --- | --- |
| Big banner at the top | `images/campus.svg` |
| Large photo | `images/bus-side.svg` |
| Small photo, top | `images/bus-stop.svg` |
| Small photo, bottom | `images/campus-walk.svg` |

Photos of Berry's actual buses and campus will make a much stronger impression on the administration than drawings.

## What's in the folder

```
berry-bus-schedule/
├── index.html         the bus schedule (home page)
├── login.html         the admin login page
├── css/styles.css     all the styling; Berry's colors are at the top
├── js/site.js         shared: remembers the login, top-right link, logo
├── js/schedule.js     the calendar, touch-and-drag painting, saving, next-bus sign
├── js/ride.js         the request-a-ride form, its stop list and the popup
├── js/login.js        the login form
├── images/            placeholder pictures (add berry-logo.png here)
└── .vscode/           tells VS Code to recommend Live Server
```

## How it works

### 1. The calendar is a grid of little boxes

`buildCalendar()` in `schedule.js` creates 7 columns × 32 rows of `<div class="slot">`. Each box remembers its day and time in `data-day` and `data-minute` attributes. Times are counted in minutes after midnight, so 7:30 AM is 450. CSS Grid (`display: grid`) lines the boxes up.

### 2. Touch-and-drag painting

The code uses **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`), which treat a mouse, a finger and a pen the same way.

- On `pointerdown` it looks at the box you pressed: empty means this drag *adds* blue, blue means this drag *erases*.
- On `pointermove` it asks `document.elementFromPoint(x, y)` which box is under the pointer. On touch screens the browser keeps reporting the box where the finger *started*, so asking the page directly is the reliable way.
- A fast swipe can skip boxes between two move events, so the code fills in every box on the line between the last position and the new one.
- The CSS rule `touch-action: none` on the boxes (admin mode only) stops the phone from scrolling the page while you paint.

### 3. Saving

Every blue half hour becomes a short text key like `"0-450"` (day 0 = Monday, minute 450 = 7:30 AM). Each week is stored under the date of its Monday:

```json
{ "2026-11-02": ["0-450", "0-480", "0-510", "0-540"] }
```

`JSON.stringify` turns that object into text and `localStorage.setItem` stores it in the browser. The student view reads it back with `localStorage.getItem` and `JSON.parse`. To watch it change while you paint, open DevTools (F12) → **Application** → **Local Storage**.

### 4. A sneaky date bug it avoids

`new Date().toISOString()` gives the date in UTC time. On a US evening, UTC is already tomorrow, so a week could be saved under the wrong Monday. `dateKey()` builds the date from local time instead.

### 5. The "next bus" sign

`renderSign()` checks today and the next 7 days, finds the first blue block that hasn't finished, and shows "Running now" or "Next bus". It refreshes every minute, as does the gold line marking the current time.

### 6. The ride-request popup

The popup is a `<dialog>` element, which browsers now support natively. `rideDialog.showModal()` opens it centered, dims the rest of the page (styled with the `::backdrop` selector), and traps keyboard focus inside it until it closes. Escape closes it for free; `ride.js` adds an OK button and closes it when the dimmed area is clicked. The `<optgroup>` headings inside the dropdowns ("Main Campus shuttle stops", "By request") are also built in, with no extra code.

## Settings you can change

At the top of `js/schedule.js`:

```js
const FIRST_HOUR = 7;     // calendar starts at 7:00 AM
const LAST_HOUR = 23;     // calendar ends at 11:00 PM (24 = midnight)
const SLOT_MINUTES = 30;  // length of one row: 15, 30 or 60
```

## Before this goes live

Two shortcuts are fine for a demo but not for real students:

1. **Saving is per browser.** `localStorage` lives inside one browser on one device, so times painted on your laptop won't show up on a student's phone. A real version saves to a shared database (Firebase or Supabase are common free starting points), and every visitor reads from it. For the demo, paint the schedule on the same computer and browser you present from.
2. **The login isn't secure.** The username and password sit in `js/site.js`, where anyone can read them with View Source, and the "logged in" flag can be set by hand in DevTools. A real version checks the password on a server, ideally through the college's own sign-in system.
3. **Ride requests go nowhere yet.** The form shows the popup but doesn't send the request anywhere. A real version would deliver it to whoever dispatches the shuttle (Berry's Office of Student Involvement handles ride requests today) by email, text message or a dispatcher screen, and would check the student ID against the college's records.

## Ideas to try next

- An **Undo** button: save a copy of `weekSlots` before each drag.
- A **dispatcher view** for the admin that lists incoming ride requests.
- A second route in another color, such as a weekend shopping run.
- Keyboard painting with the arrow keys and Space, so the editor works without a mouse.
- Connect a free Firebase project so the schedule saves for everyone.
