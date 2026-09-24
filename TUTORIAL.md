# Writing ArdCore Sketches

How to write sketches for the Snazzy FX ArdCore. It assumes you've used an Arduino before and haven't used an ArdCore.

---

## 1. The module

The ArdCore is an Arduino Nano (ATmega328P, 16MHz) behind a eurorack panel. The Nano's pins are wired to two knobs, two knob-and-jack inputs, a clock input, two gate outputs and an 8-bit DAC. You write a `.ino` sketch, upload it over USB, and it runs in the rack.

## 2. Pins

Every sketch in the repo starts with the same three constants:

```cpp
const int clkIn = 2;           // digital (clock) input jack
const int digPin[2] = {3, 4};  // digital output jacks (D0, D1)
const int pinOffset = 5;       // first DAC pin (pins 5-12 = 8-bit DAC)
```

| Arduino pin | Panel      | Direction | Notes |
|-------------|------------|-----------|-------|
| 2           | CLK        | input     | Interrupt 0 |
| 3           | D0         | output    | Gate/trigger, with LED |
| 4           | D1         | output    | Gate/trigger, with LED |
| 5-12        | OUT (DAC)  | output    | 8-bit R-2R DAC. Pin 5 is bit 0, pin 12 is bit 7 |
| A0          | A0 knob    | input     | 0-1023 |
| A1          | A1 knob    | input     | 0-1023 |
| A2          | A2 knob + jack | input | 0-1023, see below |
| A3          | A3 knob + jack | input | 0-1023, see below |

A2 and A3 each have a knob and a jack. With nothing plugged in, the knob sets a voltage from 0 to 5V, so it works like A0 and A1. With a cable in, the knob attenuates the incoming CV. The inputs only read 0 to 5V: anything below 0V reads as 0.

### The output expander

The Snazzy FX expander puts each of the eight DAC pins on its own jack, so you get eight gates. They're the same pins as the DAC. Write a value to the DAC and all eight gates change with it, so a sketch uses one or the other.

The expander also has:

- A second analog output on pin 11, filtered through an RC network. `analogWrite(11, v)` gives a pulse train there; for a steady DC level, set Timer2 up first (section 9). Pin 11 is also DAC bit 6 and expander gate 6, so if you use this output, that bit is gone from the DAC and the gates.
- Pin 13, which can be toggled by hand for a rough extra output.
- A4 and A5, two more inputs. These are bipolar: -5V reads 0, +5V reads 1023, and with nothing plugged in they sit around 522. Their knobs only attenuate. They don't give a fixed voltage the way A0 to A3 do.

The expander tutorial in `community/asct/ASCTard000_tutorials/Ardcore_expander_tutorial/` shows all of this on a scope.

### Names

- **AC**: general sketches (knobs, inputs, DAC).
- **OX**: sketches for the output expander.
- **CP**: compound sketches, several programs in one upload, picked at power-up.

## 3. A minimal sketch

Start from this:

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

Three habits the official sketches all keep:

1. Set every output pin up in `setup()`, including ones you don't use, so nothing floats.
2. Start every output LOW.
3. Keep the interrupt routine to setting a flag. Do the work in `loop()`.

## 4. Reading inputs

### Knobs and jacks

All four are plain `analogRead()`:

```cpp
int knob1  = analogRead(0);  // A0 knob: 0-1023
int knob2  = analogRead(1);  // A1 knob: 0-1023
int cvIn1  = analogRead(2);  // A2 knob/jack: 0-1023
int cvIn2  = analogRead(3);  // A3 knob/jack: 0-1023
```

The reading is 10 bits, 0 to 1023. Shifts are the usual way to scale it:

```cpp
// 8 steps, e.g. a sequencer position
int step = analogRead(0) >> 7;      // 0-7

// 16 steps
int step = analogRead(0) >> 6;      // 0-15

// 32 steps, starting at 1 (Euclidean step counts etc.)
int step = (analogRead(0) >> 5) + 1; // 1-32

// on/off
int isHigh = analogRead(3) > 511;

// 64 rough semitones
int note = analogRead(2) >> 4;      // 0-63
```

### deJitter

Readings wobble by a few counts. The official sketches filter that out with `deJitter()`, which only accepts a new reading if it has moved far enough from the last one:

```cpp
int deJitter(int v, int test)
{
  if (abs(v - test) > 8) {
    return v;       // real change, take it
  }
  return test;      // wobble, keep the old value
}
```

Keep the last accepted value in a global:

```cpp
int cvValue = 0;  // last accepted value

void loop() {
  int raw = analogRead(2);
  cvValue = deJitter(raw, cvValue);
}
```

