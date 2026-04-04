# ArdCore Exploration: Every Trick in the Repo

A deep catalog of every synthesis technique, DSP trick, and clever hack found across the ArdCore sketch collection. Organised by technique, not by sketch — because the same idea often appears in different forms across multiple programs.

---

## The Platform: What You're Working With

Every sketch in this repo runs on an **ATmega328P** (Arduino Nano) at 16MHz, with:

- **8-bit R-2R DAC** on pins 5-12 (0-255 = 0-5V output)
- **2KB SRAM** (the real constraint — limits buffer sizes for delays, sequences, etc.)
- **32KB flash** (plenty for code + PROGMEM lookup tables)
- **4 analog inputs**: A0/A1 (panel knobs), A2/A3 (CV jacks, 0-5V)
- **2 digital outputs**: pins 3 and 4 (gates/triggers)
- **1 clock input**: pin 2 (hardware interrupt-capable)
- **No FPU** — floating point is done in software, slowly

The universal output primitive is `dacOutput(byte v)`, which writes an 8-bit value to the DAC via direct port manipulation:

```cpp
void dacOutput(byte v)
{
  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}
```

This is ~4x faster than calling `digitalWrite()` eight times. Every sketch uses it. Two writes to two port registers, both masked to preserve other pins on those ports.

---

## 1. Oscillator / Wave Generation Techniques

### 1.1 Timed-Toggle Square Wave (AC24_SimpleVCO)

The simplest possible VCO. A lookup table stores the half-period in microseconds for each MIDI note (128 entries, float). The loop checks `micros()` elapsed time and flips the output between 0 and 255:

```cpp
if ((currMicros - lastMicros) > usNote[currNote + currOffset]) {
    digState = 255 - digState;
    dacOutput(digState);
    lastMicros = currMicros;
}
```

**How it works:** The output alternates between 0V and 5V. The time spent at each level determines the frequency. Longer half-period = lower frequency. The `usNote[]` table contains values like `4545.454590` (microseconds) for A4 (440Hz).

**The pitch CV trick:** The raw `analogRead(2)` value is right-shifted by 3 to give 0-127 — an index directly into the 128-note table. The knob (A0) adds an offset for transposition.

**Limitation:** The square wave is the ONLY waveform this approach can produce. You can't do arbitrary waveshapes because the output is just a binary toggle. Also, pitch stability depends entirely on loop speed — any variation in how long `loop()` takes creates jitter.

**Speed hack:** The ADC prescaler is reduced from the default 128 to 16, making `analogRead()` about 8x faster (~13μs instead of ~100μs). This is critical for keeping the loop tight enough to generate audio frequencies:

```cpp
sbi(ADCSRA, ADPS2);
cbi(ADCSRA, ADPS1);
cbi(ADCSRA, ADPS0);
```

**Found in:** `official/AC24_SimpleVCO`

---

### 1.2 Software Ramp Sawtooth (SIMPLEST_SAWTOOTH)

A `for` loop from 0 to 100 outputs incrementing DAC values. When it reaches the top, it wraps back to 0 — creating a sawtooth wave:

```cpp
for (n = 0; n <= 100; n++) {
    dacOutput(n);
}
```

Frequency is controlled by adding `delayMicroseconds()` inside the loop. Shorter delay = higher pitch.

**Why this works:** A sawtooth wave IS just a linear ramp that resets. By outputting incrementing values to the DAC, you get a voltage that rises linearly and then drops back — exactly a sawtooth. The only issue is the frequency depends on loop timing, which is crude.

**Found in:** `snazzy_fx/EXPERIMENTAL AUDIO/` (the "simplest" sketches)

---

### 1.3 Software Triangle (ARDCORE_TRIANGLE)

Two sequential `for` loops — one ramping up, one ramping down — with `delayMicroseconds()` per step for frequency control:

```cpp
for (n = 0; n <= 100; n++) { dacOutput(n); delayMicroseconds(d); }
for (n = 100; n >= 0; n--) { dacOutput(n); delayMicroseconds(d); }
```

The same principle as the sawtooth, but the descending ramp creates the second half of the triangle. The AC19_ShapedLFO extends this to a float-precision accumulator with separate up/down rates for asymmetric waveshaping (see LFO section).

**Found in:** `snazzy_fx/EXPERIMENTAL AUDIO/ARDCORE_TRIANGLE`

---

### 1.4 Phase Accumulator + Wavetable Lookup (AC33_SSQScreecherWT)

The most architecturally sophisticated oscillator in the repo — ported from the yorkmodular/tinydvco. The core idea:

A **16-bit phase accumulator** (`syncPhaseAcc`) is incremented by a **phase increment** (`syncPhaseInc`) every time the Timer2 ISR fires (at 66.67kHz). The top 8 bits of the accumulator index into a 256-byte wavetable stored in PROGMEM:

```cpp
ISR(TIMER2_COMPA_vect)
{
  syncPhaseAcc += syncPhaseInc >> 1;
  uint8_t step = syncPhaseAcc >> 8;

  // Look up sample from current wavetable
  const uint8_t *tbl = (const uint8_t *)pgm_read_ptr(&wavetables[currentWave]);
  uint8_t idx = step + phaseOffset;
  val = pgm_read_byte_near(tbl + idx);

  // Output to DAC
  PORTB = (PORTB & B11100000) | (val >> 3);
  PORTD = (PORTD & B00011111) | ((val & B00000111) << 5);
}
```

**Why this is better than the loop-based approaches:**

1. **Pitch stability** — the ISR fires at a fixed rate regardless of what `loop()` is doing. No jitter from `analogRead()` delays.
2. **Arbitrary waveforms** — any shape you can store as 256 bytes works. Sine, triangle, weird organic textures, anything.
3. **Pitch is controlled by math, not timing** — changing the phase increment changes how fast you scan through the wavetable, not how fast the code runs.

**The phase accumulator explained:**

Think of it as a needle on a record. The wavetable is one groove (one cycle of the waveform, 256 samples). The accumulator is a 16-bit counter that represents where the needle is. Every ISR call, you advance the needle by `syncPhaseInc`. The top 8 bits tell you which of the 256 samples to read. The bottom 8 bits are a "fractional" position that gets thrown away (no interpolation).

- Small increment → needle moves slowly → low frequency
- Large increment → needle jumps through → high frequency
- The 16-bit accumulator wraps around at 0xFFFF automatically → the waveform repeats cleanly

**The frequency table:** A 1024-entry PROGMEM lookup table (`freqTable`) maps the 10-bit ADC reading directly to a phase increment. The table is pre-calculated for 1V/octave response — the exponential relationship is baked into the table values because `exp()` and `pow()` are far too slow for real-time on an 8-bit chip.

