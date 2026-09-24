# ArdCore Techniques

The synthesis and DSP tricks used across the sketches in this repo, grouped by technique rather than by sketch, since the same idea turns up in several places. Each section names the sketch it comes from.

---

## The platform

Every sketch here runs on an ATmega328P (Arduino Nano) at 16MHz:

- An 8-bit R-2R DAC on pins 5-12 (0-255 out).
- 2KB of SRAM. This is what limits delay buffers and sequence lengths.
- 32KB of flash, which leaves plenty of room for code and `PROGMEM` tables.
- Four analog inputs: A0 and A1 are knobs, A2 and A3 are knob-and-jack inputs reading 0-5V.
- Two digital outputs on pins 3 and 4.
- A clock input on pin 2, with a hardware interrupt.
- No floating-point unit. Floats work, but in software and slowly.

Nearly everything ends in `dacOutput(byte v)`, which writes the DAC through the port registers:

```cpp
void dacOutput(byte v)
{
  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}
```

Two masked writes, one to each port, instead of eight `digitalWrite()` calls. The official sketches all use this version. Many of the Snazzy FX sketches use an older bit-by-bit one (11.3).

---

## 1. Oscillators

### 1.1 Timed square wave (AC24_SimpleVCO)

The simplest VCO. A 128-entry table holds the half-period in microseconds for each MIDI note. The loop watches `micros()` and flips the output between 0 and 255 when the time is up:

```cpp
if ((currMicros - lastMicros) > usNote[currNote + currOffset]) {
    digState = 255 - digState;
    dacOutput(digState);
    lastMicros = currMicros;
}
```

The half-period sets the pitch: `usNote[]` has entries like `4545.454590`. A2 is shifted right by 3 to get 0-127, an index straight into the table, and the A0 knob adds an offset to transpose.

It can only make a square wave, since the output is either 0 or 255. The pitch also depends on how quickly `loop()` comes round to check the time, so anything that slows the loop down shows up as jitter.

To keep the loop fast, it drops the ADC prescaler from 128 to 16, which takes `analogRead()` from about 100μs to about 13μs:

```cpp
sbi(ADCSRA, ADPS2);
cbi(ADCSRA, ADPS1);
cbi(ADCSRA, ADPS0);
```

**In:** `official/AC24_SimpleVCO`

---

### 1.2 Counting saw (SIMPLEST_SAWTOOTH)

A `for` loop counts 0 to 100 into the DAC, over and over. A ramp that resets is a sawtooth:

```cpp
for (n = 0; n <= 100; n++) {
    dacOutput(n);
}
```

It runs flat out. There's a `delayMicroseconds(analogRead(2))` inside the loop for pitch control, commented out, so as it stands the pitch is fixed by how long each pass takes.

**In:** `snazzy_fx/dans_trashy_mods/SIMPLEST_SAWTOOTH`

---

### 1.3 Counting triangle (ARDCORE_TRIANGLE)

Two loops, one up and one down, with a `delayMicroseconds()` after each step. A2 sets the delay, and so the pitch:

```cpp
val = map(analogRead(2), 0, 1023, 145, 5);
for (int n = 0; n < 128; ++n) { dacOutput(n * 2); delayMicroseconds(val); }
int value = 255;
for (int n = 128; n < 256; ++n) { dacOutput(value); value -= 2; delayMicroseconds(val); }
```

AC19_ShapedLFO does the same thing with a float and separate rates for the two halves, so it can skew the shape (7.1).

**In:** `snazzy_fx/EXPERIMENTAL_AUDIO/ARDCORE_TRIANGLE`

---

### 1.4 Phase accumulator and wavetables (AC33_SSQScreecherWT)

Ported from yorkmodular's tinydvco (see tinydvco_to_ardcore_port.md). A Timer2 interrupt fires at 66.67kHz. Each time, it adds a phase increment to a 16-bit phase accumulator and uses the top 8 bits to pick one of 256 samples from a table in flash:

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

Compared with the loop-based oscillators above:

1. The pitch is steady. The interrupt fires at a fixed rate whatever `loop()` is doing, so `analogRead()` doesn't make it wobble.
2. Any waveform you can put in 256 bytes will play.
3. The pitch comes from the size of the increment, not from how fast the code runs.

The accumulator is a position within one cycle of the wave. A small increment moves through the table slowly and gives a low note, a big one skips through and gives a high note. When the 16 bits overflow, it wraps back to the start and the cycle repeats. The bottom 8 bits are a fraction between samples, and they're ignored: there's no interpolation.

**Pitch table:** a 1024-entry table in flash, `freqTable`, turns the 10-bit pitch reading straight into an increment. The table is exponential, for 1V/oct, so the chip never has to call `exp()` or `pow()`, which are far too slow.

**Saw and square** don't need tables:

```cpp
case WT_SAW:
    val = step;                           // the position is the saw
    break;
case WT_SQUARE:
    val = (step < 128) ? 0x00 : 0xFF;
    break;
```

That saves 512 bytes of flash.

**Phase modulation:** A3 adds an offset to the table index before the lookup:

