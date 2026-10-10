const STORAGE_KEYS = {
  requisitions: "procureit_requisitions",
  purchaseOrders: "procureit_purchaseOrders",
  counters: "procureit_counters",
};

/* ----- 1 Storage Configuration and Base Data Helpers ----- */
/* ----- Generic get/save, shared by all three record types ----- */

function getRecords(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Could not read " + storageKey + " from storage:", error);
    return [];
  }
}

function saveRecords(storageKey, records) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error("Could not save " + storageKey + " to storage:", error);
    return false;
  }
}

/* ----- Requisitions ----- */

function getRequisitions() {
  return getRecords(STORAGE_KEYS.requisitions);
}

function saveRequisitions(requisitions) {
  return saveRecords(STORAGE_KEYS.requisitions, requisitions);
}

/* ----- Purchase Orders ----- */

function getPurchaseOrders() {
  return getRecords(STORAGE_KEYS.purchaseOrders);
}

function savePurchaseOrders(purchaseOrders) {
  return saveRecords(STORAGE_KEYS.purchaseOrders, purchaseOrders);
}

/* ----- Delivery Receipts (stored in MongoDB) ----- */

let deliveriesCache = [];

/* Retrieves every saved delivery receipt from the server */
async function loadDeliveries() {
  const response = await fetch("/api/deliveries");
  if (!response.ok) throw new Error("Server responded " + response.status);
  deliveriesCache = await response.json();
  return deliveriesCache;
}

/* The receipts loaded so far (a copy), so the rest of the code keeps working as before */
function getDeliveries() {
  return JSON.parse(JSON.stringify(deliveriesCache));
}

/* Sends one new delivery receipt to the server to be stored; resolves with the saved record */
async function createDelivery(delivery) {
  let response;
  try {
    response = await fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(delivery),
    });
  } catch (error) {
    throw new Error("Cannot reach the server. Is it running?");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Could not save the delivery receipt.");
  }
  return result;
}
/* Frees the requisition behind a cancelled PO so a new PO can be made for it. */
function releaseRequisitionFromPo(purchaseOrder) {
  const requisitions = getRequisitions();
  const requisition = requisitions.find((r) => r.poId === purchaseOrder.id);
  if (!requisition) return;
  delete requisition.poId;
  saveRequisitions(requisitions);
}
