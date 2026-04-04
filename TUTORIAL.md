# ArdCore Development Tutorial

A complete guide to writing sketches for the SnazzyFX ArdCore eurorack module.
Written for developers who know Arduino basics but are new to the ArdCore hardware.

---

## 1. What Is the ArdCore?

The ArdCore is a eurorack modular synthesizer module built around an **Arduino Nano** (ATmega328P). It exposes the Nano's I/O as patch points on a eurorack panel: knobs, CV jacks, clock input, digital gate/trigger outputs, and an 8-bit DAC output.

You program it exactly like an Arduino — write a `.ino` sketch, upload via USB, and it runs in your rack.

## 2. Hardware Pin Mapping

This is the single most important thing to understand. The Arduino Nano pins are wired to specific panel jacks and knobs. **Every sketch must respect this mapping or risk damaging the hardware.**

### Pin Constants (copy these into every sketch)

```cpp
const int clkIn = 2;           // digital (clock) input jack
const int digPin[2] = {3, 4};  // digital output jacks (D0, D1)
const int pinOffset = 5;       // first DAC pin (pins 5-12 = 8-bit DAC)
```

### What Each Pin Does

| Arduino Pin | ArdCore Function  | Direction | Type        |
|-------------|-------------------|-----------|-------------|
| 2           | Clock In jack     | INPUT     | Digital (interrupt-capable) |
| 3           | Digital Out 0 (D0)| OUTPUT    | Digital gate/trigger |
| 4           | Digital Out 1 (D1)| OUTPUT    | Digital gate/trigger |
| 5-12        | Analog Out (DAC)  | OUTPUT    | 8-bit R-2R DAC (0-5V) |
| A0          | Knob 1            | INPUT     | Analog 0-1023 |
| A1          | Knob 2            | INPUT     | Analog 0-1023 |
| A2          | Analog In 1 jack  | INPUT     | Analog 0-1023 |
| A3          | Analog In 2 jack  | INPUT     | Analog 0-1023 |

### With Output Expander

The output expander breaks out the 8 DAC pins (5-12) as individual gate/trigger outputs. **Important:** when using the expander, the DAC output and the individual bit outputs are the _same physical pins_. Writing a value to the DAC sets all 8 bits, so you can't independently use the DAC and the expander bit outputs at the same time.

The expander also provides:
- **Pin 11** — secondary analog output via `analogWrite(11, value)`. Requires Timer2 setup for DC output (see Section 9).
- **Pin 13** — can be bit-banged for a crude additional output.
- **A4, A5** — two additional analog inputs (bipolar: 0V = 512, -5V = 0, +5V = 1023). The expander knobs attenuate only — they don't provide a fixed voltage like A0/A1.

### Sketch Naming Convention

- **AC** prefix — general ArdCore sketches (use knobs, analog in, DAC out)
- **OX** prefix — sketches specifically for the output expander
- **CP** prefix — compound sketches (multiple sketches selectable at boot)

## 3. The Skeleton: Minimum Viable Sketch

Every ArdCore sketch follows the same structure. Start from this:

```cpp
//  constants related to the Arduino Nano pin use
const int clkIn = 2;           // the digital (clock) input
const int digPin[2] = {3, 4};  // the digital output pins
const int pinOffset = 5;       // the first DAC pin (from 5-12)
const int trigTime = 25;       // trigger duration in ms

//  variables for interrupt handling of the clock input
volatile int clkState = LOW;

//  variables used to control the current DIO output states
int digState[2] = {LOW, LOW};
unsigned long digMilli[2] = {0, 0};

void setup()
{
  // set up the digital (clock) input
  pinMode(clkIn, INPUT);

  // set up the digital outputs
  for (int i = 0; i < 2; i++) {
    pinMode(digPin[i], OUTPUT);
    digitalWrite(digPin[i], LOW);
  }

  // set up the 8-bit DAC output pins
  for (int i = 0; i < 8; i++) {
    pinMode(pinOffset + i, OUTPUT);
    digitalWrite(pinOffset + i, LOW);
  }

  // set up the clock interrupt (Interrupt 0 = pin 2)
  attachInterrupt(0, isr, RISING);
}

void loop()
{
  // --- Your logic here ---

  // Handle trigger/gate turn-off
  for (int i = 0; i < 2; i++) {
    if ((digState[i] == HIGH) && (millis() - digMilli[i] > trigTime)) {
      digState[i] = LOW;
      digitalWrite(digPin[i], LOW);
    }
  }
}

//  =================== convenience routines ===================

void isr()
{
  clkState = HIGH;
}

void dacOutput(byte v)
{
  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}

int deJitter(int v, int test)
{
  if (abs(v - test) > 8) {
    return v;
  }
  return test;
}
```

**Key rules:**
1. Always set up ALL pins in `setup()`, even ones you don't use. Leaving DAC pins floating can cause unpredictable voltages.
2. Always initialize outputs to LOW.
3. The clock interrupt just sets a flag — never do heavy work in the ISR.

## 4. Reading Inputs

### Knobs and CV Jacks

All four analog inputs are read with standard `analogRead()`:

```cpp
int knob1  = analogRead(0);  // Knob 1: 0-1023
int knob2  = analogRead(1);  // Knob 2: 0-1023
int cvIn1  = analogRead(2);  // Analog In jack 1: 0-1023
int cvIn2  = analogRead(3);  // Analog In jack 2: 0-1023
```

The raw range is 0-1023 (10-bit ADC). Common ways to scale it:

```cpp
// Divide into N steps (e.g., 8 steps for a sequencer position)
int step = analogRead(0) >> 7;      // 0-7  (divide by 128)

// Divide into 16 steps
int step = analogRead(0) >> 6;      // 0-15 (divide by 64)

// Divide into 32 steps
int step = (analogRead(0) >> 5) + 1; // 1-33 (for Euclidean rhythms, etc.)

// Use as a boolean threshold
int isHigh = analogRead(3) > 511;   // treat as on/off gate

// Map to a musical range (0-60 for ~5 octaves of semitones)
int note = analogRead(2) >> 4;      // 0-63
```

### De-jittering Analog Inputs

Analog reads are noisy. The ArdCore convention is a `deJitter()` function that ignores small changes:

```cpp
int deJitter(int v, int test)
{
  if (abs(v - test) > 8) {
    return v;       // significant change — accept it
  }
  return test;      // noise — keep old value
}
```

Usage pattern — store the previous value and only update on significant change:

```cpp
int cvValue = 0;  // global: last accepted value

void loop() {
  int raw = analogRead(2);
  cvValue = deJitter(raw, cvValue);  // cvValue only updates on real changes
}
```

**Threshold choices:** Use `> 8` for continuous CV values, `> 2` or `> 3` for values that need higher precision (like quantizers), or omit deJitter entirely for things like gate thresholds (`analogRead(3) > 511`).

### Fast Analog Reads

Standard `analogRead()` is slow (~100μs). For audio-rate sketches (VCOs, noise generators), you may need to speed up the ADC. Two approaches:

**Approach 1: Change the ADC prescaler** (used in AC24_SimpleVCO)

```cpp
// In setup():
sbi(ADCSRA, ADPS2);  // set prescaler to 16 (faster but less accurate)
cbi(ADCSRA, ADPS1);
cbi(ADCSRA, ADPS0);
```

Requires the macros:
```cpp
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))
```

**Approach 2: Direct ADC register reading** (used in the No_analog_read tutorial)