```cpp
uint8_t idx = step + phaseOffset;  // phaseOffset from analogRead(3)
val = pgm_read_byte_near(tbl + idx);
```

The index is 8 bits, so it wraps by itself and there's nothing to bounds-check.

**Hard sync:** the clock input sets a flag, and the interrupt resets the accumulator:

```cpp
if (clkState) {
    clkState = LOW;
    syncPhaseAcc = 0;
}
```

Feed CLK a different frequency from the oscillator's and the resets cut each cycle short, which is the classic sync sound.

**Waveform knob smoothing:** the last four readings of A0 are averaged before picking a waveform, so a noisy pot doesn't flick between two. Four is a power of two, so the divide is a shift:

```cpp
waveBuff[waveBuffStep++] = waveIdx;
if (waveBuffStep >= WAVE_BUFF_LEN) {
    uint16_t acc = 0;
    for (int i = 0; i < WAVE_BUFF_LEN; i++) acc += waveBuff[i];
    currentWave = (acc >> WAVE_BUFF_SHIFT);  // >> 2, divide by 4
    waveBuffStep = 0;
}
```

**Room:** each table is 256 bytes. AC33 has five, plus the computed saw and square. With about 25KB of flash free after the pitch table and the code, there's room for close to a hundred more. The ATtiny85 that tinydvco was written for has 8KB in total.

**In:** `community/user_submitted/AC33_SSQScreecherWT`

---

### 1.5 Granular synthesis (Auduino)

Peter Knight's Auduino, adapted by Dan Snazelle. A Timer2 overflow interrupt runs at about 31kHz. A master oscillator sets the grain rate, and each time it wraps, two grain oscillators restart:

