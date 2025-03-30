const express = require('express');
const mqtt = require('mqtt');

const app = express();
const PORT = 3000;

// Constants for focus and break durations
const FOCUS_TIME = 10; // 30 min
const BREAK_TIME = 10;  // 5 min

// Connect to MQTT broker
const mqttClient = mqtt.connect('mqtt://192.168.1.100:1884');

mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
});

// Timer state stored **in memory** (no DB, no JSON)
let timer = {
    timeLeft: FOCUS_TIME,
    mode: 'focus',
    running: false
};

// Function to broadcast timer state via MQTT
function publishTimerState() {
    mqttClient.publish('user/testUser/timer/state', JSON.stringify(timer));
}

// Handle MQTT control messages (start/stop/reset/skip)
mqttClient.on('message', (topic, message) => {
    if (topic === 'user/testUser/timer/control') {
        const command = message.toString();
        if (command === 'start') {
            timer.running = true;
        } else if (command === 'stop') {
            timer.running = false;
        } else if (command === 'reset') {
            timer.timeLeft = timer.mode === 'focus' ? FOCUS_TIME : BREAK_TIME;
        } else if (command === 'skip') {
            timer.mode = timer.mode === 'focus' ? 'break' : 'focus';
            timer.timeLeft = timer.mode === 'focus' ? FOCUS_TIME : BREAK_TIME;
        }
        publishTimerState();
    }
});

// Subscribe to MQTT control topic
mqttClient.subscribe('user/testUser/timer/control');

// Timer logic (runs every second if active)
setInterval(() => {
    if (timer.running && timer.timeLeft > 0) {
        timer.timeLeft -= 1;
        publishTimerState();
    } else if (timer.timeLeft === 0) {
        timer.mode = timer.mode === 'focus' ? 'break' : 'focus';
        timer.timeLeft = timer.mode === 'focus' ? FOCUS_TIME : BREAK_TIME;
        publishTimerState();
    }
}, 1000);

// API endpoint to check timer state
app.get('/timer/testUser', (req, res) => {
    res.json(timer);
});

// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://192.168.1.100:${PORT}`);
});