```cpp
// In setup():
ADCSRA = 0;
ADCSRB = 0;
sbi(ADMUX, REFS0);   // set reference voltage
sbi(ADMUX, ADLAR);   // left-align: read 8 bits from ADCH only
sbi(ADMUX, 1);       // select analog pin 2
sbi(ADCSRA, ADPS2);  // prescaler = 32
sbi(ADCSRA, ADPS0);
sbi(ADCSRA, ADATE);  // enable auto-trigger
sbi(ADCSRA, ADEN);   // enable ADC
sbi(ADCSRA, ADSC);   // start measurements

// In loop() — no analogRead() call needed:
int data = ADCH;     // 8-bit result, continuously updated
dacOutput(data);
```

This gives you a continuously-running ADC. To change which pin is being read, manipulate the `ADMUX` register bits.

## 5. Writing Outputs

### The 8-Bit DAC (Analog Out)

The ArdCore's main analog output is an 8-bit R-2R DAC built from pins 5-12. Feed it a value from 0-255:

```cpp
void dacOutput(byte v)
{
  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}
```

**How this works:** Instead of calling `digitalWrite()` 8 times (slow), this writes directly to the port registers. PORTD holds bits 0-2 of the value (on pins 5-7) and PORTB holds bits 3-7 (on pins 8-12). The bitmasks preserve other pins on those ports.

This routine is used in virtually every sketch. It's ~4x faster than the loop-based `digitalWrite` approach. **Always use this version.**

**Voltage mapping:** 0 = 0V, 255 = ~5V. One semitone ≈ 4.25 DAC steps (since 1V/octave × 5V = 60 semitones over 255 steps).

### Digital Outputs (Gates and Triggers)

The two digital outputs (D0 on pin 3, D1 on pin 4) are used for gates and triggers.

**Trigger:** A short pulse (typically 10-25ms). You set it HIGH and use a timer to turn it off:

```cpp
// Fire a trigger on D0
digState[0] = HIGH;
digMilli[0] = millis();
digitalWrite(digPin[0], HIGH);

// Elsewhere in loop(), turn it off after trigTime ms
if ((digState[0] == HIGH) && (millis() - digMilli[0] > trigTime)) {
  digState[0] = LOW;
  digitalWrite(digPin[0], LOW);
}
```

**Gate:** A longer HIGH that stays on while a condition is true:

```cpp
// Gate ON while envelope is active
if (envState != 0) {
  digitalWrite(digPin[0], HIGH);   // gate ON
  digitalWrite(digPin[1], LOW);    // inverse gate OFF
} else {
  digitalWrite(digPin[0], LOW);    // gate OFF
  digitalWrite(digPin[1], HIGH);   // inverse gate ON (end-of-envelope)
}
```

**Variable-length gate:** Some sketches let a knob control gate duration:

```cpp
digTimes[1] = analogRead(1);  // gate time from Knob 2 (0-1023 ms)
```

### Output Expander: Using DAC Pins as Individual Digital Outs

When using the output expander, you can address the 8 DAC pins individually to get 8 gate/trigger outputs:

```cpp
// Using port manipulation (fast):
(i < 5) ? PORTD |= (1 << i+3) : PORTB |= (1 << i-5);   // set HIGH
(i < 5) ? PORTD &= ~(1 << i+3) : PORTB &= ~(1 << i-5); // set LOW

// Or using digitalWrite (simpler but slower):
digitalWrite(pinOffset + i, HIGH);
digitalWrite(pinOffset + i, LOW);
```

**Remember:** You cannot use the DAC and individual bit outputs at the same time — they are the same pins. Choose one approach per sketch.

## 6. Clock Input and Interrupts

The clock input jack is on pin 2, which supports hardware interrupts. This is the standard pattern:

```cpp
volatile int clkState = LOW;

void setup() {
  pinMode(clkIn, INPUT);
  attachInterrupt(0, isr, RISING);  // Interrupt 0 = pin 2
}

void isr()
{
  clkState = HIGH;  // just set the flag — do nothing else!
}

void loop()
{
  if (clkState == HIGH) {
    clkState = LOW;

    // --- Do your clocked work here ---
  }
}
```