**Algorithmic waveforms:** Sawtooth and square don't need lookup tables:

```cpp
case WT_SAW:
    val = step;                           // the phase position IS the saw
    break;
case WT_SQUARE:
    val = (step < 128) ? 0x00 : 0xFF;    // binary threshold
    break;
```

This saves 512 bytes of flash.

**Phase modulation:** Adding a CV-controlled offset to the table index before lookup:

```cpp
uint8_t idx = step + phaseOffset;  // phaseOffset from analogRead(3)
val = pgm_read_byte_near(tbl + idx);
```

This is phase modulation (PM), which sounds similar to FM synthesis. Since the table index wraps naturally at 8 bits, no bounds checking is needed.

**Hard sync:** The clock input resets the phase accumulator to zero inside the ISR:

```cpp
if (clkState) {
    clkState = LOW;
    syncPhaseAcc = 0;
}
```

When the sync clock frequency differs from the oscillator frequency, the abrupt phase reset creates complex, harmonically rich timbres — a classic analogue synthesis technique.

**Waveform selection smoothing:** The last 4 knob readings are averaged to avoid jittery switching from a noisy pot. The buffer length is a power of 2 so division can be a bit-shift:

```cpp
waveBuff[waveBuffStep++] = waveIdx;
if (waveBuffStep >= WAVE_BUFF_LEN) {
    uint16_t acc = 0;
    for (int i = 0; i < WAVE_BUFF_LEN; i++) acc += waveBuff[i];
    currentWave = (acc >> WAVE_BUFF_SHIFT);  // >> 2 = divide by 4
    waveBuffStep = 0;
}
```

**Memory budget:** Each wavetable is 256 bytes. With ~25KB free flash after the frequency table and code, you can fit ~97 additional wavetables. The tinydvco on the ATtiny85 was limited to ~5 waveforms due to its 8KB flash — the ArdCore removes this constraint.

**Found in:** `community/user_submitted/AC33_SSQScreecherWT`

---

### 1.5 Granular Synthesis via Dual Phase Accumulators (Auduino Port)

A port of Peter Knight's Auduino — a lo-fi granular synthesiser. The concept: two independent "grain" oscillators run inside a Timer2 overflow ISR at 31.25kHz. A master oscillator controls the grain rate.

```cpp
SIGNAL(PWM_INTERRUPT)
{
  syncPhaseAcc += syncPhaseInc;
  if (syncPhaseAcc < syncPhaseInc) {
    // Sync oscillator overflowed — start new grain
    grainPhaseAcc = 0;
    grainAmp = 0x7fff;
    grain2PhaseAcc = 0;
    grain2Amp = 0x7fff;
  }

  // Advance grain oscillators
  grainPhaseAcc += grainPhaseInc;
  grain2PhaseAcc += grain2PhaseInc;

  // Convert phase to triangle wave
  value = (grainPhaseAcc >> 7) & 0xff;
  if (grainPhaseAcc & 0x8000) value = ~value;
  output = value * (grainAmp >> 8);

  // Same for grain 2
  value = (grain2PhaseAcc >> 7) & 0xff;
  if (grain2PhaseAcc & 0x8000) value = ~value;
  output += value * (grain2Amp >> 8);

  // Exponential amplitude decay
  grainAmp -= (grainAmp >> 8) * grainDecay;
  grain2Amp -= (grain2Amp >> 8) * grain2Decay;

  output >>= 9;
  if (output > 255) output = 255;
  dacOutput(output);
}
```

**How the grains work:**

1. The master oscillator (`syncPhaseAcc`) sets the "grain period." When it overflows, both grain oscillators reset to zero — starting a new grain.
2. Each grain oscillator generates a **triangle wave** by testing the MSB of its phase accumulator. If the top bit is 0, the value rises linearly; if it's 1, the value is inverted (falls linearly). The `~value` bit-flip is the cheapest possible way to make a triangle from a ramp.
3. Each grain's amplitude decays exponentially: `grainAmp -= (grainAmp >> 8) * grainDecay`. The right-shift by 8 extracts the "integer part" of the amplitude, multiplied by the decay rate. This is a fixed-point exponential decay — the amplitude drops fast at first, then tails off.
4. The two grains are summed together for the final output.

**Three pitch mapping modes** are included:

- **Smooth logarithmic** (`antilogTable[]`) — 64-entry lookup, continuous sweep
- **Stepped chromatic** (`midiTable[]`) — 128-entry table, snaps to semitones
- **Stepped pentatonic** (`pentatonicTable[]`) — 54-entry table, pentatonic scale only

The logarithmic table uses a clever encoding: `antilogTable[input & 0x3f] >> (input >> 6)`. The bottom 6 bits index the 64-entry table, and the top bits determine how many times to right-shift the result (halving the frequency per "octave"). This gives a smooth exponential curve from just 64 stored values.

**Found in:** `snazzy_fx/ARDCORE_auduino_v5`

---

### 1.6 Two-Tone Drone with Chorus (ARDCORE_twotone_mod)

Two software oscillators with cross-fade controlled by LFOs. A 512-byte `DELAY_BUFF` provides chorus. Multiple LFOs (lfo1-lfo4) modulate cross-fade, chorus speed, chorus depth, and ring-mod envelope simultaneously. Scale tables provide pitched output.

**Found in:** `snazzy_fx/FRAKTAL_SYNTH_PORTS/ARDCORE_twotone_mod`

---

## 2. Noise Generation

### 2.1 Linear Feedback Shift Register (LFSR) — 16-bit

The classic digital noise generator. A 16-bit register is shifted right by one position each step. The new bit fed in is computed by XOR-ing specific tap positions:

```cpp
uint16_t lfsr = 0xACE1u;
unsigned bit;

void loop() {
  do {
    /* taps: 16 14 13 11; polynomial: x^16 + x^14 + x^13 + x^11 + 1 */
    bit  = ((lfsr >> 0) ^ (lfsr >> 2) ^ (lfsr >> 3) ^ (lfsr >> 5)) & 1;
    lfsr = (lfsr >> 1) | (bit << 15);
    ++period;
    dacOutput(lfsr);
  } while (lfsr != 0xACE1u);
}
```

**Why this sounds like noise:** The feedback polynomial is chosen to give a **maximal-length sequence** — the register cycles through all 65,535 possible non-zero states before repeating. The pattern is deterministic but so long that it sounds random. The output bits have statistical properties close to true white noise.

