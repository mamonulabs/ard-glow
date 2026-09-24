# Porting tinydvco to the ArdCore

How the [yorkmodular/tinydvco](https://github.com/yorkmodular/tinydvco) wavetable oscillator was moved from an ATtiny85 to the ArdCore's ATmega328P. The finished port is `community/user_submitted/AC33_SSQScreecherWT`. This goes through what changed and why, so the same steps can be used for other ATtiny sketches.

---

## 1. What tinydvco does

tinydvco is a wavetable oscillator.

### The phase accumulator

One cycle of a waveform is stored as 256 bytes. A 16-bit counter, the phase accumulator, says where in that cycle we are. Every time a timer interrupt fires, a phase increment is added to it. The top 8 bits pick the sample:

```
Phase accumulator (16-bit):  0x0000 -> 0xFFFF, then wraps
                              ┌──────────────┐
                              │ High 8 bits  │ Low 8 bits
                              │ = table index│ = fraction (ignored)
                              └──────────────┘
```

```cpp
syncPhaseAcc += syncPhaseInc;        // move on
step = syncPhaseAcc >> 8;            // top 8 bits = which of the 256 samples
val = pgm_read_byte(table + step);   // read it
```

A small increment moves through the table slowly and gives a low note. A large one moves quickly and gives a high note. When the 16 bits overflow they wrap to zero and the cycle starts again.

### The timer interrupt

The accumulator is advanced in a timer interrupt, which the hardware calls at a fixed rate whatever `loop()` is doing. Do it in `loop()` instead and the sample rate changes with every `analogRead()`, and so does the pitch.

tinydvco sets Timer0 to CTC (clear timer on compare) mode:

- 16MHz / 8 = a 2MHz tick.
- `OCR0A = 29`: the timer counts 0 to 29, 30 ticks, so the interrupt fires at 66.7kHz.

### PWM output

The ATtiny85 has no DAC. tinydvco runs Timer1 from the chip's 64MHz PLL and writes each sample as a PWM duty cycle:

```cpp
OCR1A = val;  // 0 = 0% duty, 255 = 100%
```

The PWM runs far above audio, and an RC filter on the board smooths it into a voltage.

### Waveforms

A pot on A3 picks the waveform. The reading goes through `oscTable`, a 1024-entry table in flash, to get an index from 0 to 5:

| Index | Waveform | How |
|-------|----------|-----|
| 0 | Sine | table |
| 1 | Triangle | table |
| 2 | Saw | computed: `val = step` |
| 3 | Square | computed: `val = (step < 128) ? 0x00 : 0xff` |
| 4 | Pulse | table |
| 5 | Noise | table, read with a phase offset |

Saw and square come straight from the accumulator, which saves 512 bytes of flash.

### Pitch

The CV on A2 is read in `loop()`. The 10-bit reading indexes `freqTable`, 1024 phase increments in flash, worked out in advance for 1V/oct. The exponential curve lives in the table because `exp()` and `pow()` are far too slow on an 8-bit chip.

### Smoothing the waveform pot

The last four readings are averaged so a noisy pot doesn't flick between waveforms:

```cpp
buffered_vals[buff_step++] = mapOsc(analogRead(WAVE_INPUT));
if (buff_step == BUFF_LENGTH) {         // BUFF_LENGTH = 4
    acc = 0;
    for (int i = 0; i < BUFF_LENGTH; i++) acc += buffered_vals[i];
    current_wavetable = (acc >> BUFF_SHIFT) & 0xff;  // BUFF_SHIFT = 2, divide by 4
    buff_step = 0;
}
```

Four is a power of two, so the divide is a shift.

---

## 2. What's different on the ArdCore

### The chips

| | ATtiny85 (tinydvco) | ATmega328P (ArdCore) |
|---|---|---|
| Clock | 16MHz | 16MHz |
| Flash | 8KB | 32KB |
| SRAM | 512 bytes | 2048 bytes |
| EEPROM | 512 bytes | 1024 bytes |
| Analog inputs | 3 usable | 4 on the panel (6 with the expander) |
| Timers | Timer0 (8-bit), Timer1 (8-bit, PLL) | Timer0 (8-bit), Timer1 (16-bit), Timer2 (8-bit) |
| PLL | 64MHz | none |
| Analog out | PWM only | 8-bit R-2R DAC |
| Other I/O | very little | 2 gate outputs, clock input |

### The DAC

The ArdCore has a resistor-ladder DAC on pins 5 to 12. Write 8 bits and the voltage is there, with no PWM and no filter:

```cpp
// tinydvco (PWM, filtered on the board):
OCR1A = val;

// ArdCore (DAC):
PORTB = (PORTB & B11100000) | (val >> 3);
PORTD = (PORTD & B00011111) | ((val & B00000111) << 5);
```

The wavetables are 8-bit, so they match the DAC exactly.

### Which timer

On the ArdCore, Timer0 runs `millis()` and `delay()`. Take it over the way tinydvco does and those stop working, and the gate outputs use `millis()` to time their triggers. So AC33 uses Timer2: 8-bit like the ATtiny's Timer0, with CTC mode, and not used by anything else on the ArdCore.

### More controls

| ArdCore | tinydvco | AC33 |
|---|---|---|
| A0 knob | pot on A3 | Waveform |
| A1 knob | — | Fine tune (new) |
| A2 knob/jack | CV on A2 | Pitch, 1V/oct |
| A3 knob/jack | — | Phase offset (new) |
| CLK | — | Hard sync (new) |
| D0 | — | A trigger on every cycle (new) |

---

## 3. What changed

### Unchanged

- The phase accumulator: 16 bits, increment from the table, top 8 bits as the index.
- The table format: 256 bytes in flash, read with `pgm_read_byte_near()`.
- `freqTable`: 1024 16-bit increments in flash.
- The shape of the interrupt: pick the waveform, read or compute the sample, send it out.
- The four-reading average on the waveform knob.

### 3.1 The timer

**tinydvco (ATtiny85, Timer0):**

```cpp
TCCR0A = (1 << WGM01);               // CTC mode
TCCR0B = (1 << WGM02) | (2 << CS00); // prescaler 8
TIMSK = 1 << OCIE0A;                  // compare interrupt
OCR0A = 29;                           // 66.7kHz
```

The ATtiny85 has one `TIMSK` for all its timers. The ATmega328P has `TIMSK0`, `TIMSK1` and `TIMSK2`.

**AC33 (ATmega328P, Timer2):**

```cpp
TCCR2A = (1 << WGM21);    // CTC mode
TCCR2B = (1 << CS21);     // prescaler 8, 2MHz tick
OCR2A  = 29;              // 66.67kHz, the same rate as tinydvco
TIMSK2 = (1 << OCIE2A);   // compare interrupt on Timer2
```

Keeping the same rate means `freqTable` and the `>> 1` in the interrupt (3.6) work unchanged.

The interrupt vector changes from:

```cpp
ISR(TIMER0_COMPA_vect) { ... }   // ATtiny85
```

to:

```cpp
ISR(TIMER2_COMPA_vect) { ... }   // ATmega328P
```

### 3.2 PWM out, DAC in

tinydvco's `audioOn()` turns on the PLL and sets Timer1 up for PWM:

```cpp
PLLCSR = 1 << PCKE | 1 << PLLE;    // 64MHz PLL, which the ATmega328P doesn't have
TCCR1 = 1 << PWM1A | 2 << COM1A0 | 1 << CS11;
OCR1A = 128;

// in the interrupt:
OCR1A = val;
```

All of that goes. In its place, pins 5 to 12 are set as outputs in `setup()`, and the interrupt writes the ports:

```cpp
PORTB = (PORTB & B11100000) | (val >> 3);
PORTD = (PORTD & B00011111) | ((val & B00000111) << 5);
```

The PLL only existed to push the PWM carrier above audio. With a DAC there's no carrier, so there's nothing to replace it with.

### 3.3 Pins

**tinydvco:**

```cpp
#define CV_INPUT    A2   // ATtiny pin 3
#define WAVE_INPUT  A3   // ATtiny pin 2
```

**AC33:**

```cpp
// A0 = waveform knob
// A1 = fine tune knob
// A2 = pitch CV (tinydvco's A2 too, though a different physical pin)
// A3 = phase offset
```

### 3.4 The usual ArdCore setup

Every ArdCore sketch sets up the clock input, the gate outputs and the DAC pins:

```cpp
const int clkIn = 2;
const int digPin[2] = {3, 4};
const int pinOffset = 5;

void setup() {
    pinMode(clkIn, INPUT);

    for (int i = 0; i < 2; i++) {
        pinMode(digPin[i], OUTPUT);
        digitalWrite(digPin[i], LOW);
    }

    for (int i = 0; i < 8; i++) {
        pinMode(pinOffset + i, OUTPUT);
        digitalWrite(pinOffset + i, LOW);
    }

    attachInterrupt(0, isr, RISING);   // clock, for hard sync
}
```

### 3.5 volatile

Every variable the interrupt shares with `loop()` is `volatile`: the accumulator, the increment, the current waveform, the phase offset and the cycle flag. Without it the compiler may keep a copy in a register and never see the other side's changes.

### 3.6 The `>> 1`

tinydvco adds half the increment each time:

```cpp
syncPhaseAcc += syncPhaseInc >> 1;
```

That halves every frequency in the table. It's part of how the original sets its range. AC33 runs at the same sample rate and keeps it.

---

## 4. The frequency table

`freqTable` holds 1024 `uint16_t` phase increments in flash. The pitch reading, 0 to 1023, is the index.

The sum:

```
phase_increment = frequency × 65536 / sample_rate
```

65536 is 2^16, one full turn of the accumulator. At 66.67kHz:

- 440Hz: 440 × 65536 / 66667 ≈ 433
- 100Hz: ≈ 98

If you change the sample rate, every entry in the table plays a different note. Halve the rate and everything drops an octave, since each increment is added half as often. You'd then double the table, drop the `>> 1`, or make a new table. AC33 avoids this by keeping 66.67kHz.

---

## 5. Memory

### Flash

| What | Size |
|---|---|
| freqTable | 2048 bytes (1024 × 2) |
| Five wavetables | 1280 bytes (5 × 256) |
| Code | a few KB |

That leaves about 25KB, room for close to a hundred more tables.

### SRAM

The accumulator, increment and flags are about 10 bytes, the waveform average 4 to 8, the usual ArdCore gate variables about 20, plus the stack. A couple of hundred bytes out of 2048. A big buffer, like Dead City Radio's 128 floats, would still fit.

---

## 6. Sample rate

### Choosing one

| OCR2A | Rate | Cycles between interrupts | Nyquist |
|-------|------|---------------------------|---------|
| 29 | 66.7kHz | 240 | 33kHz |
| 39 | 50kHz | 320 | 25kHz |
| 59 | 33.3kHz | 480 | 16.7kHz |
| 79 | 25kHz | 640 | 12.5kHz |

A higher rate gives cleaner high notes and leaves `loop()` less time. AC33 uses 29.

### When the interrupt runs long

If the interrupt hasn't finished when the next one is due, samples are late or missed: wrong pitch, buzzing, crackles, or silence. So the interrupt does one table read and one port write, and everything else, the `analogRead()` calls and the waveform choice, stays in `loop()`.

### Why not faster

At 66.7kHz there are 240 clock cycles per sample. The interrupt uses about 70 of them: getting in and out (~20), the addition (~8), the shift (~8), the flash read (~12), the port write (~8), the waveform switch (~10). An `analogRead()` in `loop()` takes about 1,600 cycles, so six or seven interrupts land in the middle of each one. That's fine as long as each is short.

---

## 7. What the ArdCore adds

### 7.1 Hard sync

CLK sets a flag, and the timer interrupt resets the accumulator:

```cpp
volatile int clkState = LOW;

void isr() {
    clkState = HIGH;
}

ISR(TIMER2_COMPA_vect) {
    if (clkState) {
        clkState = LOW;
        syncPhaseAcc = 0;   // back to the start of the cycle
    }
    syncPhaseAcc += syncPhaseInc >> 1;
    // ... rest of the interrupt
}
```

Checking the flag in the timer interrupt, rather than in `loop()`, means the reset happens within one sample of the clock edge. Patch another oscillator into CLK for the classic sync sound.

The clock interrupt (INT0) has a higher priority than Timer2, so if both are due at once the flag is set first.

### 7.2 Fine tune

A1 adds an offset to the increment:

```cpp
int fineTune = (int)analogRead(1) - 512;            // -512 to +511, noon is 0
int16_t freqWithTune = (int16_t)baseFreq + (fineTune >> 3);  // -64 to +63
syncPhaseInc = (uint16_t)freqWithTune;
```

It adds a fixed amount, not a ratio. At the bottom of the pitch range, where the increments are small, that's a huge swing, from silence up to about an octave above. At the top it's about half a semitone either way.

### 7.3 Cycle trigger on D0

The interrupt spots the accumulator wrapping and sets a flag. `loop()` sees the flag and sends a trigger on D0, switched off after 10ms as usual:

```cpp
uint16_t prevPhase = syncPhaseAcc;
syncPhaseAcc += syncPhaseInc >> 1;
if (syncPhaseAcc < prevPhase) {
    cycleFlag = 1;   // new cycle
}
```

D1 is free.

### 7.4 Phase offset on A3

A3 shifts where in the table each sample is read from:

```cpp
phaseOffset = analogRead(3) >> 2;  // 0-255, in loop()

// in the interrupt:
uint8_t idx = step + phaseOffset;
val = pgm_read_byte_near(tbl + idx);
```

tinydvco only uses a phase offset for its noise waveform. AC33 applies it to every table. Moved slowly it changes the timbre of the stored waves; moved at audio rate it's phase modulation, which sounds much like FM.

### 7.5 Wavetables

AC33's five tables, `sundial9`, `ssq1`, `ssq2`, `ssq3` and `sundial2`, are in `wavetables.h`, 256 bytes each in flash. The `wavetable-converter` in the tinydvco repo's `tools/` folder turns `.wav` and `.256` files into C arrays in the same format.

---

## 8. Things to watch

### 8.1 Timer2's pins

Timer2 also drives PWM on pins 3 and 11. Pin 3 is D0. In CTC mode D0 still works with `digitalWrite()`; just don't `analogWrite()` it.

Pin 11 is DAC bit 6, and on the expander it's also the separate pin-11 output. The expander tutorial's `Setup_timer2()` sets Timer2 up for PWM on pin 11, which can't run alongside AC33's CTC setup. AC33 leaves pin 11 to the DAC.

### 8.2 millis()

Timer0 is untouched, so `millis()` and `delay()` work.

### 8.3 analogRead()

Each read takes about 100μs, with the timer interrupt cutting in six or seven times. The audio doesn't stop; the read just takes a little longer. Four reads per loop gives about 2.5kHz, which is fast enough for knobs. If pitch CV needs to respond faster, read it every pass and the others less often, or speed up the ADC (TUTORIAL.md, section 4).

### 8.4 Aliasing

Harmonics above half the sample rate fold back down as extra, unrelated tones. At 66.7kHz that starts at 33kHz, but the saw and square have harmonics that go that high even on middle notes. tinydvco does the same. The proper fix is band-limited tables, a set per waveform with fewer harmonics for higher notes, which costs flash and more work. Through a filter, the aliasing is usually part of the sound.

---

## 9. Register map

| tinydvco (ATtiny85) | What | AC33 (ATmega328P) | Notes |
|---|---|---|---|
| `PLLCSR` | 64MHz PLL on | removed | no PLL, and no PWM output |
| `TCCR1` | Timer1 PWM | removed | the DAC replaces PWM |
| `OCR1A` (output) | PWM duty | port writes to the DAC | |
| `TCCR0A` | Timer0 mode | `TCCR2A` | `WGM21` for CTC |
| `TCCR0B` | Timer0 prescaler | `TCCR2B` | `CS21` for /8 |
| `OCR0A` | Timer0 compare | `OCR2A` | 29 in both |
| `TIMSK` | interrupt enable (shared) | `TIMSK2` | one per timer on the 328P |
| `OCIE0A` | compare interrupt bit | `OCIE2A` | |
| `ISR(TIMER0_COMPA_vect)` | interrupt vector | `ISR(TIMER2_COMPA_vect)` | |
| `pgm_read_byte_near()` | read flash | `pgm_read_byte_near()` | same on both AVRs |
| `ADCSRA`, `ADMUX` | ADC | `ADCSRA`, `ADMUX` | same registers |

---

## 10. How hard each part was

| Part | Effort | Why |
|---|---|---|
| Phase accumulator | none | same code |
| Wavetables | none | same format in flash |
| Frequency table | none | same table, same sample rate |
| Timer | small | different register names, same idea |
| Output | smaller than the original | DAC instead of PWM, PLL and filter |
| Pins | small | more of them, reassigned |
| ArdCore setup | small | the standard block |
| Hard sync | small | a reset in the interrupt |
| Fine tune | small | an offset on the increment |
| Phase offset | small | already in tinydvco for noise |
| Band-limited tables | large | not done, not in tinydvco either |

Most of the work was renaming timer registers and swapping PWM for the DAC. The oscillator itself didn't change.

---

## 11. Checklist for a port like this

- [ ] Clock input, gate outputs and DAC pins 5-12 all set up in `setup()`
- [ ] A timer other than Timer0, in CTC mode, with a sensible compare value
- [ ] The interrupt vector renamed to match
- [ ] PWM output replaced by DAC port writes
- [ ] PLL and PWM setup removed
- [ ] Tables in `PROGMEM`
- [ ] `analogRead()` channels matched to the ArdCore's A0-A3
- [ ] Clock interrupt added, if the sketch can use sync or a trigger
- [ ] `volatile` on everything shared between the interrupt and `loop()`
- [ ] Trigger switch-off in `loop()`
- [ ] The standard ArdCore header, listing every control
- [ ] `Serial` debugging removed
- [ ] Any shift on the increment matched to the sample rate
- [ ] Listen: pitch follows CV across the range
- [ ] Listen: every waveform plays
- [ ] Listen: knobs move smoothly
- [ ] Listen: sync does what it should
