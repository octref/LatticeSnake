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
        } else {
          leds[i] = target;
        }
      } else {
        if (c == '0') {
          leds2[i % 128] = black;
        } else if (c == '1') {
          leds2[i % 128] = snake;
        } else {
          leds2[i % 128] = target;
        }
      }

    }

    FastLED.show();

    int hor = analogRead(A0);
    int ver = analogRead(A1);
    int spa = analogRead(A2);
    Serial.printf("%d,%d,%d\n", hor, ver, spa);
    delay(10);
  }
}