**The taps:** Positions 16, 14, 13, 11 (or equivalently, right-shifted positions 0, 2, 3, 5 since we're working from the LSB). These tap positions define a **primitive polynomial** over GF(2) — a polynomial that generates the maximum possible sequence length. Not all tap combinations work; these are specifically chosen from mathematical tables.

**The do-while loop:** The `while (lfsr != 0xACE1u)` check detects when the register has cycled back to its starting state. In practice, at audio rates the sequence is so long (65,535 steps) that it never audibly repeats.

**Found in:** `snazzy_fx/LFSR/LFSR`

---

### 2.2 LFSR — 32-bit Galois Form

A more compact LFSR implementation using the Galois (rather than Fibonacci) form:

```cpp
lfsr = (lfsr >> 1) ^ (-(lfsr & 1u) & 0xD0000001u);
```

**How this works:** The Galois form applies all the feedback taps in a single operation. `-(lfsr & 1u)` is either `0x00000000` (if the LSB is 0) or `0xFFFFFFFF` (if 1). AND-ing with `0xD0000001u` selects the tap polynomial. The XOR applies it. The taps correspond to x^32 + x^31 + x^29 + x + 1.

The 32-bit version produces 4,294,967,295 unique states — at audio sample rates, it takes over a minute to cycle, making the repetition completely inaudible.

The SDIY variant runs from a Timer2 overflow ISR for consistent sample rate, and feeds both Pin 11 PWM and the R-2R DAC simultaneously.

**Found in:** `snazzy_fx/LFSR/LFSR32`, `snazzy_fx/SDIY_ARDCORE_NOISE`

---

### 2.3 XOR-Shift PRNG with Buffer (Dead City Radio)

Uses a floating-point XOR-shift pseudo-random number generator to fill a 128-sample buffer:

```cpp
g_x1 ^= g_x2;
*_fpDstBuffer = (g_x2 * _fLevel);
g_x2 += g_x1;
```

A Timer1 CTC interrupt outputs samples from the buffer at a rate set by `OCR1A` (pitch-controllable). The loop refills the buffer asynchronously when the ISR sets a `buffFlag`. This is a **double-buffering** pattern — the ISR reads while `loop()` writes.

**Smoothing modes:** 1-sample, 2-sample, and 3-sample neighbour averaging are selectable via CV. More averaging = smoother noise = lower frequency content.

**Found in:** `snazzy_fx/EXPERIMENTAL AUDIO/DeadCityRadio_AudioRate`

---

### 2.4 ADC Multiplication as Noise (ARDCORE_NOISEMAKER)

Perhaps the simplest "noise" generator possible — three lines of functional code:

```cpp
void loop() {
  dacOutput(analogRead(2) * analogRead(0));
}
```

**Why this makes noise:** Multiplying two 10-bit readings gives a 20-bit result, which is then truncated to 8 bits by `dacOutput(long v)` casting to `int`. The truncation creates **aliasing** — the high bits of the product wrap around unpredictably. When one input is an LFO, the output becomes amplitude-modulated noise. When both inputs are audio-rate, you get a crude ring modulator.

**Found in:** `snazzy_fx/EXPERIMENTAL AUDIO/ARDCORE_NOISEMAKER`

---

## 3. Bytebeat / Algorithmic Audio

Bytebeat is a family of techniques discovered by viznut (Ville-Matias Heikkilä) where a single arithmetic/bitwise expression on a counter `t` generates complex audio patterns. No wavetables, no buffers, no state machines — just math.

### 3.1 The Basic Bytebeat Pattern

An integer `t` increments each loop iteration. A compound expression on `t` produces the audio sample:

```cpp
void loop() {
  long t;
  for (t = 0; ; t++) {
    myval = (3 * t & t >> 8);
    dacOutput(myval);
  }
}
```

The `for(;;)` infinite loop means this sketch never returns from `loop()` — it runs forever at maximum speed. The `&` (bitwise AND) between a scaled counter and a shifted counter creates a self-similar pattern that sounds musical despite being purely algorithmic.

**Found in:** `snazzy_fx/BYTEBEAT.../pretty1`

### 3.2 More Complex Formulas

The repo contains dozens of bytebeat formulas. Some highlights:

**Drums and melody** — multiple bitwise terms OR'd together create layered rhythmic and melodic patterns:
```cpp
myval = (t*9 & t>>4 | t*5 & t>>7 | t*38 & t>>10) - 1;
```

The different shift amounts (`>>4`, `>>7`, `>>10`) create patterns at different time scales. The small shifts (`>>4`) create fast rhythmic elements (like hi-hats), while large shifts (`>>10`) create slow melodic movement. The OR combines them. The `-1` offsets the DC level.

**Speed control via CV:**
```cpp
for (t = 0; ; t++) {
    delayMicroseconds(1 + analogRead(2));
    myval = (t*9 & t>>4 | t*5 & t>>7 | t*38 & t>>10) - 1;
    dacOutput(myval);
}
```

The `delayMicroseconds(1 + analogRead(2))` between increments controls playback speed. At minimum CV, `t` advances at near-maximum rate (audio). At maximum CV, `t` crawls (slow CV pattern). The `+1` prevents a delay of zero.

**Found in:** `snazzy_fx/BYTEBEAT.../drumsandmelody`, `snazzy_fx/BYTEBEAT.../sloe_dub`, `snazzy_fx/BYTEBEAT.../fucking_techno`

---

## 4. Cellular Automata Synthesis

### 4.1 1D Wolfram Elementary Cellular Automata (CELLULAR_AUTOMATA_SYNTH)

A 34-cell one-dimensional binary cellular automaton evolves according to a user-specified rule byte (0-255 via the A2 knob). Each cell's next state depends on its 3-cell neighbourhood:

```cpp
state = 0;
if (CA_CELL[c-1][old] != 0) state += 1;
if (CA_CELL[c]  [old] != 0) state += 2;
if (CA_CELL[c+1][old] != 0) state += 4;

if (BIT_TEST(rule, state)) {
    // cell lives, accumulate tone rate
    CA_tonerate = CA_tonerate * state;
    CA_CELL[c][newA] = state;
} else {
    CA_CELL[c][newA] = 0;
}
```

**How it makes sound:** The automaton doesn't directly generate audio samples. Instead, it accumulates a `CA_tonerate` value from the cell states. This rate controls how fast a simple square-wave oscillator toggles:

```cpp
CA_tonecnt--;
if (CA_tonecnt == 0) {
    CA_tonecnt = CA_tonerate;
    CA_out = ~CA_out;  // toggle between 0 and 255
}
```

Higher `CA_tonerate` = slower toggle = lower pitch. The automaton's evolution over time creates shifting tonal patterns. Different rule numbers produce radically different sounds — rule 30 (chaotic) sounds very different from rule 110 (complex but structured).

**CV control:** The clock speed (A0), number of iterations per step (A1), rule number (A2), and active cell range (A3) are all knob/CV controllable. This creates a 4-dimensional parameter space of sonic textures.

**The double-buffer trick:** Two copies of the cell array (`[0]` and `[1]`) alternate roles as "old" and "new" state, swapped with a boolean flag each iteration. This prevents the current step's evolution from corrupting the state that neighbouring cells need to read.

**Found in:** `snazzy_fx/FRAKTAL_SYNTH_PORTS/CELLULAR_AUTOMATA_SYNTH`

---

### 4.2 Fractal / Counter-Based Synthesis (fraktal_synth)

Two algorithms operate on a 16-bit integer counter `FS_cnt`. Each algorithm extracts the high and low bytes, masks and multiplies them against CV-controlled parameters:

```cpp
FS_cnthi = make8(FS_cnt, 1) & param1;  // high byte, masked
FS_cntlo = make8(FS_cnt, 0);            // low byte
FS_out = FS_cnthi * FS_cntlo;           // multiply
FS_out = FS_out * param2;               // scale

if (param3 != 255) {
    if (FS_out & param3) FS_out = 255;  // threshold to binary
    else                 FS_out = 0;
}

FS_cnt++;  // advance counter
```

The `make8(val, offset)` macro extracts byte N from a multi-byte value: `((val >> (offset * 8)) & 0xff)`.

**Why this sounds musical:** The counter increments linearly, but the combination of byte extraction, masking, and multiplication creates non-linear patterns. The threshold step (comparing against `param3`) reduces the output to a binary waveform whose pattern changes with the counter — creating rhythmic and tonal structures from pure arithmetic. It's related to bytebeat but operates at the nibble/byte level rather than on the full counter.

**The clock input switches between the two algorithms** — one uses only the high byte of `FS_cnt`, the other masks both bytes. This gives two "timbres" that can be switched rhythmically by an external clock.

**Found in:** `snazzy_fx/FRAKTAL_SYNTH_PORTS/fraktal_synth`

---

## 5. Delay Lines and Reverb

### 5.1 Circular Buffer Delay with Feedback

The core delay architecture used across all delay sketches in the repo:

```cpp
const short arraySize = 900;  // max for ATmega328 SRAM (~950 usable)
unsigned short delArr[arraySize];
unsigned short pointer = 0, delPointer;

void loop() {
    input = analogRead(2);

    delPointer = (pointer + delayLength) % arraySize;

    // Write input + fed-back delayed signal
    delArr[pointer] = input + (delArr[delPointer] * feedback);

    // Output: delayed signal + dry input
    out = delArr[delPointer] + input;
    out = out >> 2;  // prevent clipping

    pointer = (pointer + 1) % arraySize;
    dacOutput(out);
}
```

**The circular buffer:** `pointer` is the write position. `delPointer` reads from `delayLength` samples ahead (which, because the buffer wraps, is the same as `delayLength` samples in the past). The modulo operator wraps both pointers within the buffer bounds.

**Feedback:** The delayed sample is multiplied by a feedback coefficient (0.0 to ~0.6) and added to the current input before being written back into the buffer. This creates repeating echoes. The feedback coefficient is limited (divided by 1600 instead of 1024) to prevent runaway feedback that would clip.

**The SRAM wall:** At 2 bytes per sample (`unsigned short`), the maximum buffer is ~950 samples. At whatever sample rate the loop achieves (roughly 8-10kHz with analogReads), this gives roughly 100ms of maximum delay. Short, but usable for slapback echo and comb-filter effects.

**The `>> 2` output scaling:** Right-shifting by 2 (dividing by 4) prevents clipping when the delayed signal and dry signal are summed. Without this, the output would regularly exceed 255 and wrap around, causing harsh distortion.

**Found in:** `snazzy_fx/EXPERIMENTAL AUDIO/DELAY_SKETCHES/BLOG_DELAY_BEST`

---

### 5.2 Randomised Feedback (BLOG_DELAY_BEST variant)

A single line transforms a clean delay into a chaotic texture:

```cpp
feedback = ((feedback) && (random(500)));
```

**What this does:** The `&&` (logical AND) evaluates `feedback` as a boolean (non-zero = true), then evaluates `random(500)` as a boolean (also almost always true, but returns 0 about 1 in 500 times). When `random(500)` returns 0, the entire expression is 0 (false), which gets assigned to `feedback` — effectively zeroing the feedback for that sample. This creates intermittent dropout of the echo, producing chaotic, stuttering effects.

**Found in:** `snazzy_fx/EXPERIMENTAL AUDIO/DELAY_SKETCHES/BLOG_DELAY_BEST`

---

### 5.3 Dual-Tap Comb Reverb (reverb_prttygood)

Two read positions at fixed offsets from the write pointer create a Schroeder-style comb filter reverb:

```cpp
char signal[1800];  // 1800-byte buffer (signed char!)

echo1 = pos - 900;
echo2 = pos - 1799;
if (echo1 < 0) echo1 = 1800 + pos - 900;
if (echo2 < 0) echo2 = 1800 + pos - 1799;

S1out = S1out + (signal[echo1] >> 2) + (signal[echo2] >> 3);
```

**How it works:** Two delayed copies of the input are summed with the current sample at different gain levels (`>> 2` = quarter volume, `>> 3` = eighth volume). The two taps at different delay lengths create interference patterns that simulate the multiple reflections of a reverberant space.

**The signed char trick:** Using `char` instead of `unsigned char` means samples are stored as -128 to +127, which allows the summation to create both constructive and destructive interference. With unsigned values, you'd only get constructive summing and the output would constantly clip.

**The slow ADC trick:** The ADC prescaler is set to /64 (slower than the usual /16 speed hack):

```cpp
sbi(ADCSRA, ADPS2);
sbi(ADCSRA, ADPS1);
cbi(ADCSRA, ADPS0);
```

This deliberately slows down `analogRead()`, which reduces the effective sample rate, which makes the 1800-sample buffer represent a longer time span — giving a longer reverb tail. A clever hack: instead of making the buffer bigger (impossible due to SRAM limits), make time slower.

**Found in:** `snazzy_fx/EXPERIMENTAL AUDIO/DELAY_SKETCHES/reverb_prttygood`

---

## 6. Waveshaping and Distortion

### 6.1 Nibble-Swap Distortion (DISTORTION)

The high and low 4-bit nibbles of the input sample are extracted, swapped, and recombined:

```cpp
#define CENTERPOS 128

void distortion(void) {
    unsigned int temp1, temp2;
    if ((S1out > 10) || (S1out < -10)) {
        temp1 = (((int)S1out + CENTERPOS) >> 4) & 0xf;  // extract high nibble
        temp2 = (((int)S1out + CENTERPOS) & 0xF) << 4;  // extract low nibble, shift up
        S1out = ((((temp1 + temp2) & 0x7F) - CENTERPOS)) >> 2;
    }
}
```

**Why this sounds interesting:** The nibble swap creates a **non-monotonic transfer function**. Normally, as input increases from 0 to 255, output also increases smoothly. After nibble-swapping, the mapping becomes discontinuous — small input changes can cause large output jumps, and vice versa. This produces a complex harmonic distortion that sounds like a bitcrusher crossed with a foldback distortion.

The `CENTERPOS` (128) offset centers the signal around zero before processing, then re-centers it after. The `& 0x7F` masks to 7 bits, and the `>> 2` scales down to prevent clipping.

The `delayMicroseconds(map(analogRead(0), 0, 1023, 22000, 1))` after the output controls effective sample rate — at low values you get audio-rate processing, at high values you get a sample-and-hold effect layered on top of the distortion.

**Found in:** `snazzy_fx/EXPERIMENTAL AUDIO/DISTORTION`

---

### 6.2 XOR Bit-Shift Waveshaping (waveshpr2)

An array of 11 bit-shifted versions of the input is created, then two are XOR'd together:

```cpp
int xorvalue[10];
xorvalue[0] = S1out >> 1;
xorvalue[1] = S1out << 5;
xorvalue[2] = S1out << 4;
xorvalue[3] = S1out << 3;
xorvalue[4] = S1out << 2;
xorvalue[5] = S1out << 1;
xorvalue[6] = S1out >> 1;
xorvalue[7] = S1out >> 2;
xorvalue[8] = S1out >> 3;
xorvalue[9] = S1out >> 4;
xorvalue[10] = S1out;

newOut = xorvalue[x] ^ xorvalue[v];
```

**How it works:** Each shifted version of the input emphasises different bits. XOR-ing two of these creates a transfer function that depends on which bits are set in the input — effectively a bit-level waveshaper whose character changes depending on the pair of shifts selected. Different `x` and `v` indices produce different distortion characters.

**Found in:** `snazzy_fx/EXPERIMENTAL AUDIO/waveshapers/waveshpr2`

---

### 6.3 Half-Rectified Ring Modulation (AC28_RectifiedRingMod)

Two analog inputs are read, scaled to 8-bit, and multiplied:

```cpp
inputA = analogRead(2) >> 2;      // 0-255
inputB = analogRead(3) >> 2;      // 0-255
output = (inputA * inputB) >> 1;  // multiply, then halve
dacOutput(output);
```

**Why "rectified":** The ADC only measures positive voltages (0-5V). Standard eurorack signals are bipolar (±5V). The negative half of each input is clipped to 0V by the ADC hardware. So you're actually multiplying two **half-wave rectified** signals. This produces a more aggressive, "clangorous" sound than true ring modulation — as noted in the code comments.

The `>> 1` right-shift halves the output to prevent clipping (since 255 × 255 = 65,025, which needs to fit in a byte after shifting: 65,025 >> 1 = 32,512, further truncated by the `byte` cast in `dacOutput`).

The ADC prescaler is reduced for speed, keeping the processing rate high enough for audio-frequency inputs.

**Found in:** `official/AC28_RectifiedRingMod`

---

## 7. LFO / CV Modulation Generation

### 7.1 Float-Accumulator Triangle LFO with Warp (AC19_ShapedLFO)

The canonical ArdCore LFO pattern. A `float currValue` accumulates per-millisecond using elapsed time:

```cpp
unsigned long now = millis();
int elapsed = now - lastMillis;

if (currDir) {
    currValue += elapsed * upStep;
} else {
    currValue += elapsed * downStep;
}

// Wrap: 0 → 255 (rising) → 511 → 0 (falling)
while (currValue > 511.0) currValue -= 511.0;

if (currValue <= 255.0) {
    dacOutput((byte)currValue);
} else {
    dacOutput((byte)(511.0 - currValue));
}

lastMillis = now;
```

**The warp control:** The knob controls the asymmetry between rise and fall:

```cpp
float msPerCycle = ((1023 - analogRead(0)) + 20) * 3.0;
float warpFactor = ((analogRead(1) >> 4) + 1) / 65.0;

upStep   = 255.0 / (msPerCycle * warpFactor);
downStep = 255.0 / (msPerCycle * (1.0 - warpFactor));
```

When `warpFactor` is 0.5, both rates are equal and you get a symmetric triangle. When it's close to 0, the rise is very fast and the fall is slow (ramp down). When close to 1, the rise is slow and the fall is fast (ramp up / sawtooth-ish).

**Trigger outputs:** D0 fires at the negative transition (peak → falling), D1 fires at the positive transition (trough → rising). These are useful for syncing other modules to the LFO cycle.

**Found in:** `official/AC19_ShapedLFO`

---

### 7.2 Sine LFO via sin() Function (ARD_SINE_LFO)

Brute-force sine computation using the math library:

```cpp
#include <math.h>

float angleincr = TWO_PI / nsamps;
for (int i = 0; i < nsamps; i++) {
    float samp = sin(angleincr * i);
    dacOutput((unsigned char)((samp * 127.5) + 127.5));
}
```

**Speed control:** Instead of changing the frequency of computation, the number of samples per cycle (`nsamps`) is varied. Fewer samples = faster cycle, but coarser resolution. `nsamps` is read from CV: `analogRead(2) * 4`, giving a range of roughly 0-4092 samples per cycle.

**The scaling:** `sin()` returns -1.0 to +1.0. Multiply by 127.5 to get -127.5 to +127.5, then add 127.5 to get 0 to 255 — filling the full DAC range.

**Performance note:** `sin()` on the ATmega328P takes roughly 100-200μs per call (implemented as a Taylor series in software). With 1000 samples per cycle, that's 100-200ms per LFO cycle — fine for sub-audio rates but this can't generate audio-frequency signals.

**Found in:** `snazzy_fx/CV-LFO SKETCHES/ARD_SINE_LFO`

---

### 7.3 Bouncing Ball Physics Envelope (AC32_BouncingBall)

Simulates a ball being dropped. Each "bounce" fires a trigger, and the time between bounces shrinks exponentially:

```cpp
// On clock trigger: start the ball
accValue = accStart;   // initial bounce height (from knob, 0-2000ms)
isRunning = 1;

// On each bounce:
float tmp = (accValue / accStart) * 255.0;  // height → DAC value
dacOutput(floor(tmp));

accValue *= accFact;    // exponential decay (0.49-0.99)
accValue -= accFric;    // linear friction (0-100ms)

nextTime = currTime + floor(accValue);  // schedule next bounce

if (accValue < accLimit) {
    isRunning = 0;  // ball has "landed"
}
```

**The physics model:** `accFact` is the coefficient of restitution — what fraction of energy the ball retains after each bounce. Real rubber balls have ~0.8; real steel balls ~0.95. The knob gives 0.49 to 0.99.

`accFric` is an additional linear energy loss per bounce (friction). This ensures the ball eventually stops even with high restitution.

**Musical use:** The decreasing intervals between bounces create a natural "bouncing ball" rhythm that's impossible to program with a regular sequencer. D0 fires a trigger on each bounce (for driving a percussion module), and D1 goes HIGH when the ball lands (useful as an end-of-cycle signal).

**Found in:** `official/AC32_BouncingBall`

---

## 8. Envelope Generators

### 8.1 Linear Attack/Decay (AC25_VCAREnvelope)

A float accumulator with per-loop-iteration increment/decrement. State machine: 0=idle, 1=rising, -1=falling.

```cpp
if (envState == 1) {
    currValue += riseValue;
} else if (envState == -1) {
    currValue -= fallValue;
}

if (currValue > 255.0) {
    currValue = 255.0;
    envState = -1;  // transition to decay
    // fire trigger on D0 (peak reached)
}

if (currValue < 0.0) {
    currValue = 0.0;
    envState = 0;   // envelope complete
    // fire trigger on D1 (envelope ended)
}

dacOutput((byte)currValue);
```

**The rate calculation:**

```cpp
int riseSetting = analogRead(0) + analogRead(2) + 5;
riseValue = 255.0 / riseSetting;
```

The attack time is the sum of Knob 1 and CV In 1 (plus 5 to prevent division by zero). At minimum settings (riseSetting = 5), `riseValue = 255/5 = 51` — the envelope reaches peak in about 5 loop iterations (very fast). At maximum (riseSetting ≈ 2051), `riseValue ≈ 0.12` — taking ~2100 iterations (slow envelope).

**Why knob + CV are summed:** This gives you a base attack time from the knob plus voltage control from the jack. It's additive rather than multiplicative, so the knob sets a minimum time and the CV extends it.

**The looping variant** (AC29) restarts the envelope immediately when it reaches zero — creating a looping AR envelope that acts as an LFO with controllable attack and decay shapes.

**Found in:** `official/AC25_VCAREnvelope`, `official/AC29_VCADLoopEnvelope`

---

### 8.2 Full ADSR with Gate Tracking (ADSR_ENV)

Extends the AD pattern with sustain and release phases. Gate detection from A2 (`analogRead(2) > 120`) drives attack/decay; gate going LOW triggers release. Each phase has its own rate constant from a knob.

**Found in:** `snazzy_fx/ADSR envelope/ADSR_ENV`

---

## 9. Sequencing and Rhythm Generation

### 9.1 Euclidean Rhythm Generator (AC30_DualEuclidean)

Implements the Bjorklund algorithm: distribute N pulses across M steps as evenly as possible.

```cpp
void euCalc(int ar) {
    for (int i = 0; i < 32; i++) euArray[ar][i] = 0;

    if (inPulses[ar] >= inSteps[ar]) {
        // More pulses than steps: every step is active
        for (int i = 0; i < inSteps[ar]; i++) euArray[ar][loc++] = 1;
    } else {
        int offs = inSteps[ar] - inPulses[ar];
        int ppc = offs / inPulses[ar];    // gaps per pulse
        int rmd = offs % inPulses[ar];    // remainder gaps

        for (int i = 0; i < inPulses[ar]; i++) {
            euArray[ar][loc++] = 1;                 // place a pulse
            for (int j = 0; j < ppc; j++)
                euArray[ar][loc++] = 0;             // fill gaps evenly
            if (i < rmd) euArray[ar][loc++] = 0;    // distribute remainder
        }
    }
}
```

**How it distributes pulses:** Say you have 3 pulses in 8 steps. That's 5 gaps to distribute across 3 pulses. `ppc = 5/3 = 1` gap per pulse, `rmd = 5%3 = 2` remaining gaps. So the first 2 pulses get 2 gaps each (1 + 1 remainder), and the last pulse gets 1 gap: `[1,0,0, 1,0,0, 1,0]`. This is the Euclidean rhythm E(3,8) — which is the Cuban tresillo pattern.

**Dual rhythms:** Two independent Euclidean patterns run from a single external clock. Each has its own steps/pulses knobs (A0/A2 for rhythm A, A1/A3 for rhythm B). The rhythms are output on D0 and D1.

**Dynamic recalculation:** The pattern is recalculated only when the knob values change (detected by comparing to previous readings), not every loop iteration. This prevents audio glitches from spending too long in the calculation function.

**Found in:** `official/AC30_DualEuclidean`

---

### 9.2 Analog Shift Register (AC21_ShiftRegister)

Emulates the classic analogue shift register: sample incoming CV on each clock, store in a circular array, and replay from a knob-selected offset:

```cpp
if (clkState == HIGH) {
    clkState = LOW;

    value[currValue] = analogRead(2) >> 2;  // record current input
    currValue++;
    if (currValue > 8) currValue = 0;

    int tempOffset = 7 - (analogRead(0) >> 7);  // knob selects 1-8 step offset
    int outStep = (currValue + tempOffset) % 9;
    int outValue = value[outStep];

    int transAmt = ((analogRead(1) / 41) - 12) << 2;  // ±12 semitones
    dacOutput(outValue + transAmt);
}
```

**How it works:** On each clock tick, the current CV input is stored at position `currValue` in a 9-element circular buffer. The output reads from a different position in the buffer, offset by the Knob 1 value. Since the buffer is circular and the write position advances each tick, the output replays values from 1-8 ticks ago.

**The transposition trick:** Knob 2 is divided by 41 (giving 0-24) then offset by -12, giving a range of -12 to +12. Left-shifted by 2 (`<< 2`), this becomes ±48 DAC steps — approximately ±12 semitones.

**Found in:** `official/AC21_ShiftRegister`

---

### 9.3 Mathematical Sequence Clocking (community sketches)

Some community sketches use mathematical sequences as clock sources:
- **Prime numbers** — a master counter is checked against a list of primes; clock fires only on prime-numbered steps
- **Fibonacci sequence** — inter-trigger intervals follow the Fibonacci series
- **Recaman's sequence** — a sequence where each step goes back N if that position is available, or forward N otherwise

These produce rhythms that are structured but non-repeating (or very long cycles), which is impossible with standard clock dividers or Euclidean patterns.

**Found in:** `community/asct/` sketches

---

## 10. Quantization Techniques

### 10.1 Bit-Shift Quantization

The simplest approach — divide the 10-bit ADC reading into N equal steps using right-shifts:

```cpp
int note = analogRead(2) >> 4;   // 0-63 (roughly semitones)
dacOutput(note << 2);             // scale back to 0-252
```

This is fast (single CPU cycle per shift) but the step boundaries don't perfectly align with 1V/octave tuning.

---

### 10.2 Lookup Table Quantizer (AC02_Quantizer)

For precise 1V/octave quantization, a 61-entry lookup table stores the ADC thresholds for each semitone boundary:

```cpp
const int qArray[61] = {
    0, 9, 26, 43, 60, 77, 94, 111, 128, 145, 162, 180,
    197, 214, 231, 248, 265, 282, 299, 316, 333, 350, ...
};

int vQuant(int v) {
    int tmp = 0;
    for (int i = 0; i < 61; i++) {
        if (v >= qArray[i]) tmp = i;
    }
    return tmp;  // 0-60 semitone number
}
```

**Why a lookup table:** The relationship between DAC voltage and musical pitch isn't perfectly linear (though it's close on the ArdCore). The table compensates for any non-linearity in the DAC ladder.

