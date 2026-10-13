const mongoose = require("mongoose");

const STATUSES = ["Pending Review", "Approved for Payment", "Rejected"];

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true }, // INV-1001
    vendor: {
      type: String,
      required: [true, "Vendor is required."],
      trim: true,
    },
    poId: {
      type: String,
      required: [true, "Purchase order is required."],
      trim: true,
    },
    deliveryReceipt: { type: String, default: "", trim: true },
    invoiceDate: {
      type: String,
      required: [true, "Invoice date is required."],
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Invoice date must look like YYYY-MM-DD.",
      ],
    },
    amount: {
      type: Number,
      required: [true, "Invoice amount is required."],
      min: [0.01, "Invoice amount must be greater than 0."],
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: "Status is not a valid option.",
      },
      default: "Pending Review",
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Remarks must be 500 characters or fewer."],
    },
    invoiceFileName: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

invoiceSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret.invoiceNumber;
    delete ret.invoiceNumber;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Invoice", invoiceSchema);
