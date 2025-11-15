// Pines para RGB (usando PWM)
const int RGB_RED_PIN   = 15;  // Rojo
const int RGB_GREEN_PIN = 2;   // Verde
const int RGB_BLUE_PIN  = 4;   // Azul

void setRgb(int r, int g, int b) {
  // Ajusta intensidad con PWM (0-255)
  analogWrite(RGB_RED_PIN, r);
  analogWrite(RGB_GREEN_PIN, g);
  analogWrite(RGB_BLUE_PIN, b);
}

void setup() {
  pinMode(RGB_RED_PIN, OUTPUT);
  pinMode(RGB_GREEN_PIN, OUTPUT);
  pinMode(RGB_BLUE_PIN, OUTPUT);

  setRgb(0, 0, 0);  // Apagar al inicio

  Serial.begin(115200);
}

void handleSerialCommand(String message) {
  message.trim();
  if (message.length() == 0) return;

  if (message.startsWith("RGB")) {
    int spaceIndex = message.indexOf(' ');
    if (spaceIndex > 0) {
      String values = message.substring(spaceIndex + 1);
      int firstComma = values.indexOf(',');
      int secondComma = values.indexOf(',', firstComma + 1);
      if (firstComma > 0 && secondComma > firstComma) {
        int r = values.substring(0, firstComma).toInt();
        int g = values.substring(firstComma + 1, secondComma).toInt();
        int b = values.substring(secondComma + 1).toInt();
        setRgb(r, g, b);
      }
    }
  }
}

void loop() {
  while (Serial.available() > 0) {
    String message = Serial.readStringUntil('\n');
    handleSerialCommand(message);
  }

  yield();
  delay(10);
}