**The linear scan:** Searching all 61 entries every time is O(n) — not the fastest, but at the loop rates involved (~2-3kHz), it's completely fine. A binary search would be faster but harder to read and unnecessary here.

**Output scaling:** The returned semitone number (0-60) is left-shifted by 2 to fill the 0-255 DAC range: `dacOutput(outValue << 2)`.

**Found in:** `official/AC02_Quantizer`

---

## 11. Utility Techniques Used Everywhere

### 11.1 ADC Prescaler Speed Hack

Standard `analogRead()` uses a prescaler of 128, giving ~100μs per conversion. For audio-rate sketches, reducing the prescaler to 16 gives ~13μs — about 8x faster:

```cpp
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))

sbi(ADCSRA, ADPS2);   // prescaler = 16
cbi(ADCSRA, ADPS1);
cbi(ADCSRA, ADPS0);
```

**The trade-off:** Lower prescaler = faster conversion but reduced accuracy. At prescaler 16, you lose about 1-2 bits of effective resolution. For 8-bit audio output, this doesn't matter — you're throwing away the bottom 2 bits anyway.

**Found in:** Almost every audio-rate sketch (AC24, LFSR, NOISEMAKER, all bytebats, all waveshapers)

---

### 11.2 De-Jitter Hysteresis Filter