```cpp
SIGNAL(PWM_INTERRUPT)
{
  syncPhaseAcc += syncPhaseInc;
  if (syncPhaseAcc < syncPhaseInc) {
    // Sync oscillator overflowed, start new grain
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

1. When the master accumulator overflows (the new value is smaller than the increment), both grains start again from zero at full level.
2. Each grain is a triangle made from a ramp. When the top bit of the accumulator is set, the value is flipped with `~`, so the second half of the ramp runs back down.
3. Each grain fades out: every sample it loses a fraction of its current level, `(grainAmp >> 8) * grainDecay`, which is an exponential decay in fixed point.
4. The two grains are added together.

The code has three ways to turn the pitch knob into a rate: a smooth exponential curve (`antilogTable[]`, 64 entries), chromatic steps (`midiTable[]`, 128 entries) and a pentatonic scale (`pentatonicTable[]`, 54 entries). v5 uses the pentatonic one. The smooth version gets a whole exponential curve out of 64 values: `antilogTable[input & 0x3f] >> (input >> 6)`. The bottom 6 bits pick the entry and the top bits say how many octaves to shift it down.

**In:** `snazzy_fx/ARDCORE_auduino_v5`

---

### 1.6 Two-tone drone (ARDCORE_twotone_mod)

A port of yerpa58's drone. Two wavetable oscillators crossfade under LFO control, a 512-byte buffer adds chorus, and four LFOs move the crossfade, the chorus speed and depth, and a ring-mod envelope. The original doesn't fit in the chip's RAM, and it plays only a quarter of each table. `ARDCORE_twotone_mod_fixed` moves the tables to flash and fixes the indexes and the mixing maths; its header lists all four problems.

**In:** `snazzy_fx/FRAKTAL_SYNTH_PORTS/ARDCORE_twotone_mod`, `snazzy_fx/FRAKTAL_SYNTH_PORTS/ARDCORE_twotone_mod_fixed`

---

### 1.7 FM (fac_fm_osc)

By Alfonso Alba. Two sine oscillators, one modulating the other's frequency. A0 and A2 set the pitch (A2 is 1V/oct), A1 offsets the modulator's pitch, A3 sets the modulation depth, and CLK hard-syncs the carrier. `fac_fm_osc_fixed` builds with current tools and gives DAC bit 6 back: the original also drove pin 11 from Timer2, and pin 11 is that bit.

**In:** `snazzy_fx/fac_fm_osc`, `snazzy_fx/fac_fm_osc_fixed`

---

## 2. Noise

### 2.1 16-bit LFSR

A 16-bit register shifts right one place per step, and the bit fed in at the top is the XOR of four tap bits:

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

With these taps (16, 14, 13, 11) the register goes through all 65,535 non-zero values before it repeats. That makes it a maximal-length sequence, and it sounds like white noise. Most tap choices give shorter cycles; these come from the standard tables. The DAC gets the low 8 bits.

The `do ... while` stops when the register gets back to its starting value, then `loop()` runs it again.

**In:** `snazzy_fx/LFSR/LFSR`

---

### 2.2 32-bit LFSR, Galois form

The same idea in one line:

```cpp
lfsr = (lfsr >> 1) ^ (-(lfsr & 1u) & 0xD0000001u);
```

`-(lfsr & 1u)` is all zeros if the bottom bit is 0 and all ones if it's 1. ANDing that with `0xD0000001u` gives either nothing or the tap pattern, and the XOR applies it. The polynomial is x^32 + x^31 + x^29 + x + 1.

It runs for 4,294,967,295 steps before repeating, which at audio rates is far longer than you'll ever listen.

`SDIY_ARDCORE_NOISE` steps a 32-bit register from a Timer2 overflow interrupt at about 31kHz, and writes each value both to the DAC and to pin 11 as PWM. Pin 11 is also DAC bit 6, so that bit carries the PWM rather than the noise.

**In:** `snazzy_fx/LFSR/LFSR32`, `snazzy_fx/WHITE_NOISE/SDIY_ARDCORE_NOISE`

---

### 2.3 Buffered noise (Dead City Radio)

By Ascetic. `loop()` fills a 128-sample buffer from a floating-point shift-and-add generator:

```cpp
g_x1 ^= g_x2;
*_fpDstBuffer = (g_x2 * _fLevel);
g_x2 += g_x1;
```

A Timer1 interrupt plays the buffer out at a rate set by `OCR1A`, which is how the pitch is controlled. When it reaches the end it sets `buffFlag`, and `loop()` refills the buffer.

A3 is meant to smooth it by averaging neighbouring samples. In the original, the averaging picks samples from the wrong end of the buffer (and one index is never set), so the noise gets quieter rather than darker, and a `==` where `=` was meant keeps the buffer refilling nonstop. The `_fixed` copies of all three versions average each sample with the ones just before it, which is a real low-pass.

**In:** `community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_AudioRate`

---

### 2.4 Multiply and wrap (ARDCORE_NOISEMAKER)

Dan Snazelle's "as simple as it gets":

```cpp
void loop() {
  dacOutput(analogRead(2) * analogRead(0));
}
```

Two 10-bit readings multiplied give up to 20 bits. The DAC routine keeps only the low 8, so the product wraps round many times across its range. A still input gives a fixed level; a moving one (an LFO into A2) folds into a buzz, brighter the further A0 is turned up.

**In:** `snazzy_fx/EXPERIMENTAL_AUDIO/ARDCORE_NOISEMAKER`

---

## 3. Bytebeat

Bytebeat comes from viznut (Ville-Matias Heikkilä) in 2011: a counter `t` goes up by one per sample, and a single expression of shifts, ANDs and ORs on `t` gives the output. No tables, no buffers.

### 3.1 The basic loop

```cpp
void loop() {
  long t;
  for (t = 0; ; t++) {
    myval = (3 * t & t >> 8);
    dacOutput(myval);
  }
}
```

The `for` never ends, so `loop()` never returns and the counter runs as fast as the chip will go. `pretty1` adds scaled copies of the result together before sending it out.

**In:** `snazzy_fx/BYTEBEAT_CV_and_AUDIO/pretty1`

### 3.2 Layers and speed control

Several terms ORed together make patterns at different speeds:

```cpp
myval = (t*9 & t>>4 | t*5 & t>>7 | t*38 & t>>10) - 1;
```

The shift sets the time scale: `t>>4` changes quickly and gives the fast, hi-hat-like parts, and `t>>10` changes slowly and gives the melody. The OR puts them together.

A delay between steps makes the speed voltage-controlled:

```cpp
for (t = 0; ; t++) {
    delayMicroseconds(1 + analogRead(2));
    myval = (t*9 & t>>4 | t*5 & t>>7 | t*38 & t>>10) - 1;
    dacOutput(myval);
}
```

With A2 at 0V it runs at audio rate; turned up, it slows until it's a stepped CV pattern. The `+ 1` avoids a zero delay.

**In:** `snazzy_fx/BYTEBEAT_CV_and_AUDIO/drumsandmelody`, `sloe_dub`, `fucking_techno` and the rest of that folder.

---

## 4. Cellular automata and counters

### 4.1 Wolfram cellular automaton (CELLULAR_AUTOMATA_SYNTH)

Eric Boger's CA synth, ported by Dan Snazelle. A row of 34 cells, each on or off, evolves by a rule number from 0 to 255 (set by A2). Each cell's next state depends on itself and its two neighbours:

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

The cells don't become samples directly. As the row is worked out, living cells build up `CA_tonerate`, and that sets how often a square wave flips:

```cpp
CA_tonecnt--;
if (CA_tonecnt == 0) {
    CA_tonecnt = CA_tonerate;
    CA_out = ~CA_out;  // toggle between 0 and 255
}
```

A bigger rate means a longer wait between flips and a lower note. Every so often it runs the automaton again and the pitch jumps. A0 sets how often, A1 how many generations each time, A2 the rule and A3 which cells count. Rule 30 and rule 110 sound nothing alike.

The row is stored twice, `[0]` and `[1]`, and the two swap roles each generation. That way the new row is written to one copy while the old one is still there to read.

**In:** `snazzy_fx/FRAKTAL_SYNTH_PORTS/CELLULAR_AUTOMATA_SYNTH`

---

### 4.2 Counter arithmetic (fraktal_synth)

Also Eric Boger's, ported by Dan Snazelle. A 16-bit counter goes up by one each pass. Its two bytes are masked and multiplied by knob values:

```cpp
FS_cnthi = make8(FS_cnt, 1) & param1;  // high byte, masked
FS_cntlo = make8(FS_cnt, 0);            // low byte
FS_out = FS_cnthi * FS_cntlo;           // multiply
FS_out = FS_out * param2;               // scale