**Critical rules:**
1. The ISR must be **fast**. Just set a flag and return. Never call `analogRead()`, `Serial.print()`, or `delay()` inside an ISR.
2. The `clkState` variable must be declared `volatile` because it's modified inside the interrupt.
3. Always reset `clkState = LOW` at the start of your clock-handling block, not at the end.

### Interrupt Modes

Most sketches use `RISING` — trigger on the rising edge of the clock signal. Some sketches use `CHANGE` (triggers on both rising and falling edges) for things like tracking gate state:

```cpp
attachInterrupt(0, isr, CHANGE);

void isr() {
  clkState = !clkState;  // toggles with each edge
}
```

### Internal Clocking

Some sketches generate their own clock using `millis()` timing, with the external clock as an override:

```cpp
unsigned long prevTiming = 0;
int interval = 100;

void loop() {
  int doStep = 0;

  // External clock
  if (clkState == HIGH) {
    clkState = LOW;
    if (interval >= 1270) {     // knob fully CW = external-only mode
      doStep = 1;
    }
  }

  // Internal timer
  if ((interval < 1270) && ((millis() - prevTiming) > interval)) {
    prevTiming = millis();
    doStep = 1;
  }

  if (doStep) {
    // --- advance your sequence, LFO, etc. ---
  }

  // Read speed from knob
  interval = (((1023 - analogRead(0)) >> 4) * 20) + 30;
}
```

## 7. Common Patterns

### Pattern: Note Quantization

Converting a raw 0-1023 analog read into musically useful note values:

```cpp
// Simple: divide into ~64 steps (approximately 0-5V range in semitones)
int quantNote(int v) {
  return v >> 4;  // 0-63
}
```

For precise quantization, use a lookup table that maps ADC values to exact note boundaries:

```cpp
const int qArray[61] = {
  0,   9,   26,  43,  60,  77,  94,  111, 128, 145, 162, 180,
  197, 214, 231, 248, 265, 282, 299, 316, 333, 350, 367, 384,
  401, 418, 435, 452, 469, 486, 503, 521, 538, 555, 572, 589,
  606, 623, 640, 657, 674, 691, 708, 725, 742, 759, 776, 793,
  810, 827, 844, 862, 879, 896, 913, 930, 947, 964, 981, 998,
  1015
};

int vQuant(int v) {
  int tmp = 0;
  for (int i = 0; i < 61; i++) {
    if (v >= qArray[i]) {
      tmp = i;
    }
  }
  return tmp;  // returns 0-60 (semitone number)
}
```

To output a quantized note on the DAC:
```cpp
byte outValue = vQuant(analogRead(2));  // 0-60 semitone
outValue += transpose;                   // add transposition
dacOutput(outValue << 2);               // scale to 0-255 range
```

### Pattern: Clock Division

Count clock ticks and fire on every Nth tick:

```cpp
int clockCount = 0;
int division = 4;  // fire every 4th clock

void loop() {
  if (clkState == HIGH) {
    clkState = LOW;
    clockCount++;

    if (clockCount >= division) {
      clockCount = 0;
      // --- fire trigger ---
      digState[0] = HIGH;
      digMilli[0] = millis();
      digitalWrite(digPin[0], HIGH);
    }
  }

  division = (analogRead(0) >> 6) + 1;  // knob selects 1-16

  // trigger turn-off
  if ((digState[0] == HIGH) && (millis() - digMilli[0] > trigTime)) {
    digState[0] = LOW;
    digitalWrite(digPin[0], LOW);
  }
}
```

### Pattern: Step Sequencer

Store values in an array, advance on clock:

```cpp
int seqValue[8] = {0, 0, 0, 0, 0, 0, 0, 0};
int currStep = 0;
int maxSteps = 8;

void loop() {
  if (clkState == HIGH) {
    clkState = LOW;
    currStep = (currStep + 1) % maxSteps;
    dacOutput(seqValue[currStep]);

    // fire a trigger
    digState[0] = HIGH;
    digMilli[0] = millis();
    digitalWrite(digPin[0], HIGH);
  }

  // Record: use knob2 to select step, knob1 to set value
  int editStep = analogRead(1) >> 7;     // 0-7
  seqValue[editStep] = analogRead(0) >> 2; // 0-255

  // trigger turn-off...
}
```

### Pattern: Envelope Generator (Attack-Decay)

Use a float accumulator with per-loop increment:

```cpp
int envState = 0;       // 0=off, 1=rising, -1=falling
float currValue = 0.0;
float riseValue = 0.0;
float fallValue = 0.0;

void loop() {
  // Trigger starts the envelope
  if (clkState) {
    clkState = 0;
    envState = 1;
  }

  // Accumulate
  if (envState == 1) {
    currValue += riseValue;
  } else if (envState == -1) {
    currValue -= fallValue;
  }

  // Peak transition
  if (currValue > 255.0) {
    currValue = 255.0;
    envState = -1;
  }

  // End transition
  if (currValue < 0.0) {
    currValue = 0.0;
    envState = 0;
  }

  dacOutput((byte)currValue);

  // Read knobs for attack/decay times
  int riseSetting = analogRead(0) + analogRead(2) + 5;
  int fallSetting = analogRead(1) + analogRead(3) + 5;
  riseValue = 255.0 / riseSetting;
  fallValue = 255.0 / fallSetting;
}
```

The `+ 5` prevents division by zero. Rise/fall values represent "DAC steps per loop iteration" — smaller values = slower envelope.

### Pattern: LFO with Waveshaping

A triangle LFO using millisecond-based timing:

```cpp
float currValue = 0.0;
int currDir = 1;          // 1=up, 0=down
unsigned long lastMillis = 0;
float upStep = 1.0;
float downStep = 1.0;

void loop() {
  unsigned long now = millis();
  int elapsed = now - lastMillis;

  if (currDir) {
    currValue += elapsed * upStep;
  } else {
    currValue -= elapsed * downStep;  // downStep is a positive number
  }

  // Wrap around: 0 → 255 → 511 → back to 0
  while (currValue > 511.0) currValue -= 511.0;

  if (currValue > 255.0) {
    currDir = 0;
  } else {
    currDir = 1;
  }

  // Output the triangle
  if (currValue <= 255.0) {
    dacOutput((byte)currValue);
  } else {
    dacOutput((byte)(511.0 - currValue));
  }

  lastMillis = now;

  // Read speed and warp from knobs
  float msPerCycle = ((1023 - analogRead(0)) + 20) * 3.0;
  float warpFactor = ((analogRead(1) >> 4) + 1) / 65.0;
  upStep = 255.0 / (msPerCycle * warpFactor);
  downStep = 255.0 / (msPerCycle * (1.0 - warpFactor));
}
```

### Pattern: Euclidean Rhythm Generator

Distribute N pulses evenly across M steps:

```cpp
int euArray[32];   // the pattern
int steps = 8;     // total steps
int pulses = 3;    // active hits

void euCalc() {
  for (int i = 0; i < 32; i++) euArray[i] = 0;

  if (pulses >= steps) {
    for (int i = 0; i < steps; i++) euArray[i] = 1;
    return;
  }

  int offs = steps - pulses;
  int ppc = offs / pulses;
  int rmd = offs % pulses;

  int loc = 0;
  for (int i = 0; i < pulses; i++) {
    euArray[loc++] = 1;               // place a pulse
    for (int j = 0; j < ppc; j++)
      euArray[loc++] = 0;             // fill gaps
    if (i < rmd)
      euArray[loc++] = 0;             // distribute remainder
  }
}
```

