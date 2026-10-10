const mongoose = require("mongoose");

const CONDITIONS = [
  "Complete & Good Condition",
  "Partial Delivery",
  "Damaged / Defective",
];

const deliverySchema = new mongoose.Schema(
  {
    drNumber: { type: String, required: true, unique: true }, // DR-1001
    poId: {
      type: String,
      required: [true, "Purchase order is required."],
      trim: true,
    },
    dateReceived: {
      type: String,
      required: [true, "Date received is required."],
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        "Date received must look like YYYY-MM-DD.",
      ],
    },
    receivedBy: {
      type: String,
      required: [true, "Received by is required."],
      trim: true,
      maxlength: [100, "Received by must be 100 characters or fewer."],
    },
    condition: {
      type: String,
      required: [true, "Condition of goods is required."],
      enum: {
        values: CONDITIONS,
        message: "Condition of goods is not a valid option.",
      },
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Remarks must be 500 characters or fewer."],
    },
    proofFileName: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

/* use procureit's unique key */
deliverySchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret.drNumber;
    delete ret.drNumber;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Delivery", deliverySchema);
