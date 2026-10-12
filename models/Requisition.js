const mongoose = require("mongoose");

const DEPARTMENTS = [
  "IT",
  "Purchasing",
  "Accounting",
  "Administration",
  "Sales / Marketing",
  "Operations",
  "Facilities",
  "Engineering",
  "Human Resources",
  "Leadership",
];

const STATUSES = ["Pending", "Approved", "Rejected", "Withdrawn", "Cancelled"];

const itemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, "Each item needs a description."],
      trim: true,
      maxlength: [200, "An item description must be 200 characters or fewer."],
    },
    quantity: {
      type: Number,
      required: [true, "Each item needs a quantity."],
      min: [1, "Quantity must be at least 1."],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number.",
      },
    },
    unit: {
      type: String,
      required: [true, "Each item needs a unit."],
      trim: true,
      maxlength: [30, "A unit must be 30 characters or fewer."],
    },
  },
  { _id: false },
);

const requisitionSchema = new mongoose.Schema(
  {
    reqNumber: { type: String, required: true, unique: true }, // REQ-1001
    requestedBy: {
      type: String,
      required: [true, "Requested by is required."],
      trim: true,
      maxlength: [100, "Requested by must be 100 characters or fewer."],
    },
    department: {
      type: String,
      required: [true, "Department is required."],
      enum: {
        values: DEPARTMENTS,
        message: "Department is not a valid option.",
      },
    },
    dateSubmitted: {
      type: String, // kept as YYYY-MM-DD, the same format the date input uses
      required: [true, "Date submitted is required."],
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Date submitted must look like YYYY-MM-DD.",
      ],
    },
    items: {
      type: [itemSchema],
      validate: {
        validator: (items) => items.length >= 1 && items.length <= 5,
        message: "A requisition needs 1 to 5 items.",
      },
    },
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Reason must be 1000 characters or fewer."],
    },
    status: { type: String, enum: STATUSES, default: "Pending" },
    // Filled in when an approver decides
    decidedBy: { type: String, trim: true, maxlength: 100 },
    dateDecided: { type: String },
    remarks: { type: String, trim: true, maxlength: 500 },
    // The purchase order made from this requisition (set once, cleared if the PO is cancelled)
    poId: { type: String, trim: true },
  },
  { timestamps: true },
);

requisitionSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret.reqNumber;
    delete ret.reqNumber;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Requisition", requisitionSchema);
