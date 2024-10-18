import Threshold from "../Models/Threshold.js";
import DailyWeatherSummary from "../Models/WeatherSummary.js";
import axios from "axios";

let weatherDataArray = [];

const fetchWeatherData = async () => {
  const cities = [
    "delhi",
    "mumbai",
    "chennai",
    "bangalore",
    "kolkata",
    "hyderabad",
  ];
  const apiKey = "d37d5a43bf5f376549f1ad7efefbe030"; // my api key

  weatherDataArray = [];

  const fetchPromises = cities.map(async (city) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
      );
      const data = response.data;

      const tempCelsius = (data.main.temp - 273.15).toFixed(2);
      const feelsLikeCelsius = (data.main.feels_like - 273.15).toFixed(2);
      const weatherCondition = data.weather[0].main;
      const timestamp = data.dt * 1000;
      const date = new Date(timestamp).toISOString().split("T")[0];
      const cityName = data.name;

      weatherDataArray.push({
        date,
        temp: tempCelsius,
        feelsLike: feelsLikeCelsius,
        condition: weatherCondition,
        city: cityName,
      });
    } catch (error) {
      console.error(`Error fetching data for ${city}:`, error);
    }
  });

  await Promise.all(fetchPromises);
  console.log("Weather Data Array:", weatherDataArray);
};

const aggregateWeatherData = async () => {
  const summary = {};
  console.log("Aggregating weather data...");

  weatherDataArray.forEach(({ date, temp, feelsLike, city }) => {
    if (!summary[city]) {
      summary[city] = {
        date,
        totalTemp: 0,
        totalFeelsLike: 0,
        count: 0,
        maxTemp: Number.MIN_VALUE,
        minTemp: Number.MAX_VALUE,
      };
    }

    summary[city].totalTemp += parseFloat(temp);
    summary[city].totalFeelsLike += parseFloat(feelsLike);
    summary[city].count++;
    summary[city].maxTemp = Math.max(summary[city].maxTemp, parseFloat(temp));
    summary[city].minTemp = Math.min(summary[city].minTemp, parseFloat(temp));
  });

  const alerts = [];
  const threshold = await Threshold.findOne();
  const alertThreshold = threshold ? threshold.value : 35;

  for (const city in summary) {
    const { date, totalTemp, totalFeelsLike, count, maxTemp, minTemp } =
      summary[city];
    const averageTemp = totalTemp / count;
    const averageFeelsLike = totalFeelsLike / count;

    console.log(
      `City: ${city}, Date: ${date}, Avg Temp: ${averageTemp}, Max: ${maxTemp}, Min: ${minTemp}`
    );

    if (averageTemp > alertThreshold) {
      alerts.push(
        `ALERT: ${city} has exceeded the temperature threshold: ${averageTemp}°C`
      );
    }

    try {
      await DailyWeatherSummary.findOneAndUpdate(
        { city, date },
        {
          averageTemp,
          maxTemp,
          minTemp,
          feelsLike: averageFeelsLike,
        },
        { new: true, upsert: true }
      );
    } catch (error) {
      console.error("Error saving weather summary:", error);
    }
  }

  console.log("Weather data aggregation completed.");
  return alerts;
};

const weather = async (req, res) => {
  try {
    await fetchWeatherData();
    const alerts = await aggregateWeatherData();
    res.json({ weatherData: weatherDataArray, alerts });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const thresold = async (req, res) => {
  try {
    const threshold = await Threshold.findOne();
    res.json(threshold || { value: 35 });
  } catch (error) {
    console.error("Error fetching threshold:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const postthreshold = async (req, res) => {
  const { value } = req.body;

  if (typeof value !== "number") {
    return res.status(400).json({ message: "Invalid threshold value" });
  }

  try {
    const existingThreshold = await Threshold.findOne();
    if (existingThreshold) {
      existingThreshold.value = value;
      await existingThreshold.save();
    } else {
      await Threshold.create({ value });
    }
    res.json({ message: "Threshold updated successfully" });
  } catch (error) {
    console.error("Error updating threshold:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const dailySummaries = async (req, res) => {
  try {
    console.log("Fetching daily summaries...");
    const summaries = await DailyWeatherSummary.find();
    console.log("Daily summaries fetched:", summaries);
    res.json(summaries);
  } catch (error) {
    console.error("Error fetching daily summaries:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export { weather, thresold, dailySummaries, postthreshold };
