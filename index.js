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

// const WeatherData = mongoose.model(
//   "WeatherData",
//   new mongoose.Schema({
//     date: String,
//     temp: Number,
//     condition: String,
//     city: String,
//     feels_like: Number,
//   })
// );

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

const UserPreferences = mongoose.model(
  "UserPreferences",
  new mongoose.Schema({
    userId: String,
    tempThreshold: Number,
    conditionThreshold: String,
  })
);

let weatherDataArray = [];
let lastWeatherData = {};
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
      const feels_like = (data.main.feels_like - 273.15).toFixed(2);
      const weatherCondition = data.weather[0].main;
      const timestamp = data.dt * 1000;
      const date = new Date(timestamp).toISOString().split("T")[0];
      const cityName = data.name;

      console.log(
        `City: ${city}, Temp: ${tempCelsius}, Condition: ${weatherCondition}, Date: ${date}`
      );

      weatherDataArray.push({
        date,
        temp: tempCelsius,
        condition: weatherCondition,
        city: cityName,
        feels_like,
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

  weatherDataArray.forEach(({ date, temp, condition, city }) => {
    if (!summary[city]) {
      summary[city] = {
        date,
        totalTemp: 0,
        count: 0,
        maxTemp: Number.MIN_VALUE,
        minTemp: Number.MAX_VALUE,
        conditions: {},
      };
    }

    summary[city].totalTemp += parseFloat(temp);
    summary[city].count++;
    summary[city].maxTemp = Math.max(summary[city].maxTemp, parseFloat(temp));
    summary[city].minTemp = Math.min(summary[city].minTemp, parseFloat(temp));
    summary[city].conditions[condition] =
      (summary[city].conditions[condition] || 0) + 1;
  });

  for (const city in summary) {
    const { date, totalTemp, count, maxTemp, minTemp, conditions } =
      summary[city];
    const averageTemp = totalTemp / count;
    const dominantCondition = Object.keys(conditions).reduce((a, b) =>
      conditions[a] > conditions[b] ? a : b
    );

    await DailyWeatherSummary.findOneAndUpdate(
      { city, date },
      { averageTemp, maxTemp, minTemp, dominantCondition },
      { upsert: true, new: true }
    );
  }
};

const checkAlerts = async (weatherData) => {
  for (const data of weatherData) {
    const { temp, city } = data;

    const userPref = await UserPreferences.findOne({ userId: city });
    const tempLimit = userPref ? userPref.tempThreshold : 35;

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

    lastWeatherData[city] = { temp };
  }
};

setInterval(fetchWeatherData, 100000000);

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

app.post("/api/preferences", async (req, res) => {
  const { userId, tempThreshold } = req.body;

  const preferences = await UserPreferences.findOneAndUpdate(
    { userId },
    { tempThreshold },
    { new: true, upsert: true }
  );

  res.json(preferences);
});

app.get("/api/daily-summaries", async (req, res) => {
  try {
    const summaries = await DailyWeatherSummary.find();
    res.json(summaries);
  } catch (error) {
    console.error("Error fetching daily summaries:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
