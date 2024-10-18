import mongoose from "mongoose";

const DailyWeatherSummary = mongoose.model(
  "DailyWeatherSummary",
  new mongoose.Schema({
    city: { type: String, required: true },
    date: { type: String, required: true },
    averageTemp: { type: Number, required: true },
    maxTemp: { type: Number, required: true },
    minTemp: { type: Number, required: true },
    feelsLike: { type: Number, required: true },
    averageHumidity: { type: Number, required: true }, //extra
    averageWindSpeed: { type: Number, required: true }, // extra
    dominantCondition: { type: String, required: true },
  })
);

export default DailyWeatherSummary;
