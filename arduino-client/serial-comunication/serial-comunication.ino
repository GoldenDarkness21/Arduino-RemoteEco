const int PHOTORESISTOR_PIN = 34;  // Cambia a un pin ADC válido para ESP32

void setup() {
  Serial.begin(115200);
  pinMode(PHOTORESISTOR_PIN, INPUT);
}

void loop() {
  int sensorValue = analogRead(PHOTORESISTOR_PIN);
  Serial.print("Fotoresistor value: ");
  Serial.println(sensorValue);
  delay(200);
}

