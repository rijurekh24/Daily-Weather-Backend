# Weather Monitoring App Backend

This is the backend service for a weather application that fetches weather data from the OpenWeatherMap API, aggregates the data, and allows users to set temperature thresholds for alerts. The backend is built using Node.js, Express, and MongoDB.

## Features

- Fetch weather data for multiple cities (Delhi, Mumbai, Chennai, Bangalore, Kolkata, Hyderabad).
- Calculate daily weather summaries, including:
  - Average temperature
  - Maximum temperature
  - Minimum temperature
  - Dominant weather condition
- User-configurable temperature thresholds for alerting.
- Console logging for alerts when temperature thresholds are exceeded.
- Data storage in MongoDB for persistence.

## Prerequisites

- **Node.js**: Version 14 or higher
- **MongoDB**: Either a local instance or a cloud service like MongoDB Atlas
- **OpenWeatherMap API Key**: Sign up for an API key at [OpenWeatherMap](https://openweathermap.org/api).

## Installation

1. **Clone the repository:**
  ``` git clone https://github.com/yourusername/weather-app-backend.git```
   ```cd weather-app-backend```
2.  **Install dependencies:**
     ```npm install```
3. **Set up environment variables:**
     ```DATABASE_URL=mongodb+srv://username:password@cluster0.mongodb.net/Weather?retryWrites=true&w=majority```

4. **Start the server:**
   ```npm start```

5. **Access the API:**
 ```http://localhost:5000/api/weather```

