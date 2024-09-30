const mongoose = require("mongoose");
const ratingSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
  },
});
const Rating = mongoose.model("Rating", ratingSchema); 

module.exports = { ratingSchema, Rating };