Then on each clock tick:
```cpp
int myPulse = currStep % steps;
if (euArray[myPulse]) {
  // fire trigger
}
currStep++;
```

## 8. Using EEPROM for Persistent Storage

The ATmega328P has 1KB of EEPROM. Use it to save sequences or settings between power cycles:

```cpp
#include <EEPROM.h>

// Use a tag to verify data integrity
void writeEEPROM() {
  EEPROM.write(0, 'A');   // tag bytes
  EEPROM.write(1, 'C');
  EEPROM.write(2, '2');
  EEPROM.write(3, '7');
  EEPROM.write(4, loopMax);

  for (int i = 0; i <= MAXPOS; i++) {
    EEPROM.write(5 + i, recordBuffer[i]);
  }
}

void readEEPROM() {
  if (EEPROM.read(0) != 'A' || EEPROM.read(1) != 'C' ||
      EEPROM.read(2) != '2' || EEPROM.read(3) != '7') {
    // No valid data — initialize to defaults
    loopMax = 0;
    for (int i = 0; i <= MAXPOS; i++) recordBuffer[i] = 0;
    return;
  }

  loopMax = EEPROM.read(4);
  for (int i = 0; i <= MAXPOS; i++) {
    recordBuffer[i] = EEPROM.read(5 + i);
  }
}
```

**EEPROM has limited write cycles (~100,000).** Don't write on every loop iteration. Only write when the user explicitly saves (e.g., when switching from record to play mode).

## 9. Timer Interrupts for Audio Rate

For audio-rate output (noise generators, oscillators), `loop()` is too slow and variable. Use a timer interrupt to get consistent sample output:

```cpp
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))

// Buffer approach: fill in loop(), output in ISR
const int bufferSize = 128;
float noizBuffer[bufferSize];
int bufferPointer = 0;
boolean buffFlag = false;

// Timer1 ISR — outputs samples at a fixed rate
ISR(TIMER1_COMPA_vect) {
  int v = (noizBuffer[bufferPointer] + 1) * 127;

  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);

  bufferPointer++;
  if (bufferPointer >= bufferSize) {
    bufferPointer = 0;
    buffFlag = true;  // signal loop() to refill buffer
  }
}

void interruptSetup() {
  cli();                              // disable interrupts
  TCCR1A = 0;
  TCCR1B = 0;
  OCR1A = 200;                        // compare value (sets pitch)
  TCCR1A |= (1 << WGM10);            // phase & freq correct PWM
  TCCR1B |= (1 << WGM13);
  TCCR1B |= (1 << CS11);             // prescaler = 8
  TIMSK1 |= (1 << OCIE1A);           // enable compare interrupt
  sei();                              // enable interrupts
}
```

Change `OCR1A` at runtime to control pitch. Lower = higher frequency.

### Timer2 Setup for Expander Pin 11 DC Output

Pin 11 uses Timer2 for PWM. The default PWM frequency produces a pulse train, but the expander's RC filter is tuned for audio. To output a clean DC voltage, configure Timer2 for phase-correct PWM at ~31kHz:

```cpp
void Setup_timer2() {
  sbi(TCCR2B, CS20);   // prescaler = 1
  cbi(TCCR2B, CS21);
  cbi(TCCR2B, CS22);
  cbi(TCCR2A, COM2A0);
  sbi(TCCR2A, COM2A1); // clear on compare match
  sbi(TCCR2A, WGM20);  // phase correct PWM
  cbi(TCCR2A, WGM21);
  cbi(TCCR2B, WGM22);
}

// Then use: analogWrite(11, value);  // 0-255
```

## 10. Port Manipulation Reference

Direct port manipulation is much faster than `digitalWrite()`. Here's the mapping:

