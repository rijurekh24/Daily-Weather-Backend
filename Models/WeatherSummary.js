import mongoose from "mongoose";
const DailyWeatherSummary = mongoose.model(
  "DailyWeatherSummary",
  new mongoose.Schema({
    city: String,
    date: String,
    averageTemp: Number,
    maxTemp: Number,
    minTemp: Number,
    feelsLike: Number,
    dominantCondition: String,
  })
);

export default DailyWeatherSummary;
