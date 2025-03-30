#include <WiFi.h>
#include <PubSubClient.h>

// 🔹 WiFi & MQTT Broker Settings
const char* ssid = "C-604";
const char* password = "abhishekballabh";
const char* mqtt_server = "192.168.1.100";  // Use LAN IP (e.g., "192.168.1.100")
const int mqtt_port = 1884;

// 🔹 MQTT Client
WiFiClient espClient;
PubSubClient client(espClient);

// 🔹 Button Pin Definitions (Active LOW)
#define START_BUTTON  5   // GPIO5
#define STOP_BUTTON   18  // GPIO18
#define RESET_BUTTON  19  // GPIO19
#define SKIP_BUTTON   21  // GPIO21

// 🔹 MQTT Topics
#define CONTROL_TOPIC "user/testUser/timer/control"
#define STATE_TOPIC   "user/testUser/timer/state"  // New: Timer updates

void setup() {
    Serial.begin(115200);
    
    // 🔹 Set Button Pins as INPUT_PULLUP (Active LOW)
    pinMode(START_BUTTON, INPUT_PULLUP);
    pinMode(STOP_BUTTON, INPUT_PULLUP);
    pinMode(RESET_BUTTON, INPUT_PULLUP);
    pinMode(SKIP_BUTTON, INPUT_PULLUP);

    // 🔹 Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi...");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\n✅ WiFi Connected");

    // 🔹 Connect to MQTT Broker
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback); // New: Handle incoming MQTT messages
    reconnect();
}

void loop() {
    if (!client.connected()) {
        reconnect();
    }
    client.loop();

    // 🔹 Check Button Presses (Active LOW)
    if (digitalRead(START_BUTTON) == LOW) {
        sendCommand("start");
        delay(500); // Debounce delay
    }
    if (digitalRead(STOP_BUTTON) == LOW) {
        sendCommand("stop");
        delay(500);
    }
    if (digitalRead(RESET_BUTTON) == LOW) {
        sendCommand("reset");
        delay(500);
    }
    if (digitalRead(SKIP_BUTTON) == LOW) {
        sendCommand("skip");
        delay(500);
    }
}

// 🔹 MQTT Message Handler (New)
void callback(char* topic, byte* payload, unsigned int length) {
    Serial.print("📩 MQTT Message on Topic: ");
    Serial.println(topic);

    String message;
    for (unsigned int i = 0; i < length; i++) {
        message += (char)payload[i];
    }

    Serial.println("⏳ Timer State: " + message);
}

// 🔹 Send MQTT Command
void sendCommand(const char* command) {
    Serial.print("📤 Sending MQTT Command: ");
    Serial.println(command);
    client.publish(CONTROL_TOPIC, command);
}

// 🔹 MQTT Reconnect Logic
void reconnect() {
    while (!client.connected()) {
        Serial.print("🔄 Connecting to MQTT...");
        if (client.connect("ESP32_Client")) {
            Serial.println("\n✅ Connected to MQTT!");
            client.subscribe(STATE_TOPIC);  // New: Subscribe to Timer Updates
        } else {
            Serial.print("❌ Failed, rc=");
            Serial.print(client.state());
            Serial.println(" Retrying in 5 seconds...");
            delay(5000);
        }
    }
}
