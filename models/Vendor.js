const mongoose = require("mongoose");

const CATEGORIES = [
  "IT Hardware",
  "IT Peripherals",
  "Office Supplies",
  "Repair & Maintenance Services",
  "Other",
];

const STATUSES = ["Active", "Inactive", "Under Review"];

const vendorSchema = new mongoose.Schema(
  {
    vendorId: { type: String, required: true, unique: true }, // VEN-1001
    name: {
      type: String,
      required: [true, "Vendor name is required."],
      trim: true,
      maxlength: [100, "Vendor name must be 100 characters or fewer."],
    },
    category: {
      type: String,
      required: [true, "Category is required."],
      enum: {
        values: CATEGORIES,
        message: "Category is not a valid option.",
      },
    },
    contactPerson: {
      type: String,
      required: [true, "Contact person is required."],
      trim: true,
      maxlength: [100, "Contact person must be 100 characters or fewer."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email is not valid."],
    },
    phone: { type: String, default: "", trim: true },
    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: [300, "Address must be 300 characters or fewer."],
    },
    tin: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: "Status is not a valid option.",
      },
      default: "Active",
    },
  },
  { timestamps: true },
);

vendorSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret.vendorId;
    delete ret.vendorId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Vendor", vendorSchema);
