import React, { useState, useEffect } from "react";
import mqtt from "mqtt";

// MQTT Broker Settings (Windows Localhost)
const MQTT_BROKER = "ws://192.168.1.100:8081"; // WebSocket MQTT URL
const USER_TOPIC = "user/testUser/timer/state";
const CONTROL_TOPIC = "user/testUser/timer/control";

function App() {
    const [timeLeft, setTimeLeft] = useState(1800);
    const [mode, setMode] = useState("focus");
    const [running, setRunning] = useState(false);
    const [mqttClient, setMqttClient] = useState(null);

    useEffect(() => {
        // ✅ Create a SINGLE MQTT client
        const client = mqtt.connect(MQTT_BROKER);

        client.on("connect", () => {
            console.log("✅ Connected to MQTT broker");
            client.subscribe(USER_TOPIC);
        });

        client.on("message", (topic, message) => {
            if (topic === USER_TOPIC) {
                const timerState = JSON.parse(message.toString());
                setTimeLeft(timerState.timeLeft);
                setMode(timerState.mode);
                setRunning(timerState.running);
            }
        });

        setMqttClient(client);

        return () => {
            console.log("🔌 Disconnecting MQTT client...");
            client.end();
        };
    }, []);

    const sendCommand = (command) => {
        if (mqttClient) {
            console.log(`📢 Sending command: ${command}`);
            mqttClient.publish(CONTROL_TOPIC, command);
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
    };

    return (
        <div style={{ textAlign: "center", padding: "50px", fontFamily: "Arial, sans-serif" }}>
            <h1>Pomodoro Timer</h1>
            <h2 style={{ color: mode === "focus" ? "red" : "green" }}>
                {mode.toUpperCase()} MODE
            </h2>
            <h1>{formatTime(timeLeft)}</h1>
            <div>
                <button onClick={() => sendCommand("start")} disabled={running}>Start</button>
                <button onClick={() => sendCommand("stop")} disabled={!running}>Stop</button>
                <button onClick={() => sendCommand("reset")}>Reset</button>
                <button onClick={() => sendCommand("skip")}>Skip</button>
            </div>
        </div>
    );
}

export default App;
