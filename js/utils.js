/* ----- 2 ID Generation & Utility Functions ----- */

/* ----- ID generation ----- */

const ID_PREFIXES = {
  requisition: "REQ",
  purchaseOrder: "PO",
  delivery: "DR",
};

function generateId(type) {
  const prefix = ID_PREFIXES[type];

  if (!prefix) {
    console.error('generateId: unknown type "' + type + '"');
    return null;
  }

  let counters;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.counters);
    counters = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Could not read counters from storage:", error);
    counters = {};
  }

  const current = counters[type] || 1000; // first ID will be 1001
  const next = current + 1;
  counters[type] = next;

  try {
    localStorage.setItem(STORAGE_KEYS.counters, JSON.stringify(counters));
  } catch (error) {
    console.error("Could not save counters to storage:", error);
  }

  return prefix + "-" + next;
}

/* Shows what the next ID would be */
function peekNextId(type) {
  const prefix = ID_PREFIXES[type];
  if (!prefix) return "";

  let counters;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.counters);
    counters = raw ? JSON.parse(raw) : {};
  } catch (error) {
    counters = {};
  }

  const current = counters[type] || 1000;
  return prefix + "-" + (current + 1);
}

/* Returns today's date as YYYY-MM-DD */
function getTodayIso() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

/* Formats a number as pesos */
function formatPeso(value) {
  return (
    "₱ " +
    Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
