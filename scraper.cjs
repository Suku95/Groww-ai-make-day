const puppeteer = require("puppeteer");

async function scrapeGrowwStock(symbol) {
  const url = `https://groww.in/stocks/${symbol}`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForSelector("h1", { timeout: 5000 });

    const data = await page.evaluate(() => {
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : "N/A";
      };

      const name = getText("h1");
      const statLabels = Array.from(document.querySelectorAll(".security-info .security-info__label"));
      const statValues = Array.from(document.querySelectorAll(".security-info .security-info__value"));

      const stats = {};
      statLabels.forEach((label, i) => {
        const key = label.textContent.trim();
        const value = statValues[i]?.textContent.trim() || "N/A";
        stats[key] = value;
      });

      // 1Y Return
      const perfLabels = Array.from(document.querySelectorAll(".performance-card span"));
      const oneYIdx = perfLabels.findIndex((el) => el.textContent.includes("1Y"));
      const oneYReturn = perfLabels[oneYIdx + 1]?.textContent.trim() || "N/A";

      return {
        name,
        sector: stats["Sector"] || "N/A",
        marketCap: stats["Market Cap"] || "N/A",
        high52: stats["52W High"] || "N/A",
        return1Y: oneYReturn,
      };
    });

    console.log(`✅ ${symbol}:`, data);
    return data;
  } catch (err) {
    console.error(`❌ Failed to scrape ${symbol}:`, err.message);
  } finally {
    await browser.close();
  }
}

// 🔽 Test it
(async () => {
  await scrapeGrowwStock("reliance-industries-ltd");
})();