if (param3 != 255) {
    if (FS_out & param3) FS_out = 255;  // threshold to on/off
    else                 FS_out = 0;
}

FS_cnt++;  // advance counter
```

`make8(val, n)` picks byte n out of a value: `((val >> (n * 8)) & 0xff)`.

The counter moves in a straight line, but the masking and multiplying scramble it into repeating patterns, and the threshold turns those into an on/off wave. It's close to bytebeat, working on whole bytes of the counter. The clock input switches between two versions of the algorithm. It reads the knobs on every pass, so it only makes about 2,000 samples a second, and it sounds gritty and rhythmic rather than tonal.

**In:** `snazzy_fx/FRAKTAL_SYNTH_PORTS/fraktal_synth`

---

## 5. Delay and echo

### 5.1 Ring buffer delay

Dan Snazelle's delays all work like this. One buffer, a write pointer that goes round it, and a read pointer some distance away:

```cpp
const short arraySize = 900;
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

The read pointer is `delayLength` ahead of the write pointer. In a ring buffer, that means `arraySize - delayLength` behind it, so the delay knob works backwards: turning it up makes the delay shorter. The `_fixed` copies of BLOG_DELAY_BEST and Long_DELAY_BEST read `delayLength` behind instead (`pointer + arraySize - delayLength`), so the knob goes the right way.

**Feedback:** the delayed sample is scaled and added to the input before it's written back, so each echo goes round again. A3 is divided by 1600 rather than 1024, which caps the feedback at about 0.64.

**Memory:** 900 samples at 2 bytes each is 1,800 bytes, most of the 2KB. One sample per pass through `loop()`, with the ADC sped up to prescaler 32, comes to about a tenth of a second at most. That's enough for slapback and comb-filter sounds.

**Output:** dry plus delayed is shifted right by 2 so it doesn't overflow the DAC.

**In:** `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/BLOG_DELAY_BEST` and the other sketches in that folder.

---

### 5.2 All-or-nothing feedback (BLOG_DELAY_BEST)

One line, commented "VERY COOL EFFECT!!", makes this sketch what it is:

```cpp
feedback = ((feedback) && (random(500)));
```

`&&` returns true or false, so `feedback` becomes 1 or 0. With A3 anywhere above zero, feedback is 1: full feedback. `random(500)` returns 0 about once in 500 samples, and then feedback is 0 for that sample. With full feedback the echoes never fade, they build up until the numbers wrap, and the random dropouts break them up. The result is a glitchy, stuttering loop rather than a clean echo. The fixed copy keeps this on purpose.

**In:** `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/BLOG_DELAY_BEST`

---

### 5.3 Two echoes (reverb_prttygood)

Called a reverb. It keeps the input in an 1,800-byte buffer and adds two earlier samples to it, 900 and 1,799 samples back, at a quarter and an eighth of the level:

```cpp
char signal[1800];  // signed

echo1 = pos - 900;
echo2 = pos - 1799;
if (echo1 < 0) echo1 = 1800 + pos - 900;
if (echo2 < 0) echo2 = 1800 + pos - 1799;

S1out = S1out + (signal[echo1] >> 2) + (signal[echo2] >> 3);
```

That's about 45ms and 90ms. There's no feedback, so it's two fixed echoes rather than a tail.

The buffer is `char`, signed, so samples run from -128 to 127 around a centre of zero. Echoes can then cancel as well as add. With unsigned samples they would only ever add, and the sum would pile up at the top.

It slows the ADC down on purpose, to prescaler 64:

```cpp
sbi(ADCSRA, ADPS2);
sbi(ADCSRA, ADPS1);
cbi(ADCSRA, ADPS0);
```

A slower read means fewer samples a second, so the same 1,800 bytes cover more time. The buffer can't grow, so time is stretched instead.

The input line has a typo: `analogRead(3)>>2-CENTERPOS`. C does the subtraction first, so that's a shift by -126, which does nothing here, and the 10-bit reading is cut to its low 8 bits. The input wraps round four times across its range. `reverb_prttygood_fixed` corrects it and moves the output back to the middle of the DAC.

**In:** `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/reverb_prttygood`, `reverb_prttygood_fixed`

---

## 6. Waveshaping and distortion

### 6.1 Nibble swap (DISTORTION)

By Dan Snazelle. The top and bottom 4 bits of each sample swap places:

```cpp
#define CENTERPOS 128

void distortion(void) {
    unsigned int temp1, temp2;
    if ((S1out > 10) || (S1out < -10)) {
        temp1 = (((int)S1out + CENTERPOS) >> 4) & 0xf;  // high nibble, moved down
        temp2 = (((int)S1out + CENTERPOS) & 0xF) << 4;  // low nibble, moved up
        S1out = ((((temp1 + temp2) & 0x7F) - CENTERPOS)) >> 2;
    }
}
```

