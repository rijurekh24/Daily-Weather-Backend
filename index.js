import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch(() => {
    console.log("Failed to connect to MongoDB");
  });

const DailyWeatherSummary = mongoose.model(
  "DailyWeatherSummary",
  new mongoose.Schema({
    city: String,
    date: String,
    averageTemp: Number,
    maxTemp: Number,
    minTemp: Number,
    dominantCondition: String,
  })
);

const Threshold = mongoose.model(
  "Threshold",
  new mongoose.Schema({
    value: Number,
  })
);

let weatherDataArray = [];
let alertCounts = {};

const fetchWeatherData = async () => {
  const cities = [
    "delhi",
    "mumbai",
    "chennai",
    "bangalore",
    "kolkata",
    "hyderabad",
  ];
  const apiKey = "d37d5a43bf5f376549f1ad7efefbe030";

  weatherDataArray = [];

  const fetchPromises = cities.map(async (city) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`
      );
      const data = response.data;

      const tempCelsius = (data.main.temp - 273.15).toFixed(2);
      const weatherCondition = data.weather[0].main;
      const timestamp = data.dt * 1000;
      const date = new Date(timestamp).toISOString().split("T")[0];
      const cityName = data.name;

      weatherDataArray.push({
        date,
        temp: tempCelsius,
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

  weatherDataArray.forEach(({ date, temp, city }) => {
    if (!summary[city]) {
      summary[city] = {
        date,
        totalTemp: 0,
        count: 0,
        maxTemp: Number.MIN_VALUE,
        minTemp: Number.MAX_VALUE,
      };
    }

    summary[city].totalTemp += parseFloat(temp);
    summary[city].count++;
    summary[city].maxTemp = Math.max(summary[city].maxTemp, parseFloat(temp));
    summary[city].minTemp = Math.min(summary[city].minTemp, parseFloat(temp));
  });

  for (const city in summary) {
    const { date, totalTemp, count, maxTemp, minTemp } = summary[city];
    const averageTemp = totalTemp / count;

    console.log(
      `City: ${city}, Date: ${date}, Avg Temp: ${averageTemp}, Max: ${maxTemp}, Min: ${minTemp}`
    );

    const today = new Date().toISOString().split("T")[0];

    try {
      if (date === today) {
        await DailyWeatherSummary.findOneAndUpdate(
          { city, date },
          { averageTemp, maxTemp, minTemp },
          { new: true, upsert: true }
        );
      } else {
        await DailyWeatherSummary.create({
          city,
          date,
          averageTemp,
          maxTemp,
          minTemp,
        });
      }
    } catch (error) {
      console.error("Error saving weather summary:", error);
    }
  }

  console.log("Weather data aggregation completed.");
};

const checkAlerts = async (weatherData) => {
  const thresholdDoc = await Threshold.findOne();
  const tempLimit = thresholdDoc ? thresholdDoc.value : 35;

  for (const data of weatherData) {
    const { temp, city } = data;

    if (temp > tempLimit) {
      if (alertCounts[city]) {
        alertCounts[city].count++;
      } else {
        alertCounts[city] = { count: 1 };
      }

      if (alertCounts[city].count >= 2) {
        console.log(
          `ALERT: ${city} has exceeded the temperature threshold: ${temp}°C`
        );
        alertCounts[city].count = 0;
      }
    } else {
      alertCounts[city] = { count: 0 };
    }
  }
};

setInterval(fetchWeatherData, 300000);

app.get("/api/weather", async (req, res) => {
  try {
    await fetchWeatherData();
    await aggregateWeatherData();
    await checkAlerts(weatherDataArray);
    res.json(weatherDataArray);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/api/daily-summaries", async (req, res) => {
  try {
    console.log("Fetching daily summaries...");
    const summaries = await DailyWeatherSummary.find();
    console.log("Daily summaries fetched:", summaries);
    res.json(summaries);
  } catch (error) {
    console.error("Error fetching daily summaries:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/api/threshold", async (req, res) => {
  try {
    const threshold = await Threshold.findOne();
    res.json(threshold || { value: 35 });
  } catch (error) {
    console.error("Error fetching threshold:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/api/threshold", async (req, res) => {
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
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
