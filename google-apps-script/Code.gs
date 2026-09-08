/**
 * Alyssa & Liam RSVP backend
 *
 * Bound to: https://docs.google.com/spreadsheets/d/13lVEE0VDzF1BQHq5Rs3sTHFgnUQbaqbo_NEqJnlU2vs/
 *
 * First-time deploy:
 * 1. In the Google Sheet: Extensions → Apps Script
 * 2. Paste this file (replace any default code)
 * 3. Save, then Deploy → New deployment → Type: Web app
 * 4. Execute as: Me
 * 5. Who has access: Anyone
 * 6. Deploy, copy the Web app URL into script.js as WEDDING.rsvpScriptUrl
 *
 * After editing this file later:
 * Deploy → Manage deployments → pencil icon → Version: New version → Deploy
 * Do not create a second web app (that changes the URL).
 */

const SPREADSHEET_ID = "13lVEE0VDzF1BQHq5Rs3sTHFgnUQbaqbo_NEqJnlU2vs";
const SHEET_NAME = "Sheet1";

const COL = {
  last: 1,
  first: 2,
  guests: 3,
  rsvp: 4,
  notes: 5,
  email: 6,
};

const COLOR = {
  nameResponded: "#d9ead3",
  rsvpYes: "#b6d7a8",
  rsvpNo: "#f4cccc",
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "guests";
  let payload;

  try {
    if (action === "guests") {
      payload = { guests: listGuests() };
    } else if (action === "lookup") {
      payload = lookupGuest(
        e && e.parameter ? e.parameter.last : "",
        e && e.parameter ? e.parameter.first : ""
      );
    } else {
      payload = { error: "Unknown action" };
    }
  } catch (err) {
    payload = { error: String(err) };
  }

  return jsonOutput(payload, e);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const data = JSON.parse(body);
    const result = saveRsvp(data);
    return jsonOutput(result, e);
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err) }, e);
  } finally {
    lock.releaseLock();
  }
}

function jsonOutput(payload, e) {
  const text = JSON.stringify(payload);
  const callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + text + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const headers = ["Last Name", "First Name / Names", "Number of Guests", "RSVP", "Notes", "Email"];
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  headers.forEach(function (title, i) {
    if (!String(existing[i] || "").trim()) {
      sheet.getRange(1, i + 1).setValue(title);
    }
  });
}

function listGuests() {
  const sheet = getSheet();
  const lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, COL.last, lastRow - 1, COL.rsvp).getValues();
  const guests = [];

  rows.forEach(function (row) {
    const last = String(row[0] || "").trim();
    const first = String(row[1] || "").trim();
    if (last && first) {
      guests.push({ last: last, first: first, rsvp: rsvpStatus(row[3]) });
    }
  });

  return guests;
}

function lookupGuest(last, first) {
  last = String(last || "").trim();
  first = String(first || "").trim();
  const guests = listGuests();
  for (let i = 0; i < guests.length; i++) {
    if (equalsIgnoreCase(guests[i].last, last) && equalsIgnoreCase(guests[i].first, first)) {
      return { ok: true, rsvp: guests[i].rsvp || "" };
    }
  }
  return { ok: false, rsvp: "" };
}

function rsvpStatus(value) {
  if (value === true || value === 1) return "Yes";
  if (value === false) return "No";
  const text = String(value == null ? "" : value).trim();
  if (!text) return "";
  const lower = text.toLowerCase();
  if (lower === "yes" || lower === "true" || lower === "y") return "Yes";
  if (lower === "no" || lower === "false" || lower === "n") return "No";
  return text;
}

function saveRsvp(data) {
  const last = String(data.last || "").trim();
  const first = String(data.first || "").trim();
  const email = String(data.email || "").trim();
  const attending = String(data.attending || "").trim();
  const notes = String(data.notes || "").trim();

  if (!last || !first || !email || (attending !== "Yes" && attending !== "No")) {
    return { ok: false, error: "Please complete last name, first name, email, and whether you will attend." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const sheet = getSheet();
  const lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow < 2) {
    return { ok: false, error: "That invitation could not be found." };
  }

  const rows = sheet.getRange(2, COL.last, lastRow - 1, 2).getValues();
  let rowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    const rowLast = String(rows[i][0] || "").trim();
    const rowFirst = String(rows[i][1] || "").trim();
    if (equalsIgnoreCase(rowLast, last) && equalsIgnoreCase(rowFirst, first)) {
      rowIndex = i + 2;
      break;
    }
  }

  if (rowIndex < 0) {
    return { ok: false, error: "That invitation could not be found. Please choose a name from the list." };
  }

  const existingRsvp = rsvpStatus(sheet.getRange(rowIndex, COL.rsvp).getValue());
  const overwrite = data.overwrite === true || data.overwrite === "true";

  if (existingRsvp && !overwrite) {
    return {
      ok: false,
      already: true,
      attending: existingRsvp === "No" ? "No" : "Yes",
      error: "An RSVP is already on file for this invitation.",
    };
  }

  const canonicalLast = String(sheet.getRange(rowIndex, COL.last).getValue()).trim();
  const canonicalFirst = String(sheet.getRange(rowIndex, COL.first).getValue()).trim();

  sheet.getRange(rowIndex, COL.rsvp).setValue(attending);
  sheet.getRange(rowIndex, COL.notes).setValue(notes);
  sheet.getRange(rowIndex, COL.email).setValue(email);

  sheet.getRange(rowIndex, COL.last, 1, 2).setBackground(COLOR.nameResponded);
  sheet.getRange(rowIndex, COL.rsvp).setBackground(attending === "Yes" ? COLOR.rsvpYes : COLOR.rsvpNo);

  try {
    sendConfirmation(email, canonicalLast, canonicalFirst, attending, notes);
  } catch (err) {
    return {
      ok: true,
      warning: "Your RSVP was saved, but the confirmation email could not be sent.",
    };
  }

  return { ok: true };
}

function sendConfirmation(email, last, first, attending, notes) {
  const coming = attending === "Yes";
  const subject = coming
    ? "RSVP received — we cannot wait to celebrate with you"
    : "RSVP received — Alyssa & Liam Cahoon";
  const lines = [
    "Dear " + first + " " + last + ",",
    "",
    coming
      ? "Thank you for your RSVP. We are so glad you will be with us on Saturday, June 26, 2027, at the Roger Williams Casino in Providence."
      : "Thank you for letting us know. We will miss you on Saturday, June 26, 2027, and are grateful you took the time to respond.",
    "",
    "Invitation: " + first + " " + last,
    "Response: " + (coming ? "Joyfully accepts" : "Regretfully declines"),
  ];

  if (notes) {
    lines.push("Notes: " + notes);
  }

  lines.push("", "With love,", "Alyssa & Liam Cahoon");

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: lines.join("\n"),
  });
}

function equalsIgnoreCase(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}
