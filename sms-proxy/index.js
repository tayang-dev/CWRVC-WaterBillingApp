const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SMS_GATEWAY_URL = "http://192.168.1.13:8082/";
const SMS_GATEWAY_TOKEN = "623b461d-aae4-4d01-ad6d-3dc62fab2757";

app.post("/api/sms", async (req, res) => {
  try {
    const response = await fetch(SMS_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SMS_GATEWAY_TOKEN}`,
      },
      body: JSON.stringify(req.body),
    });

    // Try to parse JSON, fallback to text if it fails
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    res.status(response.status).send(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`SMS Proxy server running at http://localhost:${PORT}`);
});