Normally a bigger input gives a bigger output. After the swap, a small change in the input can make a big jump in the output, so the wave gets chopped into a harsh digital scramble, somewhere between a bitcrusher and a wavefolder. Quiet signals (within 10 of the centre) pass through untouched.

Adding `CENTERPOS` moves the signed sample to 0-255 for the swap, and subtracting it moves it back. `& 0x7F` keeps 7 bits and `>> 2` brings the level down.

A `delayMicroseconds(map(analogRead(0), 0, 1023, 22000, 1))` after each sample also lowers the sample rate: fully left holds each sample for 22ms, fully right runs at full speed. A3 does the same up to 32ms.

**In:** `snazzy_fx/EXPERIMENTAL_AUDIO/DISTORTION`

---

### 6.2 XOR of shifted copies (waveshpr2)

By Dan Snazelle. It makes shifted copies of the input and XORs two of them:

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

Each shift lines different bits of the sample up against each other, so each pair gives a different kind of bit-level distortion. In the original, `x` and `v` are reset at the start of every call, so it always XORs the same pair (copies 2 and 1), and the array is declared with 10 entries but filled with 11. `waveshpr2_fixed` sizes the array properly and lets A1 and A2 pick the two copies, as the sketch's header describes.

**In:** `snazzy_fx/EXPERIMENTAL_AUDIO/waveshapers/waveshpr2`, `waveshpr2_fixed`

---

### 6.3 Rectified ring mod (AC28_RectifiedRingMod)

Multiply A2 by A3:

```cpp
inputA = analogRead(2) >> 2;      // 0-255
inputB = analogRead(3) >> 2;      // 0-255
output = (inputA * inputB) >> 1;  // multiply, then halve
dacOutput(output);
```

The inputs only read 0 to 5V, so the negative half of a bipolar signal reads as zero. Each input is half-wave rectified before it's multiplied, which the code comments call "very clangorous". The product can reach 32,512 after the shift, far more than the DAC's 255, and `dacOutput()` keeps only the low byte, so it wraps round as well. That wrapping adds a lot of extra grit.

It lowers the ADC prescaler to keep the loop fast enough for audio.

**In:** `official/AC28_RectifiedRingMod`

---

## 7. LFOs and modulation

### 7.1 Shaped LFO (AC19_ShapedLFO)

A float counts from 0 to 511 by elapsed milliseconds, and the top half is folded back down to make a triangle:

```cpp
unsigned long now = millis();
int elapsed = now - lastMillis;

if (currValue > 255.0) {
    currDir = 0;
} else {
    currDir = 1;
}

if (currDir) {
    currValue += elapsed * upStep;
} else {
    currValue += elapsed * downStep;
}

while (currValue > 511.0) currValue -= 511.0;

if (currValue <= 255.0) {
    dacOutput((byte)currValue);
} else {
    dacOutput((byte)(511.0 - currValue));
}

lastMillis = now;
```

The count only goes up. It goes up at one rate in the first half, where the output rises, and another in the second half, where the output falls. A1 sets how the cycle is split between the two:

```cpp
float msPerCycle = ((1023 - analogRead(0)) + 20) * 3.0;
float warpFactor = ((analogRead(1) >> 4) + 1) / 65.0;

upStep   = 255.0 / (msPerCycle * warpFactor);
downStep = 255.0 / (msPerCycle * (1.0 - warpFactor));
```

At a warp of 0.5 it's a plain triangle. Near 0 it rises almost at once and falls slowly, a falling ramp. Near 1 it rises slowly and drops fast, a rising ramp.

D0 fires at the top of each cycle and D1 at the bottom, for syncing other modules.

**In:** `official/AC19_ShapedLFO`

---

### 7.2 Sine with sin() (ARD_SINE_LFO)

By Dan Snazelle. It calls `sin()` for every sample:

```cpp
#include <math.h>

float angleincr = TWO_PI / nsamps;
for (int i = 0; i < nsamps; i++) {
    float samp = sin(angleincr * i);
    dacOutput((unsigned char)((samp * 127.5) + 127.5));
}
```

The speed comes from the number of samples per cycle, `nsamps = analogRead(2) * 4`: fewer samples means a faster cycle with coarser steps. `sin()` gives -1 to 1, and `* 127.5 + 127.5` turns that into 0 to 255.

Each `sin()` call takes on the order of 100μs, because it's done in software. A thousand samples per cycle is about a tenth of a second, so this is an LFO, not an audio oscillator.

**In:** `snazzy_fx/CV-LFO_SKETCHES/ARD_SINE_LFO`

---

### 7.3 Bouncing ball (AC32_BouncingBall)

A dropped ball: each bounce fires a trigger, and the gap to the next bounce shrinks each time:

```cpp
// On clock trigger: start the ball
accValue = accStart;   // first bounce time, from the knob, 0-2000ms
isRunning = 1;

// On each bounce:
float tmp = (accValue / accStart) * 255.0;  // height -> DAC value
dacOutput(floor(tmp));

accValue *= accFact;    // multiply down (0.49-0.99)
accValue -= accFric;    // then subtract a fixed amount (0-100ms)

nextTime = currTime + floor(accValue);  // schedule the next bounce

if (accValue < accLimit) {
    isRunning = 0;  // the ball has stopped
}
```

`accFact` is how much of each bounce carries on to the next. `accFric` takes a fixed amount off as well, so the ball always stops, even with `accFact` near 1.

The bounces speed up in a way a step sequencer can't easily do. D0 fires on each bounce, good for a drum, and D1 goes high when the ball stops. The DAC steps down with each bounce's height.

**In:** `official/AC32_BouncingBall`

---

## 8. Envelopes

### 8.1 Attack-decay (AC25_VCAREnvelope)

A float that goes up by one amount per loop and down by another. Its state is 0 (off), 1 (rising) or -1 (falling):

```cpp
if (envState == 1) {
    currValue += riseValue;
} else if (envState == -1) {
    currValue -= fallValue;
}

if (currValue > 255.0) {
    currValue = 255.0;
    envState = -1;  // start falling
    // trigger on D0 (top reached)
}

if (currValue < 0.0) {
    currValue = 0.0;
    envState = 0;   // done
    // trigger on D1 (end of envelope)
}

dacOutput((byte)currValue);
```

The rates:

```cpp
int riseSetting = analogRead(0) + analogRead(2) + 5;
riseValue = 255.0 / riseSetting;
```

Knob plus CV, plus 5 so it never divides by zero. At the minimum, 5, the step is 51 and it reaches the top in 5 passes. At the maximum, about 2051, the step is about 0.12 and it takes about 2,100 passes. Adding the knob and the CV means the knob sets the shortest time and the CV lengthens it.

AC29 is the looping version: it starts again as soon as it reaches zero, so it runs as an LFO with separate rise and fall times.

**In:** `official/AC25_VCAREnvelope`, `official/AC29_VCADLoopEnvelope`

---

### 8.2 ADSR (ADSR_ENV)

By Dan Snazelle. Attack and decay as above, then sustain while the gate is held, then release. A2 is the gate: above 120 counts it's on, below 100 it's off. The gap between the two stops a slow or noisy gate from chattering. A0 sets attack, A1 decay and A3 release. The sustain level is fixed in the code, with a comment telling you where to change it.

**In:** `snazzy_fx/ADSR_envelope/ADSR_ENV`

---

## 9. Sequencing and rhythm

### 9.1 Euclidean rhythms (AC30_DualEuclidean)

Spread N hits as evenly as possible over M steps:

```cpp
void euCalc(int ar) {
    for (int i = 0; i < 32; i++) euArray[ar][i] = 0;

    if (inPulses[ar] >= inSteps[ar]) {
        // as many hits as steps: every step
        for (int i = 0; i < inSteps[ar]; i++) euArray[ar][loc++] = 1;
    } else {
        int offs = inSteps[ar] - inPulses[ar];
        int ppc = offs / inPulses[ar];    // gaps per hit
        int rmd = offs % inPulses[ar];    // gaps left over

        for (int i = 0; i < inPulses[ar]; i++) {
            euArray[ar][loc++] = 1;                 // a hit
            for (int j = 0; j < ppc; j++)
                euArray[ar][loc++] = 0;             // its gaps
            if (i < rmd) euArray[ar][loc++] = 0;    // one extra for the first few
        }
    }
}
```

Take 3 hits in 8 steps. That leaves 5 gaps for 3 hits: `ppc = 1` each, with `rmd = 2` left over. The first two hits get two gaps and the last gets one: `[1,0,0, 1,0,0, 1,0]`. That's E(3,8), the tresillo.

There are two patterns on one clock, each with its own steps and hits controls (A0/A2 for the first, A1/A3 for the second), out on D0 and D1. A pattern is only worked out again when its knobs change, not on every loop, so the loop stays quick.

**In:** `official/AC30_DualEuclidean`

---

### 9.2 Analog shift register (AC21_ShiftRegister)

On each clock, store the input, then play back one of the stored values:

```cpp
if (clkState == HIGH) {
    clkState = LOW;

    value[currValue] = analogRead(2) >> 2;  // store the input
    currValue++;
    if (currValue > 8) currValue = 0;

    int tempOffset = 7 - (analogRead(0) >> 7);
    int outStep = (currValue + tempOffset) % 9;
    int outValue = value[outStep];

    int transAmt = ((analogRead(1) / 41) - 12) << 2;  // ±12 semitones
    dacOutput(outValue + transAmt);
}
```

Nine slots in a ring. The write position moves on one each clock, and A0 picks which slot to read, so the output is the input from 1 to 8 clocks ago.

A1 transposes: divided by 41 it gives 0-24, minus 12 gives -12 to +12, and `<< 2` turns semitones into DAC steps.

**In:** `official/AC21_ShiftRegister`