The official sketches use `> 8` for general CV and `> 2` or `> 3` where they need finer steps, like the quantizers. Gate thresholds (`analogRead(3) > 511`) don't need it.

### Faster reads

`analogRead()` takes about 100μs. For audio-rate sketches that's too slow, and there are two ways round it.

**Lower the ADC prescaler** (AC24_SimpleVCO does this):

```cpp
// In setup():
sbi(ADCSRA, ADPS2);  // prescaler 16
cbi(ADCSRA, ADPS1);
cbi(ADCSRA, ADPS0);
```

with these two macros:

```cpp
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))
```

A read then takes about 13μs. You lose a little accuracy, which doesn't matter when the output is 8 bits.

**Let the ADC run on its own** (`community/asct/ASCTard000_tutorials/No_analog_read`):

```cpp
// In setup():
ADCSRA = 0;
ADCSRB = 0;
sbi(ADMUX, REFS0);   // AVcc reference
sbi(ADMUX, ADLAR);   // left-align, so ADCH holds the top 8 bits
sbi(ADMUX, 1);       // channel 2 (A2)
sbi(ADCSRA, ADPS2);  // prescaler 32
sbi(ADCSRA, ADPS0);
sbi(ADCSRA, ADATE);  // auto-trigger (free running)
sbi(ADCSRA, ADEN);   // enable the ADC
sbi(ADCSRA, ADSC);   // start

// In loop(), no analogRead():
int data = ADCH;     // latest 8-bit reading
dacOutput(data);
```

The ADC keeps converting and `ADCH` always holds the latest result. To read a different pin, change the channel bits in `ADMUX`.

## 5. Outputs

### The DAC

The analog output is an 8-bit R-2R ladder on pins 5 to 12. Send it 0 to 255:

```cpp
void dacOutput(byte v)
{
  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}
```

This writes the port registers directly instead of calling `digitalWrite()` eight times. Bits 0-2 of the value go to PORTD (pins 5-7), bits 3-7 go to PORTB (pins 8-12), and the masks leave the other pins on those ports alone. Alfonso Alba wrote it, and Darwin Grosse switched the official sketches over to it in April 2012. Some of the Snazzy FX sketches still use an older bit-by-bit version, which works but is slower (see ardcore_exploration.md, 11.3).

**Tuning:** the sketches use 4 DAC steps per semitone and 48 per octave, so octaves sit at 0, 48, 96, 144, 192 and 240. The module has a trimmer to make those steps land on 1V/oct. AC01_Template outputs those six octaves on the A0 knob so you can set it.

### Gates and triggers

D0 (pin 3) and D1 (pin 4) are on/off outputs.

A trigger is a short pulse, usually 10 to 25ms. Set the pin high, note the time, and switch it off later in `loop()`:

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

A gate stays high as long as something is true:

```cpp
// Gate high while the envelope is running
if (envState != 0) {
  digitalWrite(digPin[0], HIGH);   // gate on
  digitalWrite(digPin[1], LOW);    // inverse gate off
} else {
  digitalWrite(digPin[0], LOW);    // gate off
  digitalWrite(digPin[1], HIGH);   // inverse gate on
}
```

Some sketches set the gate length from a knob:

```cpp
digTimes[1] = analogRead(1);  // gate time from A1, 0-1023 ms
```

### The expander's eight gates

With the expander, each DAC pin is a gate you can set on its own:

```cpp
// Port writes (fast). i is 0-7; bits 0-2 are on PORTD 5-7, bits 3-7 on PORTB 0-4
(i < 3) ? PORTD |= (1 << (i + 5)) : PORTB |= (1 << (i - 3));   // high
(i < 3) ? PORTD &= ~(1 << (i + 5)) : PORTB &= ~(1 << (i - 3)); // low

// Or digitalWrite (simpler, slower)
digitalWrite(pinOffset + i, HIGH);
digitalWrite(pinOffset + i, LOW);
```

These are the DAC pins, so pick either the DAC or the gates for a given sketch.

## 6. The clock input

CLK is on pin 2, which has a hardware interrupt. The standard pattern:

```cpp
volatile int clkState = LOW;

void setup() {
  pinMode(clkIn, INPUT);
  attachInterrupt(0, isr, RISING);  // interrupt 0 = pin 2
}

void isr()
{
  clkState = HIGH;  // set the flag and leave
}

void loop()
{
  if (clkState == HIGH) {
    clkState = LOW;

    // --- clocked work goes here ---
  }
}
```

