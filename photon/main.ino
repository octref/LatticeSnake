#include <FastLED.h>
FASTLED_USING_NAMESPACE;

#define NUM_LEDS 128

#define DATA_PIN D0
#define DATA_PIN2 D1

CRGB leds[NUM_LEDS];
CRGB leds2[NUM_LEDS];

CRGB snake = CRGB::Blue;
CRGB target = CRGB::Red;
CRGB black = CRGB::Black;
CRGB special = CRGB::Orange;
CRGB extra = CRGB::Purple;

void setup() {
  FastLED.addLeds<WS2812, DATA_PIN>(leds, NUM_LEDS);
  FastLED.addLeds<WS2812, DATA_PIN2>(leds2, NUM_LEDS);

  Serial.begin(9600);
  delay(2000);
  Serial.println("Hi\n");
}

void loop() {
  if (Serial.available()) {
    const char delim = '\n';
    String s = Serial.readStringUntil(delim);

    for (int i = 0; i < 256; i++) {
      char c = s.charAt(i);

      if (i < 128) {
        if (c == '0') {
          leds[i] = black;
        } else if (c == '1') {
          leds[i] = snake;
        } else if (c == '2'){
          leds[i] = target;
        } else if (c == '3') {
          leds[i] = special;
        } else {
          leds[i] = extra;
        }
      } else {
        if (c == '0') {
          leds2[i % 128] = black;
        } else if (c == '1') {
          leds2[i % 128] = snake;
        } else if (c == '2') {
          leds2[i % 128] = target;
        } else if (c == '3') {
          leds2[i % 128] = special;
        } else {
          leds2[i % 128] = extra;
        }
      }
    }

    FastLED.show();

    int hor = analogRead(A0);
    int ver = analogRead(A1);
    int but = analogRead(A2);
    Serial.printf("%d,%d,%d\n", hor, ver, but);
    delay(10);
  }
}
