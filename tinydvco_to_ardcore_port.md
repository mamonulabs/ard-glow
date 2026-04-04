# Porting tinydvco to ArdCore: Complete Guide

This document covers everything you need to know to port the [yorkmodular/tinydvco](https://github.com/yorkmodular/tinydvco) wavetable oscillator from the ATtiny85 to the ArdCore (ATmega328P). It's written so you can understand *why* each change is needed, not just *what* to change.

---

## 1. What tinydvco Actually Does

At its core, tinydvco is a **wavetable oscillator**. Here's how that works:

### The Phase Accumulator

Imagine a record player. The groove is a single cycle of a waveform stored in memory (256 bytes). The needle position is a counter called the **phase accumulator**. Every time the timer interrupt fires, you advance the needle by a fixed amount (the **phase increment**). The bigger the increment, the faster you go through the waveform, and the higher the pitch.

```
Phase Accumulator (16-bit):  0x0000 → 0xFFFF, wraps around
                              ┌──────────────┐
                              │ High 8 bits  │ Low 8 bits
                              │ = table index│ = fractional part (ignored)
                              └──────────────┘
```

In code:
```cpp
syncPhaseAcc += syncPhaseInc;    // advance the needle
step = syncPhaseAcc >> 8;        // top 8 bits = which of 256 entries to read
val = pgm_read_byte(table + step); // look up the waveform value
```

The phase increment (`syncPhaseInc`) determines frequency. A small increment means you crawl through the table slowly (low pitch). A large increment means you jump through it quickly (high pitch). Because the accumulator is 16-bit and wraps around automatically, the waveform repeats cleanly.

### The Timer ISR

The phase accumulator is advanced inside a **timer interrupt service routine (ISR)** — a function that the hardware calls at a fixed rate, regardless of what `loop()` is doing. This gives you a constant sample rate. If you advanced the accumulator in `loop()`, the sample rate would wobble depending on how long each loop iteration takes, and you'd get terrible pitch stability.

tinydvco configures Timer0 in CTC (Clear Timer on Compare) mode:
- 16MHz clock / 8 prescaler = 2MHz timer tick rate
- Compare value of 29 → ISR fires every 30 ticks → **66.7kHz sample rate**

The actual line: `OCR0A = 29` (the compare register counts from 0, so 29 = 30 ticks).

### The PWM Output

The ATtiny85 has no DAC. Instead, tinydvco uses Timer1 in PWM mode, fed by the chip's internal **64MHz PLL** (Phase-Locked Loop). It writes the 8-bit sample value directly to the PWM duty cycle register:

```cpp
OCR1A = val;  // 0 = 0% duty, 255 = 100% duty
```

At 64MHz / 2 (prescaler) = 32MHz PWM frequency, which is way above audio range. An external RC low-pass filter smooths the PWM into an analog voltage. This is the ATtiny's only option for analog output — it has no DAC hardware.

### The Waveform Selection

A potentiometer on A3 selects which waveform to output. The raw ADC reading is mapped through `oscTable` (a 1024-entry lookup in PROGMEM) to a waveform index 0-5:

| Index | Waveform | Method |
|-------|----------|--------|
| 0 | Sine | 256-byte wavetable lookup |
| 1 | Triangle | 256-byte wavetable lookup |
| 2 | Sawtooth | Generated: `val = step` (phase top byte IS the saw) |
| 3 | Square | Generated: `val = (step < 128) ? 0x00 : 0xff` |
| 4 | Pulse | 256-byte wavetable lookup |
| 5 | Noise | 256-byte wavetable lookup with phase offset twist |

Saw and square don't need lookup tables — they can be computed directly from the phase accumulator step. This saves 512 bytes of flash.

### The Pitch CV

A voltage on A2 (the CV input jack) is read by `analogRead()` in `loop()`. The 10-bit ADC value (0-1023) indexes into `freqTable`, a 1024-entry PROGMEM table of 16-bit phase increments. This table is pre-calculated to give a response close to **1 volt per octave** — the eurorack pitch standard.

The base frequency at the bottom of the table is ~30Hz. The top of the table gives ~2kHz. The exponential relationship (each volt doubles the frequency) is baked into the table values rather than computed at runtime, because `exp()` and `pow()` are far too slow for real-time use on an 8-bit micro.

### Waveform Selection Smoothing

To avoid jittery waveform switching from a noisy pot, the last 4 readings are averaged:

```cpp
buffered_vals[buff_step++] = mapOsc(analogRead(WAVE_INPUT));
if (buff_step == BUFF_LENGTH) {         // BUFF_LENGTH = 4
    acc = 0;
    for (int i = 0; i < BUFF_LENGTH; i++) acc += buffered_vals[i];
    current_wavetable = (acc >> BUFF_SHIFT) & 0xff;  // BUFF_SHIFT = 2 (divide by 4)
    buff_step = 0;
}
```

The buffer length is a power of two so the division can be a fast bit-shift instead of an actual division instruction.

---

## 2. What the ArdCore Has That's Different

### The Chips

| | ATtiny85 (tinydvco) | ATmega328P (ArdCore) |
|---|---|---|
| Clock speed | 16MHz | 16MHz |
| Flash (program) | 8KB | **32KB** |
| SRAM (variables) | 512 bytes | **2048 bytes** |
| EEPROM | 512 bytes | **1024 bytes** |
| ADC channels | 3 usable | **6+** (4 used on base ArdCore) |
| Timers | Timer0 (8-bit), Timer1 (8-bit, PLL) | Timer0 (8-bit), Timer1 (16-bit), **Timer2 (8-bit)** |
| PLL | Yes (64MHz) | **No** |
| DAC | None (PWM only) | **8-bit R-2R ladder** |
| Digital I/O | Very limited | 2 digital outputs + clock input |

### The R-2R DAC: Why It's Better Here

The ArdCore has a hardware R-2R resistor-ladder DAC built from Arduino pins 5-12. You write an 8-bit value and get a proportional analog voltage instantly — no PWM, no filtering, no PLL needed.

```cpp
// tinydvco output (PWM, needs RC filter):
OCR1A = val;

// ArdCore output (true DAC, clean voltage):
PORTB = (PORTB & B11100000) | (val >> 3);
PORTD = (PORTD & B00011111) | ((val & B00000111) << 5);
```

The R-2R DAC is actually an upgrade over PWM. You get a cleaner signal with no filter design worries. The trade-off is that the R-2R resolution is fixed at 8 bits (matching tinydvco's 8-bit wavetable values exactly), and the settling time depends on the resistor values — but for audio this is not an issue.

### Timer Availability

This matters because the ArdCore's Arduino runtime uses Timer0 for `millis()` and `delay()`. If you reconfigure Timer0 like tinydvco does, those functions stop working. You have two choices:

1. **Use Timer2 for the sample ISR** (recommended) — leaves Timer0 alone, `millis()` keeps working, you can still use `delay()` for trigger timing in loop.
2. **Take over Timer0 anyway** — saves Timer2 but breaks `millis()`. You'd need to track time yourself. The Dead City Radio sketch in the repo already does this — it takes Timer1 — so there's precedent.

We'll use Timer2. It's 8-bit (like ATtiny's Timer0), supports CTC mode, and is otherwise unused by the ArdCore.

### More Inputs

The ArdCore gives us 4 analog inputs instead of 2:

| ArdCore Input | tinydvco Equivalent | Port Opportunity |
|---|---|---|
| A0 (Knob 1) | — | Waveform select (was A3) |
| A1 (Knob 2) | — | **New:** Fine-tune / detune |
| A2 (CV In 1) | A2 (CV Input) | Pitch CV (same role) |
| A3 (CV In 2) | — | **New:** Phase modulation, FM, or second V/Oct |

Plus the clock input (pin 2 with hardware interrupt), which tinydvco doesn't use at all. This opens up **hard sync** — a classic analogue synthesis feature where an external clock resets the phase accumulator to zero, creating harmonically related timbres.

---

## 3. What Needs to Change (and What Doesn't)

### Things That Stay the Same

- **The phase accumulator algorithm** — identical. 16-bit accumulator, phase increment from table, top 8 bits as wavetable index.
- **The wavetables** — identical. 256-byte PROGMEM arrays, `pgm_read_byte_near()` to read them.
- **The frequency lookup table** — identical. 1024-entry PROGMEM table of 16-bit phase increments.
- **The ISR structure** — same concept: switch on waveform type, look up or compute sample, output it. Only the output line and the ISR vector name change.
- **The waveform selection smoothing** — identical buffer-average approach.

### Things That Must Change

#### 3.1 Timer Setup (biggest change)

**tinydvco (ATtiny85 Timer0):**
```cpp
TCCR0A = (1 << WGM01);               // CTC mode
TCCR0B = (1 << WGM02) | (2 << CS00); // /8 prescaler
TIMSK = 1 << OCIE0A;                  // compare match interrupt
OCR0A = 29;                           // → 66.7kHz
```

Note: The ATtiny85 has a single `TIMSK` register for all timers. The ATmega328P has separate `TIMSK0`, `TIMSK1`, `TIMSK2`.

**ArdCore (ATmega328P Timer2):**
```cpp
TCCR2A = (1 << WGM21);    // CTC mode
TCCR2B = (1 << CS21);     // /8 prescaler (16MHz / 8 = 2MHz tick)
OCR2A = 59;                // 2MHz / 60 = 33.3kHz sample rate
TIMSK2 = (1 << OCIE2A);   // compare match interrupt on Timer2
```

**Why OCR2A = 59 instead of 29?** You *could* use 29 for 66.7kHz, but that's aggressive on the ATmega328P. At 66.7kHz, the ISR fires every ~240 clock cycles. Our ISR needs to do a PROGMEM lookup and an 8-bit port write — feasible but tight, especially if `loop()` is doing `analogRead()` calls. 33.3kHz gives ~480 cycles between interrupts — much more comfortable, and 33kHz is still well above the Nyquist limit for anything up to ~16kHz.

You can experiment with the value. Lower OCR2A = higher sample rate = better high-frequency response but less time for `loop()`.

The ISR vector changes from:
```cpp
ISR(TIMER0_COMPA_vect) { ... }   // ATtiny85
```
to:
```cpp
ISR(TIMER2_COMPA_vect) { ... }   // ATmega328P
```

#### 3.2 PWM Output → DAC Output

**tinydvco** writes a PWM duty cycle:
```cpp
// In audioOn():
PLLCSR = 1 << PCKE | 1 << PLLE;    // enable 64MHz PLL — does NOT exist on ATmega328P
TCCR1 = 1 << PWM1A | 2 << COM1A0 | 1 << CS11;
OCR1A = 128;

// In ISR:
OCR1A = val;
```

**ArdCore** writes directly to the R-2R DAC:
```cpp
// In ISR:
PORTB = (PORTB & B11100000) | (val >> 3);
PORTD = (PORTD & B00011111) | ((val & B00000111) << 5);
```

The entire `audioOn()` PLL/Timer1 setup is **deleted** and replaced with the standard ArdCore pin setup (setting pins 5-12 as outputs). The DAC output is faster and cleaner — this is a simplification, not a complication.

#### 3.3 Pin Mapping

**tinydvco:**
```cpp
#define CV_INPUT    A2   // ATtiny pin 3
#define WAVE_INPUT  A3   // ATtiny pin 2
```

**ArdCore:**
```cpp
// A0 = Knob 1 (waveform select — panel knob instead of pot)
// A1 = Knob 2 (fine-tune — new feature!)
// A2 = Analog In 1 jack (pitch CV — same role as tinydvco A2)
// A3 = Analog In 2 jack (available for FM/sync threshold/etc.)
```

The `analogRead()` pin numbers happen to match for CV input (both are A2), which is a nice coincidence but for completely different physical pins.

#### 3.4 The PLL Removal

The ATtiny85's `PLLCSR` register enables a 64MHz PLL that feeds Timer1 for high-frequency PWM. The ATmega328P **does not have this PLL**. This is the single biggest hardware difference. But it doesn't matter because:

1. We're not using PWM for output — we have the R-2R DAC.
2. The PLL was only needed to make PWM fast enough that the carrier frequency was above audio range. The DAC has no carrier frequency.

All `PLLCSR` and `TCCR1` references are simply deleted.

#### 3.5 Standard ArdCore Setup Boilerplate

The ArdCore requires specific pin initialization. Every sketch must do this:

```cpp
const int clkIn = 2;
const int digPin[2] = {3, 4};
const int pinOffset = 5;

void setup() {
    // Clock input
    pinMode(clkIn, INPUT);

    // Digital outputs
    for (int i = 0; i < 2; i++) {
        pinMode(digPin[i], OUTPUT);
        digitalWrite(digPin[i], LOW);
    }

    // DAC output pins 5-12
    for (int i = 0; i < 8; i++) {
        pinMode(pinOffset + i, OUTPUT);
        digitalWrite(pinOffset + i, LOW);
    }

    // Clock interrupt (for hard sync)
    attachInterrupt(0, isr, RISING);
}
```

tinydvco has no equivalent because the ATtiny85 has so few pins there's nothing else to configure.

---

## 4. The Frequency Table

The `freqTable` is a 1024-entry array of `uint16_t` values stored in PROGMEM. Each entry is a phase increment value. The ADC reads 0-1023, and that value directly indexes the table.

### How frequency relates to phase increment

The math is:
```
phase_increment = (desired_frequency × 65536) / sample_rate
```

Where 65536 = 2^16 (the phase accumulator range). For example, at a 33.3kHz sample rate:
- 440Hz (A4): increment = 440 × 65536 / 33333 ≈ 865
- 30Hz (low bass): increment = 30 × 65536 / 33333 ≈ 59
- 2000Hz: increment = 2000 × 65536 / 33333 ≈ 3932

The existing `freqTable` was calculated for the ATtiny85's sample rate. **If you change the sample rate (OCR2A value), the table values map to different frequencies.** Specifically:

- tinydvco: sample rate ≈ 66.7kHz, table bottom ≈ 30Hz
- If you use 33.3kHz on ArdCore: the same table values produce frequencies that are **half** what they were, because each phase increment is applied half as often.

**Fix:** Either double all table values (multiply each by 2), or adjust `OCR2A` to match the original sample rate (set it to 29), or generate a new table for the target sample rate.

The simplest approach: use the original `OCR0A = 29` equivalent (`OCR2A = 29`) to get the same ~66.7kHz sample rate. This keeps the frequency table as-is. The ISR is lightweight enough (one PROGMEM read + one port write) that 66.7kHz should work, leaving ~240 cycles between interrupts — tight but doable. Monitor for issues and back off to `OCR2A = 59` with doubled table values if needed.

### Alternatively: Adjust the Phase Increment in the ISR

tinydvco already applies a right-shift in the ISR:

```cpp
syncPhaseAcc += syncPhaseInc >> 1;
```

This halves the effective phase increment. If you change the sample rate, you can adjust this shift to compensate. At half the sample rate, remove the `>> 1` to get the same output frequency. At the same sample rate, keep it as-is.

---

## 5. Memory Budget

### Flash (Program Memory)

| Component | Size | Notes |
|---|---|---|
| freqTable | 2048 bytes | 1024 × uint16_t |
| oscTable | 2048 bytes | 1024 × uint16_t |
| Wavetable (each) | 256 bytes | 256 × uint8_t |
| 4 wavetables | 1024 bytes | sine, triangle, pulse, noise |
| Code | ~2KB estimate | ISR, loop, setup, helpers |
| **Total** | ~7KB | Out of **32KB available** |

That leaves **~25KB free** — enough for ~97 additional wavetables if you wanted. In practice, you could comfortably include 12-16 wavetables and still have headroom for complex code.

For reference, the original tinydvco uses roughly the same components in ~5KB, leaving only ~3KB free on the ATtiny85. The ArdCore removes this constraint entirely.

### SRAM (Runtime Memory)

| Variable | Size | Notes |
|---|---|---|
| syncPhaseAcc, syncPhaseInc, etc. | ~10 bytes | volatile uint16_t/uint8_t |
| buffered_vals[4] | 8 bytes | uint16_t × 4 |
| ArdCore boilerplate (digState, digMilli, etc.) | ~20 bytes | |
| Stack / overhead | ~100 bytes | |
| **Total** | ~140 bytes | Out of **2048 available** |

Absolutely no SRAM concern. You could add large runtime buffers (like the Dead City Radio sketch's 128-float noise buffer) if needed.

---

## 6. Sample Rate Considerations

### What sample rate should you use?

| OCR2A | Sample Rate | Cycles Between ISRs | Max Output Freq (Nyquist) | Trade-off |
|-------|-------------|---------------------|---------------------------|-----------|
| 29 | 66.7kHz | ~240 | ~33kHz | Original tinydvco rate. Tight but possible. |
| 39 | 50kHz | ~320 | ~25kHz | Good balance. |
| 59 | 33.3kHz | ~480 | ~16.7kHz | Very safe. Adequate for most synthesis. |
| 79 | 25kHz | ~640 | ~12.5kHz | Relaxed. Audible aliasing on high notes. |

**Recommendation:** Start with OCR2A = 29 (matching tinydvco). If you get glitches (stuttery output or laggy knob response), increase to 39 or 59 and adjust the frequency table accordingly.

### What happens if the ISR takes too long?

If your ISR doesn't finish before the next interrupt fires, interrupts queue up and the audio glitches. The symptoms are: wrong pitch, buzzing, crackling, or total silence. Keep the ISR minimal — one table lookup and one port write. All `analogRead()` calls and waveform selection logic stay in `loop()`.

### Why not go higher than 66.7kHz?

At 16MHz, even 66.7kHz only gives 240 cycles per ISR. The ISR itself needs roughly:
- 20 cycles: interrupt entry/exit overhead
- 8 cycles: phase accumulator addition
- 8 cycles: right-shift to get table index
- 12 cycles: PROGMEM read
- 8 cycles: port write (dacOutput)
- ~10 cycles: switch/case overhead

That's ~66 cycles minimum — well within 240. But `analogRead()` in `loop()` takes ~100μs = ~1600 cycles, during which 6-7 ISR calls must be serviced. As long as the ISR is fast, this interleaving works fine.

---

## 7. New Features Enabled by ArdCore Hardware

### 7.1 Hard Sync (Clock Input)

The ArdCore's clock input (pin 2, hardware interrupt) can reset the phase accumulator:

```cpp
volatile int clkState = LOW;

void isr() {
    clkState = HIGH;
}

// In loop() or in the timer ISR:
if (clkState) {
    clkState = LOW;
    syncPhaseAcc = 0;  // reset to start of waveform
}
```

Hard sync is a classic subtractive synthesis technique. When the clock frequency differs from the oscillator frequency, the abrupt phase reset creates complex, harmonically rich timbres. Patching a second oscillator's output into the ArdCore's clock input gives you classic hard-sync sounds.

**Consideration:** Resetting in `loop()` introduces jitter (up to one loop iteration of delay). For tighter sync, reset inside the Timer2 ISR by checking pin 2 directly:

```cpp
ISR(TIMER2_COMPA_vect) {
    if (clkState) {
        clkState = LOW;
        syncPhaseAcc = 0;
    }
    syncPhaseAcc += syncPhaseInc >> 1;
    // ... rest of ISR
}
```

### 7.2 Fine-Tune (Knob 2)

The second knob can add a small offset to the phase increment:

```cpp
int fineTune = analogRead(1) - 512;  // center = 0, range = -512 to +511
syncPhaseInc = baseFreq + (fineTune >> 2);  // ±128 fine adjust
```

This is standard on analog VCOs — a knob for coarse tuning and one for fine.

### 7.3 Digital Output Triggers

The two digital outputs (D0, D1) can provide musically useful signals:

- **D0:** Trigger on every waveform cycle (when phase accumulator wraps). Useful as a square-wave sub-oscillator or clock output.
- **D1:** Trigger when waveform crosses zero (or midpoint). Useful for syncing other modules.

Detecting the wrap in the ISR:
```cpp
uint16_t prevPhase = syncPhaseAcc;
syncPhaseAcc += syncPhaseInc >> 1;
if (syncPhaseAcc < prevPhase) {
    // wrapped around — new cycle started
    // set D0 HIGH (turn off in loop() after trigTime ms)
}
```

### 7.4 Phase Modulation / FM via A3

The second CV jack (A3) can modulate the phase offset:

```cpp
phase_offset = analogRead(3) >> 2;  // 0-255
// In ISR:
phased_step = step + phase_offset;
val = pgm_read_byte_near(table + phased_step);
```

This is essentially phase modulation (PM), which sounds similar to FM synthesis. tinydvco already has a `phase_offset` variable and uses it for the noise waveform — the ArdCore port can expose it as a CV-controllable parameter for all waveforms.

### 7.5 More Wavetables

With 25KB of free flash, you can include custom wavetables. The fork already has `sundial9`, `ssq1`, `ssq2`, `ssq3`, `sundial2` in `wavetables.h`. These are drop-in compatible — each is 256 bytes in PROGMEM, exactly the format the ISR expects.

The `wavetable-converter` tool (in the tinydvco repo's `tools/` directory) can convert `.wav` and `.256` files to C arrays for inclusion.

---

## 8. Potential Issues and Mitigations

### 8.1 Timer2 and Pin 11

On the ATmega328P, Timer2 controls the PWM output on **pins 3 and 11**. Pin 3 is ArdCore digital output D0. Reconfiguring Timer2 for CTC mode **disables PWM on pin 3** — but we're using it as a simple digital HIGH/LOW, so `digitalWrite(3, ...)` still works fine. Just don't call `analogWrite(3, ...)`.

If using the output expander, pin 11 (bit 6) is one of the expander outputs. Reconfiguring Timer2 also affects pin 11's PWM. The expander tutorial's `Setup_timer2()` function and our CTC setup are **mutually exclusive** — you can't use the pin 11 analog output and the wavetable oscillator at the same time. This is fine since the DAC is already doing the audio output.

### 8.2 millis() Accuracy

We're using Timer2, not Timer0, so `millis()` and `delay()` are unaffected. This is why Timer2 is the right choice.

### 8.3 analogRead() Latency

`analogRead()` takes ~100μs. During that time, 6-7 timer ISR calls will fire and be serviced. This is fine — the ISR pre-empts `analogRead()`, does its work, returns, and `analogRead()` continues where it left off. The result is that `analogRead()` takes slightly longer than usual, but the audio output is uninterrupted.

However, doing 4 `analogRead()` calls per loop iteration (knob1, knob2, CV1, CV2) means ~400μs per loop — about 2.5kHz effective loop rate. Knob response will feel slightly sluggish but musically acceptable. If you need faster response on the pitch CV, you can:
- Read pitch CV every loop iteration but other knobs every Nth iteration
- Use the fast ADC prescaler trick (see TUTORIAL.md Section 4)

### 8.4 Aliasing

When the oscillator frequency exceeds half the sample rate (Nyquist), you get aliasing — phantom frequencies that fold back down and sound metallic/harsh. At 33kHz sample rate, this starts at ~16.5kHz. At 66.7kHz, it starts at ~33kHz (well above audible range for most oscillator fundamentals, but harmonics from square/saw waves can still alias).

This is a fundamental limitation of any digital oscillator at these sample rates. The tinydvco has the same issue. Band-limited wavetables (pre-computed to exclude harmonics above Nyquist) are the proper fix but add significant complexity and memory use.

For a eurorack module that's going through filters and effects, the aliasing from a naive wavetable is usually acceptable — many users consider it part of the "digital character."

### 8.5 Interrupt Priority

On the ATmega328P, interrupt priority is fixed by vector number. INT0 (pin 2 / clock input) is higher priority than Timer2. This means if a clock interrupt and a timer interrupt fire simultaneously, the clock ISR runs first. This is actually what you want — the hard sync reset should take priority over the sample output.

### 8.6 The `>> 1` Shift in the ISR

tinydvco has this line:
```cpp
syncPhaseAcc += syncPhaseInc >> 1;
```

This halves the phase increment, effectively halving the output frequency from what the table values would suggest. It's a design choice from the original author to set the pitch range. If you keep the same sample rate, keep this shift. If you halve the sample rate, remove the shift to compensate.

---

## 9. Register Reference: ATtiny85 vs ATmega328P

This table maps every tinydvco register access to its ArdCore equivalent.

| tinydvco (ATtiny85) | Purpose | ArdCore (ATmega328P) | Notes |
|---|---|---|---|
| `PLLCSR` | Enable 64MHz PLL | **Delete** | ATmega328P has no PLL. Not needed — using R-2R DAC. |
| `TCCR1` | Timer1 PWM config | **Delete** | PWM output replaced by DAC. |
| `OCR1A` (output) | PWM duty cycle | `dacOutput(val)` | R-2R DAC via PORTB/PORTD. |
| `TCCR0A` | Timer0 mode (CTC) | `TCCR2A` | Timer2 CTC mode. Same bit: `WGM21`. |
| `TCCR0B` | Timer0 prescaler | `TCCR2B` | Same bit positions: `CS21` for /8. |
| `OCR0A` | Timer0 compare | `OCR2A` | Same function, different register name. |
| `TIMSK` | Interrupt enable (shared) | `TIMSK2` | ATmega328P has per-timer TIMSK registers. |
| `OCIE0A` bit | Compare match enable | `OCIE2A` bit | Same bit position (1), different register. |
| `ISR(TIMER0_COMPA_vect)` | Timer0 ISR vector | `ISR(TIMER2_COMPA_vect)` | Different vector name. |
| `pgm_read_byte_near()` | Read PROGMEM | `pgm_read_byte_near()` | **Identical** — both are AVR. |
| `ADCSRA`, `ADMUX` | ADC config (if used) | `ADCSRA`, `ADMUX` | Same registers, same bits. |

---

## 10. Summary: Port Difficulty Assessment

| Aspect | Difficulty | Reason |
|---|---|---|
| Core algorithm | **Trivial** | Phase accumulator is platform-independent |
| Wavetables | **Trivial** | PROGMEM arrays work identically on both AVR chips |
| Frequency table | **Trivial** | Same PROGMEM, same `pgm_read_word_near()` |
| Timer ISR setup | **Easy** | Different register names, same concepts |
| DAC output | **Easier than original** | R-2R DAC replaces PWM+PLL+filter |
| Pin mapping | **Easy** | More pins available, just reassign |
| ArdCore boilerplate | **Easy** | Standard setup, well documented in TUTORIAL.md |
| Hard sync | **Easy** | New feature, simple phase reset on interrupt |
| Fine-tune knob | **Easy** | New feature, add offset to phase increment |
| Phase modulation | **Easy** | Variable already exists in tinydvco |
| Frequency table recalibration | **Medium** | Only needed if sample rate changes |
| Band-limited wavetables | **Hard** | Not in tinydvco either; optional improvement |

**Overall: This is a straightforward port with multiple easy wins.** The ArdCore is more capable than the ATtiny85 for this application. The main work is mechanical — remapping timer registers and replacing PWM output with DAC output. The algorithm, data structures, and general architecture are unchanged.

---

## 11. Checklist for Implementation

When writing the actual sketch, verify each of these:

- [ ] All ArdCore pins initialized in `setup()` (clkIn, digPin, DAC pins 5-12)
- [ ] Timer2 configured in CTC mode with appropriate OCR2A value
- [ ] `ISR(TIMER2_COMPA_vect)` replaces `ISR(TIMER0_COMPA_vect)`
- [ ] DAC output via PORTB/PORTD replaces `OCR1A` writes
- [ ] All PLL and Timer1 PWM code removed
- [ ] `freqTable` and wavetable arrays in PROGMEM (confirmed compatible)
- [ ] `analogRead()` pin numbers match ArdCore mapping (A0-A3)
- [ ] Clock input interrupt handler added for hard sync
- [ ] `volatile` on all variables shared between ISR and `loop()`
- [ ] Trigger turn-off logic for digital outputs
- [ ] Standard ArdCore sketch header with I/O documentation
- [ ] Serial debug calls removed or `#ifdef`-guarded for production
- [ ] Phase increment `>> 1` shift consistent with chosen sample rate
- [ ] Test: pitch tracks correctly across CV range
- [ ] Test: all waveforms produce clean output
- [ ] Test: knob response is smooth (no jitter)
- [ ] Test: hard sync produces expected timbral changes