- Keep the interrupt routine short. No `analogRead()`, `Serial.print()` or `delay()` in it.
- `clkState` is changed inside the interrupt, so it has to be `volatile`.
- Clear `clkState` at the start of the block, not the end, so a clock that arrives while you're working isn't lost.

### RISING or CHANGE

Most sketches use `RISING`, which fires on the front edge of the clock. `CHANGE` fires on both edges, which is useful for following a gate:

```cpp
attachInterrupt(0, isr, CHANGE);

void isr() {
  clkState = !clkState;  // flips on every edge
}
```

### Internal clock

Some sketches run their own clock off `millis()` and hand over to CLK when the knob is fully clockwise:

```cpp
unsigned long prevTiming = 0;
int interval = 100;

void loop() {
  int doStep = 0;

  // External clock
  if (clkState == HIGH) {
    clkState = LOW;
    if (interval >= 1270) {     // knob fully clockwise = external only
      doStep = 1;
    }
  }

  // Internal clock
  if ((interval < 1270) && ((millis() - prevTiming) > interval)) {
    prevTiming = millis();
    doStep = 1;
  }

  if (doStep) {
    // --- step the sequence, LFO, etc. ---
  }

  // Speed from the A0 knob
  interval = (((1023 - analogRead(0)) >> 4) * 20) + 30;
}
```

## 7. Common patterns

### Quantizing to notes

The quick way is a shift:

```cpp
int quantNote(int v) {
  return v >> 4;  // 0-63
}
```

That gives steps of 16 counts. A semitone on the input is about 17 counts (1023 over 60 semitones), so the steps drift away from the notes as you go up. AC02_Quantizer uses a table of the boundaries instead. Each entry sits half a semitone below a note, so the input rounds to the nearest one:

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
  return tmp;  // 0-60, the semitone number
}
```

Then out to the DAC at 4 steps per semitone:

```cpp
byte outValue = vQuant(analogRead(2));  // 0-60
outValue += transpose;
dacOutput(outValue << 2);               // 0-240
```

### Clock division

Count clocks and fire on every Nth:

```cpp
int clockCount = 0;
int division = 4;  // every 4th clock

void loop() {
  if (clkState == HIGH) {
    clkState = LOW;
    clockCount++;

    if (clockCount >= division) {
      clockCount = 0;
      // fire a trigger
      digState[0] = HIGH;
      digMilli[0] = millis();
      digitalWrite(digPin[0], HIGH);
    }
  }

  division = (analogRead(0) >> 6) + 1;  // 1-16 from the knob

  // trigger turn-off
  if ((digState[0] == HIGH) && (millis() - digMilli[0] > trigTime)) {
    digState[0] = LOW;
    digitalWrite(digPin[0], LOW);
  }
}
```

### Step sequencer

Values in an array, one step per clock:

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

  // Edit: A1 picks the step, A0 sets its value
  int editStep = analogRead(1) >> 7;       // 0-7
  seqValue[editStep] = analogRead(0) >> 2; // 0-255

  // trigger turn-off...
}
```

### Attack-decay envelope

A float that goes up by one amount per loop and down by another (AC25_VCAREnvelope):

```cpp
int envState = 0;       // 0 = off, 1 = rising, -1 = falling
float currValue = 0.0;
float riseValue = 0.0;
float fallValue = 0.0;

void loop() {
  // A clock starts the envelope
  if (clkState) {
    clkState = 0;
    envState = 1;
  }

  if (envState == 1) {
    currValue += riseValue;
  } else if (envState == -1) {
    currValue -= fallValue;
  }

  // Top reached, start falling
  if (currValue > 255.0) {
    currValue = 255.0;
    envState = -1;
  }

  // Bottom reached, stop
  if (currValue < 0.0) {
    currValue = 0.0;
    envState = 0;
  }

  dacOutput((byte)currValue);

  // Attack and decay times, knob plus CV
  int riseSetting = analogRead(0) + analogRead(2) + 5;
  int fallSetting = analogRead(1) + analogRead(3) + 5;
  riseValue = 255.0 / riseSetting;
  fallValue = 255.0 / fallSetting;
}
```

The `+ 5` stops a divide by zero. `riseValue` and `fallValue` are DAC steps per pass through `loop()`, so smaller means slower.

### Shaped LFO

AC19_ShapedLFO counts from 0 to 511 and folds the top half back down, which gives a triangle. The count only ever goes up; it just goes up at one rate in the first half and another in the second, and that's what skews the shape:

```cpp
float currValue = 0.0;
int currDir = 1;          // 1 = first half (rising output), 0 = second half
unsigned long lastMillis = 0;
float upStep = 1.0;
float downStep = 1.0;

void loop() {
  unsigned long now = millis();
  int elapsed = now - lastMillis;

  currDir = (currValue > 255.0) ? 0 : 1;

  if (currDir) {
    currValue += elapsed * upStep;
  } else {
    currValue += elapsed * downStep;
  }

  while (currValue > 511.0) currValue -= 511.0;

  // Fold: 0-255 goes up, 256-511 comes back down
  if (currValue <= 255.0) {
    dacOutput((byte)currValue);
  } else {
    dacOutput((byte)(511.0 - currValue));
  }

  lastMillis = now;

  // Speed on A0, shape on A1
  float msPerCycle = ((1023 - analogRead(0)) + 20) * 3.0;
  float warpFactor = ((analogRead(1) >> 4) + 1) / 65.0;
  upStep = 255.0 / (msPerCycle * warpFactor);
  downStep = 255.0 / (msPerCycle * (1.0 - warpFactor));
}
```

### Euclidean rhythms

Spread N hits over M steps as evenly as possible (AC30_DualEuclidean):

```cpp
int euArray[32];   // the pattern
int steps = 8;     // total steps
int pulses = 3;    // hits

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
    euArray[loc++] = 1;               // a hit
    for (int j = 0; j < ppc; j++)
      euArray[loc++] = 0;             // the gap after it
    if (i < rmd)
      euArray[loc++] = 0;             // one extra gap for the first rmd hits
  }
}
```

Then on each clock:

```cpp
int myPulse = currStep % steps;
if (euArray[myPulse]) {
  // fire a trigger
}
currStep++;
```

## 8. Saving to EEPROM

The ATmega328P has 1KB of EEPROM, which keeps its contents with the power off. AC27_101SEQ saves its sequence there, with a four-byte tag at the start so it can tell its own data from whatever was there before:

```cpp
#include <EEPROM.h>

void writeEEPROM() {
  EEPROM.write(0, 'A');   // tag
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
    // no saved data, use defaults
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

Each EEPROM cell is good for about 100,000 writes. Save when something happens, like switching from record to play, not on every pass through `loop()`.

## 9. Timer interrupts for audio

`loop()` runs at an uneven speed, which you hear as pitch wobble. For audio, output samples from a timer interrupt instead. This is the Dead City Radio setup: `loop()` fills a buffer, and the Timer1 interrupt plays it out:

```cpp
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))

// loop() fills the buffer, the interrupt plays it
const int bufferSize = 128;
float noizBuffer[bufferSize];
int bufferPointer = 0;
boolean buffFlag = false;

// Timer1 interrupt: one sample each time
ISR(TIMER1_COMPA_vect) {
  int v = (noizBuffer[bufferPointer] + 1) * 127;

  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);

  bufferPointer++;
  if (bufferPointer >= bufferSize) {
    bufferPointer = 0;
    buffFlag = true;  // tell loop() to refill
  }
}

void interruptSetup() {
  cli();                              // interrupts off
  TCCR1A = 0;
  TCCR1B = 0;
  OCR1A = 200;                        // compare value, sets the rate
  TCCR1A |= (1 << WGM10);             // phase and frequency correct PWM
  TCCR1B |= (1 << WGM13);
  TCCR1B |= (1 << CS11);              // prescaler 8
  TIMSK1 |= (1 << OCIE1A);            // compare interrupt on
  sei();                              // interrupts on
}
```

Change `OCR1A` while it runs to change the rate. Lower is faster.

Timer0 runs `millis()` and `delay()`, so leave it alone if you need those. AC33 uses Timer2 for its sample clock for that reason.

### Timer2 for a DC level on pin 11

With the expander, `analogWrite(11, v)` gives a PWM pulse train, and the RC filter on that output is tuned for audio. To get a steady voltage out of it, run Timer2 at about 31kHz phase-correct PWM first (from Dan Snazelle, via the expander tutorial):

```cpp
void Setup_timer2() {
  sbi(TCCR2B, CS20);   // prescaler 1
  cbi(TCCR2B, CS21);
  cbi(TCCR2B, CS22);
  cbi(TCCR2A, COM2A0);
  sbi(TCCR2A, COM2A1); // clear on compare match
  sbi(TCCR2A, WGM20);  // phase correct PWM
  cbi(TCCR2A, WGM21);
  cbi(TCCR2B, WGM22);
}