---

### 9.3 Number sequences as clocks (ASCTard007)

Ascetic's Rat_s_h__t counts clocks and fires when the count fits a rule. With the knob below noon the rule is a plain division: count modulo 1 to 128 for the internal clock, 1 to 64 for the outputs. Above noon it switches through primes, Fibonacci numbers, Fermat's little theorem and Recamán's sequence. A0 sets the rule for the internal clock, A2 for D0 and A3 for D1.

These give rhythms with a structure that doesn't repeat the way a divider or a Euclidean pattern does.

**In:** `community/asct/ASCTard007_Rat_s_h___t`

---

## 10. Quantizing

### 10.1 Shifting

The quick way, dividing the reading into 64 steps:

```cpp
int note = analogRead(2) >> 4;   // 0-63
dacOutput(note << 2);             // 0-252
```

It's fast, but the steps are 16 counts and a semitone on the input is about 17, so the steps drift off the notes as the voltage goes up.

---

### 10.2 Table of boundaries (AC02_Quantizer)

AC02 keeps a table of 61 thresholds, one per semitone over five octaves:

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
    return tmp;  // semitone 0-60
}
```

The thresholds are about 17 counts apart, one semitone on the input, and each sits half a semitone below its note, so a voltage rounds to the nearest note instead of the one below.

It checks all 61 every time. That's slow as searches go, but the loop only runs a few thousand times a second and it's quick enough.

The semitone number goes out at 4 DAC steps each: `dacOutput(outValue << 2)`.

**In:** `official/AC02_Quantizer`

---

## 11. Things used everywhere

### 11.1 Faster ADC

`analogRead()` normally uses prescaler 128 and takes about 100μs. Prescaler 16 takes about 13μs:

```cpp
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))

sbi(ADCSRA, ADPS2);   // prescaler 16
cbi(ADCSRA, ADPS1);
cbi(ADCSRA, ADPS0);
```

A faster conversion is a less accurate one, by a bit or two. With 8-bit output that doesn't matter: the bottom two bits get thrown away anyway.

**In:** 47 files set the prescaler, among them AC23, AC24, AC28, the LFSRs, most of the bytebeats, the delays and the waveshapers.

---

### 11.2 deJitter

Readings wobble. The official sketches ignore changes smaller than a threshold:

```cpp
int deJitter(int v, int test)
{
    if (abs(v - test) > 8) {
        return v;       // real change, take it
    }
    return test;        // wobble, keep the old value
}
```

```cpp
int cvValue = 0;
cvValue = deJitter(analogRead(2), cvValue);
```

`> 8` for most things, `> 2` for the quantizers, and nothing at all for gate inputs.

**In:** most of `official/`.

---

### 11.3 Two DAC routines

The official sketches use the port version:

```cpp
void dacOutput(byte v)
{
    PORTB = (PORTB & B11100000) | (v >> 3);
    PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}
```

Two port writes, about 1μs.

Many of the Snazzy FX sketches use a bit-at-a-time version:

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

It gives the same result more slowly. It also changes the output in eight small steps instead of two, so for a moment between writes the DAC holds a value that's partly old and partly new. At audio rates those in-between values can be heard as a faint high-frequency hash.

Both keep only the low 8 bits of what they're given, which is why products and sums that overflow wrap round instead of clipping (2.4, 6.3).

---

### 11.4 Triggers

The pattern in every sketch that sends triggers:

```cpp
// Fire:
digState[0] = HIGH;
digMilli[0] = millis();
digitalWrite(digPin[0], HIGH);

// Later, in loop():
if ((digState[0] == HIGH) && (millis() - digMilli[0] > trigTime)) {
    digState[0] = LOW;
    digitalWrite(digPin[0], LOW);
}
```

`trigTime` is usually 10 to 25ms.

---

### 11.5 Timer interrupts for audio

When the pitch has to be steady, a timer interrupt sends the samples out instead of `loop()`.

**Timer2, CTC** (AC33):

```cpp
cli();
TCCR2A = (1 << WGM21);     // CTC mode
TCCR2B = (1 << CS21);       // prescaler 8, 2MHz tick
OCR2A  = 29;                // every 30 ticks, 66.67kHz
TIMSK2 = (1 << OCIE2A);     // compare interrupt on
sei();

ISR(TIMER2_COMPA_vect) {
    // one sample, 66.67kHz
}
```

**Timer2, overflow** (Auduino, SDIY noise):

```cpp
TCCR2A = _BV(COM2B1) | _BV(WGM20);   // phase-correct PWM
TCCR2B = _BV(CS20);                    // no prescaler, about 31kHz
TIMSK2 = _BV(TOIE2);                   // overflow interrupt

SIGNAL(TIMER2_OVF_vect) {
    // one sample, about 31kHz
}
```

**Timer1, OCR1A as the top** (Dead City Radio):

```cpp
TCCR1A |= (1 << WGM10);
TCCR1B |= (1 << WGM13) | (1 << CS11);   // phase and frequency correct PWM, prescaler 8
OCR1A = 200;                            // changed at run time for pitch
TIMSK1 |= (1 << OCIE1A);