```
PORTD bits:  7    6    5    4    3    2    1    0
             pin7 pin6 pin5 pin4 pin3 pin2 pin1 pin0
             b2   b1   b0   D1   D0   CLK  TX   RX
             DAC  DAC  DAC  dOut dOut  In   ---  ---

PORTB bits:  5    4    3    2    1    0
             pin13 pin12 pin11 pin10 pin9 pin8
             ---   b7    b6    b5    b4   b3
             ---   DAC   DAC   DAC   DAC  DAC
```

**DDRx** sets direction (1=output, 0=input). **PORTx** sets output value. **PINx** reads input.

The fast DAC routine:
```cpp
PORTB = (PORTB & B11100000) | (v >> 3);    // bits 3-7 of value → PORTB pins 0-4
PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);  // bits 0-2 → PORTD pins 5-7
```

To set up ports directly (instead of `pinMode` loops):
```cpp
DDRD = DDRD | B11111000;  // pins 3-7 as output (preserves 0-2)
DDRB = B111111;           // pins 8-13 as output
PORTD = B00000000;        // all low
PORTB = B000000;          // all low
```

## 11. Memory and Performance Constraints

The ATmega328P has:
- **32KB flash** (program space) — sketches rarely exceed a few KB
- **2KB SRAM** — this is the real constraint
- **1KB EEPROM** — for persistent storage

### SRAM Tips
- Large lookup tables should use `PROGMEM` if they're constant
- Avoid `String` objects — use `char[]`
- Float arrays eat SRAM fast (4 bytes each). A `float[128]` buffer = 512 bytes = 25% of SRAM
- Use `byte` (0-255) instead of `int` (2 bytes) where possible
- `Serial.begin(9600)` itself uses SRAM for buffers. Remove it in production sketches.

### Loop Speed
- `analogRead()` takes ~100μs. Four reads = ~400μs = 2.5kHz effective loop rate
- `dacOutput()` via port manipulation is ~1μs
- `digitalWrite()` is ~5μs per call
- `Serial.print()` is very slow — remove from production code
- For audio-rate work, skip `analogRead()` in most loop iterations or use direct ADC reading

## 12. Debugging

### Serial Monitor

Most sketches include `Serial.begin(9600)` in setup. Use the Arduino IDE's Serial Monitor to print values:

```cpp
Serial.print(analogRead(0));
Serial.print('\t');
Serial.println(analogRead(1));
```

**Remove or comment out `Serial.print()` calls in production.** They slow down the loop significantly and use SRAM.

### The Template Sketch as a Diagnostic

Upload `official/AC01_Template` to verify your hardware:
1. Connect OUT to an oscillator — tune with the A0 knob
2. Patch a clock into CLK — verify D0 LED flashes
3. Turn A1 — verify D1 divides the clock
4. Open Serial Monitor — verify A0-A3 readings change as expected

## 13. Sketch Header Convention

Every sketch should have a descriptive header documenting all I/O usage:

```cpp
//  ============================================================
//
//  Program: ArdCore YourSketchName
//
//  Description: One or two sentences about what this does.
//
//  I/O Usage:
//    Knob 1: What A0 controls
//    Knob 2: What A1 controls
//    Analog In 1: What A2 does
//    Analog In 2: What A3 does
//    Digital Out 1: What D0 outputs
//    Digital Out 2: What D1 outputs
//    Clock In: How external clock is used
//    Analog Out: What the DAC outputs
//
//  Input Expander: how expander inputs are used (or "unused")
//  Output Expander: how expander outputs are used (or "unused")
//
//  Created:  DD MMM YYYY
//  Modified: DD MMM YYYY  description of changes
//
//  ============================================================
```

This header format is consistent across the entire codebase. It's especially important for eurorack use — when you're performing live, you need to know what each knob and jack does at a glance.

## 14. Compound Sketches

A compound sketch packs multiple programs into one `.ino` and selects which one runs based on the A0 knob position at boot time:

