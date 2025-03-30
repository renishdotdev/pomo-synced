require("dotenv").config();
const express = require("express");
const mqtt = require("mqtt");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(require("cors")());

const MQTT_BROKER = "mqtt://127.0.0.1:50000";
const SERVER_PORT = 50009;
const DATA_FILE = "timers.json";

// Load existing timers or create an empty file
let timers = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : {};

// MQTT Setup
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on("connect", () => {
  console.log("✅ Connected to MQTT broker");
  mqttClient.subscribe("user/+/timer/control");
});

mqttClient.on("message", (topic, message) => {
  const userID = topic.split("/")[1];
  const command = message.toString();
  if (!timers[userID]) return;

  if (command === "start") startTimer(userID);
  if (command === "stop") pauseTimer(userID);
  if (command === "reset") resetTimer(userID);
});

// Timer Logic
function startTimer(userID) {
  if (timers[userID]?.interval) return; // Already running

  timers[userID] = {
    timeLeft: timers[userID]?.timeLeft || 1800,
    mode: "focus",
    interval: setInterval(() => {
      if (--timers[userID].timeLeft <= 0) switchMode(userID);
      updateTimer(userID);
    }, 1000),
  };
}

function pauseTimer(userID) {
  clearInterval(timers[userID]?.interval);
  timers[userID].interval = null;
  updateTimer(userID);
}

function resetTimer(userID) {
  clearInterval(timers[userID]?.interval);
  timers[userID] = { timeLeft: 1800, mode: "focus" };
  updateTimer(userID);
}

function switchMode(userID) {
  timers[userID].mode = timers[userID].mode === "focus" ? "break" : "focus";
  timers[userID].timeLeft = timers[userID].mode === "focus" ? 1800 : 300;
}

function updateTimer(userID) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(timers, null, 2)); // Save to file
  mqttClient.publish(`user/${userID}/timer/state`, JSON.stringify(timers[userID]));
}

// API Routes
app.get("/timer/:userID", (req, res) => {
  const { userID } = req.params;
  res.json(timers[userID] || { timeLeft: 1800, mode: "focus" });
});

app.post("/timer/:userID/:action", (req, res) => {
  const { userID, action } = req.params;
  mqttClient.publish(`user/${userID}/timer/control`, action);
  res.json({ message: `${action} sent` });
});

// Start Server
app.listen(SERVER_PORT, () => console.log(`✅ Server running on port ${SERVER_PORT}`));
