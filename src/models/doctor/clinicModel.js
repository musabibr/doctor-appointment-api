const mongoose = require("mongoose");
// Clinic Schema
const clinicSchema = new mongoose.Schema({
    name: { type: String },
    location: { type: String },
  // Add other clinic-related fields as needed
});

const Clinic = mongoose.model("Clinic", clinicSchema);
module.exports = { clinicSchema,Clinic }