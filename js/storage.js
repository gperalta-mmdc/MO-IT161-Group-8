const STORAGE_KEYS = {
  requisitions: "procureit_requisitions",
  purchaseOrders: "procureit_purchaseOrders",
  deliveries: "procureit_deliveries",
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

/* ----- Delivery Receipts ----- */

function getDeliveries() {
  return getRecords(STORAGE_KEYS.deliveries);
}

function saveDeliveries(deliveries) {
  return saveRecords(STORAGE_KEYS.deliveries, deliveries);
}

/* Frees the requisition behind a cancelled PO so a new PO can be made for it. */
function releaseRequisitionFromPo(purchaseOrder) {
  const requisitions = getRequisitions();
  const requisition = requisitions.find((r) => r.poId === purchaseOrder.id);
  if (!requisition) return;
  delete requisition.poId;
  saveRequisitions(requisitions);
}
