const mongoose = require("mongoose");

const STATUSES = ["Active", "Delivered", "Cancelled"];

const lineSchema = new mongoose.Schema(
  {
    itemNo: {
      type: String,
      default: "",
      trim: true,
      maxlength: [30, "An item number must be 30 characters or fewer."],
    },
    description: {
      type: String,
      required: [true, "Each item needs a description."],
      trim: true,
      maxlength: [200, "An item description must be 200 characters or fewer."],
    },
    quantity: {
      type: Number,
      required: [true, "Each item needs a quantity."],
      validate: {
        validator: (v) => v > 0 && v <= 1000000,
        message: "Quantity must be more than 0 and no more than 1,000,000.",
      },
    },
    unitPrice: {
      type: Number,
      required: [true, "Each item needs a unit price."],
      validate: {
        validator: (v) => v > 0 && v <= 100000000,
        message: "Unit price must be more than 0 and no more than 100,000,000.",
      },
    },
    lineTotal: { type: Number }, // worked out by the server
  },
  { _id: false },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true }, // PO-1001
    requisitionId: {
      type: String,
      required: [true, "A requisition is required."],
      trim: true,
    },
    dateCreated: {
      type: String, // kept as YYYY-MM-DD, the same format the date input uses
      required: [true, "Order date is required."],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Order date must look like YYYY-MM-DD."],
    },
    requisitioner: {
      type: String,
      required: [true, "Requisitioner is required."],
      trim: true,
      maxlength: [100, "Requisitioner must be 100 characters or fewer."],
    },
    department: {
      type: String,
      required: [true, "Department is required."],
      trim: true,
      maxlength: [100, "Department must be 100 characters or fewer."],
    },
    // Not limited to a fixed list, because the vendor list will change as Vendor Management is built
    vendor: {
      type: String,
      required: [true, "Vendor is required."],
      trim: true,
      maxlength: [150, "Vendor must be 150 characters or fewer."],
    },
    shipToName: {
      type: String,
      required: [true, "Ship-to name is required."],
      trim: true,
      maxlength: [150, "Ship-to name must be 150 characters or fewer."],
    },
    shipToAddress: {
      type: String,
      required: [true, "Ship-to address is required."],
      trim: true,
      maxlength: [300, "Ship-to address must be 300 characters or fewer."],
    },
    shipToPhone: {
      type: String,
      default: "",
      trim: true,
      maxlength: [50, "Ship-to phone must be 50 characters or fewer."],
    },
    shipVia: {
      type: String,
      required: [true, "Ship Via is required."],
      trim: true,
      maxlength: [100, "Ship Via must be 100 characters or fewer."],
    },
    fob: {
      type: String,
      required: [true, "F.O.B. is required."],
      trim: true,
      maxlength: [100, "F.O.B. must be 100 characters or fewer."],
    },
    shippingTerms: {
      type: String,
      required: [true, "Shipping terms are required."],
      trim: true,
      maxlength: [100, "Shipping terms must be 100 characters or fewer."],
    },
    expectedDelivery: {
      type: String,
      default: "",
      match: [
        /^(\d{4}-\d{2}-\d{2})?$/,
        "Expected delivery must look like YYYY-MM-DD.",
      ],
    },
    items: {
      type: [lineSchema],
      validate: {
        validator: (items) => items.length >= 1 && items.length <= 5,
        message: "A purchase order needs 1 to 5 items.",
      },
    },
    taxRate: {
      type: Number,
      default: 0,
      validate: {
        validator: (v) => v >= 0 && v <= 100,
        message: "Tax rate must be between 0 and 100.",
      },
    },
    shipping: {
      type: Number,
      default: 0,
      validate: {
        validator: (v) => v >= 0 && v <= 100000000,
        message: "Shipping cannot be negative.",
      },
    },
    // Worked out by the server from the items, tax rate and shipping
    subtotal: { type: Number },
    tax: { type: Number },
    total: { type: Number },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Notes must be 1000 characters or fewer."],
    },
    status: { type: String, enum: STATUSES, default: "Active" },
  },
  { timestamps: true },
);

/* The pages already use `id` (e.g. "PO-1001") and show amounts as text with 2 decimals */
const money = (n) => (Number(n) || 0).toFixed(2);
purchaseOrderSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret.poNumber;
    delete ret.poNumber;
    delete ret._id;
    delete ret.__v;
    ret.subtotal = money(ret.subtotal);
    ret.tax = money(ret.tax);
    ret.shipping = money(ret.shipping);
    ret.total = money(ret.total);
    ret.items = (ret.items || []).map((item) => ({
      ...item,
      lineTotal: money(item.lineTotal),
    }));
    return ret;
  },
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