ISR(TIMER1_COMPA_vect) {
    // one sample
}
```

AC33 keeps the sample rate fixed and sets pitch with the phase increment. Dead City Radio changes the sample rate itself, so the same buffer plays faster or slower.

Timer0 runs `millis()` and `delay()`, which is why all three of these leave it alone. Timer2 also drives PWM on pins 3 and 11, so a sketch that takes Timer2 over shouldn't `analogWrite()` to D0 or to pin 11.

---

### 11.6 Compound sketches

Several programs in one upload, picked by the A0 knob at power-up:

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

Set the knob, power up, and you get that program without re-uploading.

**In:** `official/CP01_Compound01`, `official/CP02_Compound02`

---

### 11.7 EEPROM

Settings and sequences that survive power-off. A four-byte tag goes first:

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

At start-up the sketch checks the tag. If it isn't there, the EEPROM holds something else (or nothing), and the sketch starts from defaults instead.

EEPROM is good for about 100,000 writes per cell, so save when the player does something, like changing mode, and never on every loop.

**In:** `official/AC27_101SEQ`, and the compound sketches CP01 and CP02, which include it.

---

## 12. Summary

| Area | Technique | How | Sketch |
|------|-----------|-----|--------|
| Oscillator | Timed square | `micros()` against a half-period table | AC24_SimpleVCO |
| Oscillator | Counting saw/triangle | `for` loop into the DAC | ARDCORE_TRIANGLE |
| Oscillator | Phase accumulator + wavetable | 16-bit accumulator, top 8 bits index a flash table | AC33_SSQScreecherWT |
| Oscillator | Granular | Two decaying triangle grains restarted by a master oscillator | ARDCORE_auduino_v5 |
| Oscillator | FM | One sine modulating another | fac_fm_osc |
| Noise | 16-bit LFSR | Taps 16, 14, 13, 11 | LFSR |
| Noise | 32-bit Galois LFSR | `^ 0xD0000001u` in one line | LFSR32, SDIY_ARDCORE_NOISE |
| Noise | Buffered generator | Buffer filled in `loop()`, played by Timer1 | DeadCityRadio |
| Noise | Multiply and wrap | Product cut to 8 bits | ARDCORE_NOISEMAKER |
| Bytebeat | Counter expressions | `(t*9 & t>>4 \| t*5 & t>>7)` | drumsandmelody |
| Automata | Wolfram rules | 3-cell neighbourhood, rule byte | CELLULAR_AUTOMATA_SYNTH |
| Automata | Counter arithmetic | Mask and multiply the counter's bytes | fraktal_synth |
| Delay | Ring buffer + feedback | `delArr[pointer] = input + delayed * fb` | BLOG_DELAY_BEST |
| Echo | Two fixed taps | 900 and 1,799 samples back | reverb_prttygood |
| Distortion | Nibble swap | Swap the top and bottom 4 bits | DISTORTION |
| Distortion | XOR of shifts | XOR two shifted copies | waveshpr2 |
| Ring mod | Multiply two inputs | Half-rectified by the 0-5V inputs | AC28_RectifiedRingMod |
| LFO | Skewed triangle | Two rates for the two halves | AC19_ShapedLFO |
| LFO | `sin()` | Samples per cycle sets the speed | ARD_SINE_LFO |
| Envelope | Attack-decay | State 0/1/-1, fixed step per loop | AC25_VCAREnvelope |
| Envelope | Bouncing ball | Multiply down plus fixed loss per bounce | AC32_BouncingBall |
| Rhythm | Euclidean | Spread N hits over M steps | AC30_DualEuclidean |
| Rhythm | Number sequences | Primes, Fibonacci, Recamán | ASCTard007 |
| Sequencer | Analog shift register | Ring of 9, read from an offset | AC21_ShiftRegister |
| Quantizer | Threshold table | 61 boundaries, half a semitone low | AC02_Quantizer |
| Utility | Faster ADC | Prescaler 16 instead of 128 | many |
| Utility | deJitter | Ignore small changes | official/ |
| Utility | Port DAC write | Two masked port writes | official/ |
| Utility | Timer sample clock | Timer1 or Timer2 interrupt at 31-67kHz | AC33, Auduino, DCR |

---

## 13. Not in the repo yet

Things the ATmega328P could do that no sketch here does:

- **Band-limited wavetables.** Several versions of each table, with fewer harmonics for higher notes, to cut the aliasing at the top of the range. Costs flash.
- **Karplus-Strong.** A short delay line with filtered feedback gives plucked strings. The 900-sample buffer from the delays is long enough.
- **Wavetable morphing.** Crossfade between two tables with a CV: `(1 - a) * tableA[i] + a * tableB[i]`. Twice the flash reads per sample, which fits in AC33's interrupt.
- **Formants.** Band-pass filters, or tables shaped like vowels, for vocal sounds.

Sample playback and FM are both here already: `fac_drums` plays eight drum samples from flash, and `fac_fm_osc` is a two-operator FM voice.