// then: analogWrite(11, value);  // 0-255
```

Remember pin 11 is DAC bit 6. Once it's a PWM output, `dacOutput()` can't set that bit.

## 10. Ports

The pin-to-port map:

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

`DDRx` sets direction (1 = output). `PORTx` sets outputs. `PINx` reads inputs.

The DAC write again:

```cpp
PORTB = (PORTB & B11100000) | (v >> 3);                // value bits 3-7 -> PORTB 0-4
PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);  // value bits 0-2 -> PORTD 5-7
```

Setting the ports up directly instead of with `pinMode` loops:

```cpp
DDRD = DDRD | B11111000;  // pins 3-7 as outputs, 0-2 left alone
DDRB = B111111;           // pins 8-13 as outputs
PORTD = B00000000;        // all low
PORTB = B000000;          // all low
```

## 11. Memory and speed

The ATmega328P has:

- 32KB of flash for the program. Most sketches use a few KB.
- 2KB of SRAM for variables. This is the one that runs out.
- 1KB of EEPROM.

### Saving SRAM

- Put constant tables in flash with `PROGMEM`.
- Use `char[]`, not `String`.
- Floats are 4 bytes. A `float[128]` buffer is 512 bytes, a quarter of the SRAM.
- Use `byte` instead of `int` where 0-255 is enough.
- `Serial` has its own buffers. Take it out when you're done debugging.

### Rough timings

- `analogRead()`: about 100μs. Four of them per loop caps you at about 2.5kHz.
- `dacOutput()` with port writes: about 1μs.
- `digitalWrite()`: about 5μs.
- `Serial.print()`: slow. Take it out when you're done.
- For audio, read the knobs every few passes instead of every pass, or let the ADC free-run (section 4).

## 12. Debugging

### Serial Monitor

About half of the official sketches call `Serial.begin(9600)` in `setup()`. Print values and watch them in the Serial Monitor:

```cpp
Serial.print(analogRead(0));
Serial.print('\t');
Serial.println(analogRead(1));
```

The DATA LEDs on the panel flicker while USB is sending. Comment the prints out when you're done: they slow the loop down and use SRAM.

### AC01_Template as a test

`official/AC01_Template` is the module's test program. Its header lists the steps:

1. Patch OUT into an oscillator's pitch input.
2. With A0 fully down, tune the oscillator.
3. Turn A0 through its six octaves and set the ArdCore's trimmer until they're in tune.
4. Patch a clock into CLK. The D0 LED should flash and D0 should send triggers.
5. Turn A1. D1 should divide the clock, and its LED should follow the jack.
6. Open the Serial Monitor and turn A0 to A3 (or feed A2 and A3 a voltage). Each should read 0 fully anticlockwise and 1023 fully clockwise.

## 13. The header

The official sketches all open with the same header listing every control. Use it: when you pick the module up months later, it tells you what everything does.

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

## 14. Compound sketches

A compound sketch holds several programs and picks one from the A0 knob at power-up (CP01 and CP02):

```cpp
int sketchVar = -1;

void setup() {
  sketchVar = analogRead(0) >> 8;  // 0-3 from the knob

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

Each program has its own `setup_N()` and `loop_N()`. Globals are shared, so give each program's variables a prefix. Set the knob, power up, and you get that program without re-uploading.

## 15. Voltages

Pitch in eurorack is 1V per octave: 0V is the bottom note, 1V is an octave up, 5V is five octaves up.

On the ArdCore:

- 4 DAC steps per semitone, 48 per octave.
- Octaves at 0, 48, 96, 144, 192, 240. The top of the DAC, 255, is a bit over 5 octaves.
- The trimmer sets the scale (section 12).

On the input side, 0-5V reads 0-1023, so a semitone is about 17 counts.

Gates and triggers:

- Trigger: a short high pulse, usually 10-25ms.
- Gate: high for as long as the note or event lasts.
- Reading a gate on an input: `> 511` (about 2.5V) is the usual threshold.

## 16. Shift cheat sheet

| Operation | Code | Result |
|-----------|------|--------|
| 0-1023 into 8 steps | `val >> 7` | 0-7 |
| 0-1023 into 16 steps | `val >> 6` | 0-15 |
| 0-1023 into 32 steps | `val >> 5` | 0-31 |
| 0-1023 into 64 steps | `val >> 4` | 0-63 |
| Semitone 0-60 to DAC | `val << 2` | 0-240 |
| 0-1023 to DAC | `val >> 2` | 0-255 |
| Gate from an input | `val > 511` | true/false |

## 17. A whole sketch: clocked random voltage

A new random voltage on every clock, with A0 setting the range:

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

    // New random value, range set by A0
    int range = analogRead(0) >> 2;       // 0-255
    byte outVal = random(range + 1);      // 0 to range
    dacOutput(outVal);

    // Trigger on D0
    digState = HIGH;
    digMilli = millis();
    digitalWrite(digPin[0], HIGH);
  }

  // Trigger off
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
