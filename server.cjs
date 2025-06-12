const https = require("https");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 4000;

app.use(cors());

const ALPHA_KEY = "YOUR_ALPHA_VANTAGE_KEY";
const symbols = ["AAPL", "MSFT"];

// fetch fundamentals
function fetchOverview(symbol) {
  return new Promise((res) => {
    https
      .get(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_KEY}`,
        (r) => {
          let d = "";
          r.on("data", (c) => (d += c));
          r.on("end", () => res(JSON.parse(d)));
        }
      )
      .on("error", () => res(null));
  });
}

// fetch time series for returns
function fetchDaily(symbol) {
  return new Promise((res) => {
    https
      .get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${ALPHA_KEY}`,
        (r) => {
          let d = "";
          r.on("data", (c) => (d += c));
          r.on("end", () => res(JSON.parse(d)));
        }
      )
      .on("error", () => res(null));
  });
}

// calculate 1-year return
function calcReturn(timeSeries) {
  const data = timeSeries["Time Series (Daily)"];
  if (!data) return null;

  const dates = Object.keys(data).sort((a, b) => new Date(b) - new Date(a));
  const latest = parseFloat(data[dates[0]]["5. adjusted close"]);
  const yearAgoDate = dates.find((d) => new Date(d) <= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
  const yearAgo = parseFloat(data[yearAgoDate]["5. adjusted close"]);
  return ((latest - yearAgo) / yearAgo) * 100;
}

app.get("/stocks", async (req, res) => {
  const results = [];

  for (let symbol of symbols) {
    console.log(`🔄 Fetching ${symbol}...`);

    const [info, daily] = await Promise.all([
      fetchOverview(symbol),
      fetchDaily(symbol),
    ]);

    console.log(`📄 Overview: ${JSON.stringify(info).slice(0, 100)}...`);
    console.log(`📈 Daily Keys: ${daily ? Object.keys(daily).slice(0, 2).join(", ") : "No data"}`);

    if (!info || !daily || !daily["Time Series (Daily)"]) {
      console.log(`⚠️ Skipping ${symbol} — missing data`);
      continue;
    }

    results.push({
      symbol,
      name: info.Name || symbol,
      sector: info.Sector || "Unknown",
      marketCap: parseFloat(info.MarketCapitalization) || null,
      peRatio: parseFloat(info.PERatio) || null,
      price: parseFloat(daily["Time Series (Daily)"][Object.keys(daily["Time Series (Daily)"])[0]]["4. close"]) || null,
      oneYearReturn: calcReturn(daily) || null,
    });
  }

  console.log(`✅ Final results: ${results.length} stocks`);
  res.json(results);
});


app.listen(PORT, () => console.log(`fireeee AlphaV Stock API @ http://localhost:${PORT}/stocks`));