```cpp
int sketchVar = -1;

void setup() {
  sketchVar = analogRead(0) >> 8;  // 0-3 from knob position

  // ... standard pin setup ...

  switch (sketchVar) {
    case 0: setup_0(); break;
    case 1: setup_1(); break;
    case 2: setup_2(); break;
    case 3: setup_3(); break;
  }

  attachInterrupt(0, isr, RISING);
}

void loop() {
  switch (sketchVar) {
    case 0: loop_0(); break;
    case 1: loop_1(); break;
    case 2: loop_2(); break;
    case 3: loop_3(); break;
  }
}
```

Each sub-sketch gets its own `setup_N()` and `loop_N()` functions. Global variables are shared but you can prefix them to avoid confusion. This is useful for packing related utilities into a single upload.

## 15. Voltage and Musical Conventions

The eurorack standard uses **1 volt per octave** for pitch CV:

- 0V = lowest note
- 1V = one octave up (12 semitones)
- 5V = five octaves up (60 semitones)

With the 8-bit DAC (0-255 = 0-5V):
- 1 semitone ≈ 4.25 DAC steps (255 / 60)
- 1 octave ≈ 51 DAC steps (255 / 5)
- Octave boundaries: 0, 48, 96, 144, 192, 240

For triggers and gates:
- Trigger: short pulse, typically 10-25ms HIGH
- Gate: sustained HIGH for a musically meaningful duration
- HIGH threshold for input detection: typically `> 511` (half of 1023)

## 16. Quick Reference: Useful Bit-Shift Shortcuts

| Operation | Code | Result |
|-----------|------|--------|
| Divide 0-1023 into 8 steps | `val >> 7` | 0-7 |
| Divide 0-1023 into 16 steps | `val >> 6` | 0-15 |
| Divide 0-1023 into 32 steps | `val >> 5` | 0-31 |
| Divide 0-1023 into 64 steps | `val >> 4` | 0-63 |
| Scale 0-63 to 0-252 (DAC) | `val << 2` | 0-252 |
| Scale 0-1023 to 0-255 (DAC) | `val >> 2` | 0-255 |
| Boolean from analog | `val > 511` | true/false |

## 17. Complete Example: Clocked Random Voltage

A minimal but complete sketch that outputs a new random voltage on each clock tick, with knob-controlled range:

```cpp
//  Program: ArdCore RandomVoltage
//
//  I/O Usage:
//    Knob 1: Output range (0-5V)
//    Knob 2: unused
//    Analog In 1: unused
//    Analog In 2: unused
//    Digital Out 1: Trigger on each new value
//    Digital Out 2: unused
//    Clock In: Advance to next random value
//    Analog Out: Random voltage

const int clkIn = 2;
const int digPin[2] = {3, 4};
const int pinOffset = 5;
const int trigTime = 25;

volatile int clkState = LOW;
int digState = LOW;
unsigned long digMilli = 0;

void setup()
{
  pinMode(clkIn, INPUT);

  for (int i = 0; i < 2; i++) {
    pinMode(digPin[i], OUTPUT);
    digitalWrite(digPin[i], LOW);
  }

  for (int i = 0; i < 8; i++) {
    pinMode(pinOffset + i, OUTPUT);
    digitalWrite(pinOffset + i, LOW);
  }

  attachInterrupt(0, isr, RISING);
}

void loop()
{
  if (clkState == HIGH) {
    clkState = LOW;

    // Generate random value scaled by Knob 1
    int range = analogRead(0) >> 2;       // 0-255
    byte outVal = random(range + 1);      // 0 to range
    dacOutput(outVal);

    // Fire trigger on D0
    digState = HIGH;
    digMilli = millis();
    digitalWrite(digPin[0], HIGH);
  }

  // Trigger turn-off
  if ((digState == HIGH) && (millis() - digMilli > trigTime)) {
    digState = LOW;
    digitalWrite(digPin[0], LOW);
  }
}

void isr()
{
  clkState = HIGH;
}

void dacOutput(byte v)
{
  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}
```