Analog reads are inherently noisy. The ArdCore convention is a `deJitter()` function that rejects small changes:

```cpp
int deJitter(int v, int test)
{
    if (abs(v - test) > 8) {
        return v;       // significant change — accept
    }
    return test;        // noise — keep old value
}
```

**Usage:**
```cpp
int cvValue = 0;
cvValue = deJitter(analogRead(2), cvValue);
```

**Threshold choices:** `> 8` for most purposes, `> 2` for quantizers that need higher precision, or removed entirely for gate thresholds.

**Found in:** Almost every official sketch

---

### 11.3 Direct Port Manipulation for DAC Output

Two versions exist in the codebase:

**Fast version (official sketches):**
```cpp
void dacOutput(byte v)
{
    PORTB = (PORTB & B11100000) | (v >> 3);
    PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}
```

This is two port writes with bit masking — takes about 1μs.

**Slow version (snazzy_fx sketches):**
```cpp
void dacOutput(long v)
{
    int tmpVal = v;
    bitWrite(PORTD, 5, tmpVal & 1);
    bitWrite(PORTD, 6, (tmpVal & 2) > 0);
    bitWrite(PORTD, 7, (tmpVal & 4) > 0);
    bitWrite(PORTB, 0, (tmpVal & 8) > 0);
    bitWrite(PORTB, 1, (tmpVal & 16) > 0);
    bitWrite(PORTB, 2, (tmpVal & 32) > 0);
    bitWrite(PORTB, 3, (tmpVal & 64) > 0);
    bitWrite(PORTB, 4, (tmpVal & 128) > 0);
}
```

