import mongoose from "mongoose";

const Threshold = mongoose.model(
  "Threshold",
  new mongoose.Schema({
    value: Number,
  })
);

export default Threshold;