This writes each bit individually — about 4x slower. Both produce the same output, but the fast version also has the advantage of being **glitch-free**: both ports are written in single operations, so intermediate states (where some bits have changed but others haven't) are minimised. The slow version can produce brief voltage glitches between bit writes that may be audible as high-frequency noise on the output.

---

### 11.4 Trigger/Gate Output Pattern

The universal pattern for outputting triggers on the digital pins:

```cpp
// Fire trigger:
digState[0] = HIGH;
digMilli[0] = millis();
digitalWrite(digPin[0], HIGH);

// Turn off after trigTime ms (in loop):
if ((digState[0] == HIGH) && (millis() - digMilli[0] > trigTime)) {
    digState[0] = LOW;
    digitalWrite(digPin[0], LOW);
}
```

**trigTime** is typically 10-25ms. This pattern appears in every sketch that outputs triggers.

---

### 11.5 Timer ISR Setup for Audio Output

For audio-rate output where pitch stability matters, a hardware timer ISR replaces `loop()` as the sample output clock:

**Timer2 CTC mode** (used in AC33 wavetable oscillator):
```cpp
cli();
TCCR2A = (1 << WGM21);     // CTC mode
TCCR2B = (1 << CS21);       // /8 prescaler → 2MHz tick
OCR2A  = 29;                // compare value → 66.67kHz
TIMSK2 = (1 << OCIE2A);     // enable compare match interrupt
sei();

ISR(TIMER2_COMPA_vect) {
    // Output one sample — runs at fixed 66.67kHz rate
}
```

**Timer2 overflow mode** (used in Auduino):
```cpp
TCCR2A = _BV(COM2B1) | _BV(WGM20);   // phase-correct PWM
TCCR2B = _BV(CS20);                    // no prescaler → 31.25kHz
TIMSK2 = _BV(TOIE2);                   // overflow interrupt

SIGNAL(TIMER2_OVF_vect) {
    // Output one sample — runs at ~31.25kHz
}
```

**Timer1 CTC mode** (used in Dead City Radio):
```cpp
TCCR1A |= (1 << WGM10);
TCCR1B |= (1 << WGM13) | (1 << CS11);
OCR1A = 200;                // variable — controls pitch
TIMSK1 |= (1 << OCIE1A);

ISR(TIMER1_COMPA_vect) {
    // Output one sample
}
```

**The key difference:** Timer2 CTC with a fixed OCR2A gives a constant sample rate (the wavetable oscillator controls pitch via the phase increment). Timer1 with a variable OCR1A controls pitch by changing the sample rate itself (Dead City Radio approach — the noise buffer plays faster or slower).

---

### 11.6 Compound Sketch Pattern

Pack multiple programs into one .ino and select at boot time based on knob position:

```cpp
int sketchVar = analogRead(0) >> 8;  // 0-3

void setup() {
    switch (sketchVar) {
        case 0: setup_0(); break;
        case 1: setup_1(); break;
        // ...
    }
}

void loop() {
    switch (sketchVar) {
        case 0: loop_0(); break;
        case 1: loop_1(); break;
        // ...
    }
}
```

This avoids having to re-upload to switch between related programs. Set the knob before powering on, and the module runs a different program.

**Found in:** `official/CP01_Compound01`, `official/CP02_Compound02`

---

### 11.7 EEPROM Persistent Storage

For saving sequences or settings between power cycles. Uses a 4-byte tag for data integrity:

```cpp
#include <EEPROM.h>

void writeEEPROM() {
    EEPROM.write(0, 'A');  // tag: 'AC27'
    EEPROM.write(1, 'C');
    EEPROM.write(2, '2');
    EEPROM.write(3, '7');
    for (int i = 0; i <= MAXPOS; i++) {
        EEPROM.write(5 + i, recordBuffer[i]);
    }
}
```

On boot, the tag is checked first. If it doesn't match, the data is initialised to defaults. This prevents reading garbage from fresh EEPROM.

**Write cycle limit:** EEPROM is rated for ~100,000 write cycles. Only write on explicit user action (mode change, etc.), never on every loop iteration.

**Found in:** `official/AC23_VoltageRecorder`, `official/AC27_101SEQ`

---

## 12. Summary: Tricks at a Glance

| Category | Technique | Key Principle | Example Sketch |
|----------|-----------|---------------|----------------|
| **Oscillator** | Timed-toggle square | `micros()` half-period lookup | AC24_SimpleVCO |
| **Oscillator** | Ramp counter saw/tri | `for` loop incrementing DAC | ARDCORE_TRIANGLE |
| **Oscillator** | Phase accumulator + wavetable | 16-bit acc → 8-bit index → PROGMEM | AC33_SSQScreecherWT |
| **Oscillator** | Dual-grain granular | Two triangle accumulators + exponential decay | ARDCORE_auduino_v5 |
| **Noise** | 16-bit Fibonacci LFSR | XOR taps at x^16+x^14+x^13+x^11+1 | LFSR |
| **Noise** | 32-bit Galois LFSR | Single-operation feedback `^ 0xD0000001u` | LFSR32, SDIY_NOISE |
| **Noise** | XOR-shift PRNG + buffer | Double-buffered ISR playback | DeadCityRadio |
| **Noise** | ADC multiplication | Aliasing from overflow truncation | ARDCORE_NOISEMAKER |
| **Bytebeat** | Counter arithmetic | `(t*9 & t>>4 \| t*5 & t>>7)` | drumsandmelody |
| **CA Synthesis** | 1D Wolfram rules | 3-cell neighbourhood → rule byte lookup | CELLULAR_AUTOMATA_SYNTH |
| **CA Synthesis** | Counter-nibble fractal | Byte extraction + masking + threshold | fraktal_synth |
| **Delay** | Circular buffer + feedback | `delArr[pointer] = input + delayed * fb` | BLOG_DELAY_BEST |
| **Reverb** | Dual-tap comb filter | Two fixed-offset reads from 1800-byte buffer | reverb_prttygood |
| **Distortion** | Nibble swap | Extract high/low 4-bit, recombine swapped | DISTORTION |
| **Distortion** | Bit-shift XOR | Array of shifted copies, XOR two together | waveshpr2 |
| **Ring Mod** | Multiply two inputs | Half-rectified due to unipolar ADC | AC28_RectifiedRingMod |
| **LFO** | Float accumulator + warp | Asymmetric up/down rates per millisecond | AC19_ShapedLFO |
| **LFO** | sin() brute force | Variable samples-per-cycle for speed | ARD_SINE_LFO |
| **Envelope** | Float AD accumulator | State machine: 0/1/-1, per-iteration step | AC25_VCAREnvelope |
| **Envelope** | Bouncing ball physics | Exponential restitution + linear friction | AC32_BouncingBall |
| **Sequencing** | Euclidean rhythm | Bjorklund pulse distribution algorithm | AC30_DualEuclidean |
| **Sequencing** | Analog shift register | Circular buffer, clock-advanced, offset read | AC21_ShiftRegister |
| **Quantization** | Lookup table 1V/oct | 61-entry threshold table, linear scan | AC02_Quantizer |
| **Utility** | ADC prescaler hack | `/16` instead of `/128` for 8x faster reads | everywhere |
| **Utility** | De-jitter hysteresis | Reject changes < threshold | everywhere |
| **Utility** | Fast port DAC write | Two masked PORTB/PORTD writes | everywhere |
| **Utility** | Timer ISR sample clock | CTC mode at 31-67kHz for stable audio output | AC33, Auduino, DCR |

---

## 13. What's NOT in This Repo (But Could Be)

Techniques that are feasible on the ATmega328P but aren't represented in the current sketch collection:

- **Band-limited wavetables** — pre-computed tables with harmonics below Nyquist for alias-free synthesis. Would reduce the metallic aliasing artifacts at high pitches. Costs more flash (multiple tables per waveform at different frequency ranges).
- **Karplus-Strong synthesis** — a short delay buffer with filtered feedback creates plucked-string sounds. The 900-sample delay buffer from the delay sketches would be sufficient.
- **FM synthesis** — two phase accumulators where one modulates the other's frequency. The Auduino's dual-oscillator architecture is already close to this.
- **Wavetable morphing** — interpolating between two wavetables using a CV. Cross-fade by computing `(1-alpha) * tableA[i] + alpha * tableB[i]`. Doubles the PROGMEM reads per sample but should fit within the ISR budget.
- **Sample playback** — storing short audio samples in PROGMEM and playing them back at variable rates. Limited to ~3 seconds at 8kHz/8-bit due to the 32KB flash constraint. Would need external flash/SD for anything longer.
- **Formant synthesis** — multiple bandpass filters or formant-shaped wavetables for vowel-like sounds. Feasible with PROGMEM lookup tables.
