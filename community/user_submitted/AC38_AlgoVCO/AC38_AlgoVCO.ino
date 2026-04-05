//  ============================================================
//
//  Program: AC38 Algorithmic VCO — 16 Zero-Memory Waveforms
//
//  Description: Wavetable-free oscillator for the ArdCore.
//               All 16 waveforms are computed in real-time inside
//               the Timer2 ISR — no flash used for waveform data.
//               Only the 1V/oct pitch table lives in PROGMEM.
//
//               Three waveforms respond to the A3 "Mod" input:
//                 - PULSE:     A3 controls pulse width
//                 - STAIR_VAR: A3 controls step coarseness
//                 - WAVEFOLD:  A3 controls fold depth (harmonics)
//
//  I/O Usage:
//    Knob 1 (A0):  Waveform select (16 waveforms)
//    Knob 2 (A1):  Fine-tune (±~1 semitone)
//    Analog In 1 (A2): 1V/oct pitch CV
//    Analog In 2 (A3): Modifier — pulse width / stair coarseness /
//                       wavefold depth (depends on active waveform)
//    Digital Out 1 (D0): Trigger pulse on each waveform cycle
//    Digital Out 2 (D1): Unused
//    Clock In:     Hard sync (resets phase accumulator)
//    DAC Out:      Oscillator audio output
//
//  Input Expander:  unused
//  Output Expander: 8 bits of output exposed
//
//  ┌──────────────────────────────────────────────────────────┐
//  │                    WAVEFORM MAP                          │
//  │                                                          │
//  │   #   Name          Shape           Mod (A3)             │
//  │  ─── ────────────  ──────────────  ──────────────────    │
//  │   0  Saw           /|/|/|          —                     │
//  │   1  Ramp          |\|\|\          —                     │
//  │   2  Square        _‾_‾_‾         —                     │
//  │   3  Pulse         |_‾__|_‾__|    width (0=thin 255=fat) │
//  │   4  Triangle      /\/\/\         —                      │
//  │   5  Sine (approx) ∿∿∿∿          —                      │
//  │   6  Double Saw    //|//|  (8va)  —                      │
//  │   7  Triple Saw    ///|///| (+5th)—                      │
//  │   8  Staircase 8   ⌐⌐⌐⌐ (8 lvl) —                      │
//  │   9  Staircase Var ⌐⌐ (2-16 lvl) coarseness             │
//  │  10  Bitcrush Saw  ⌐/⌐/  (4-bit) —                      │
//  │  11  XOR Gray      ~~~ (buzzy)    —                      │
//  │  12  XOR Rich      ≈≈≈ (complex)  —                      │
//  │  13  XOR Metal     ∆∆∆ (inharmon) —                      │
//  │  14  Wavefold Tri  ΛΛΛΛ (folded)  fold depth (harmonics) │
//  │  15  Needle        .|.|. (impulse)—                      │
//  └──────────────────────────────────────────────────────────┘
//
//  How It Works:
//
//    A Timer2 ISR fires at 66.67kHz (16MHz / 8 prescaler / 30).
//    Each tick it advances a 16-bit phase accumulator and computes
//    the output sample using only integer math — no table lookups
//    for the waveform itself.
//
//    The phase accumulator's top 8 bits (0-255) become the "step"
//    variable, representing position within one waveform cycle.
//    Each waveform is a pure function:  f(step, mod) → sample.
//
//    Memory budget:
//      Wavetable storage:   0 bytes  (all algorithmic)
//      Pitch table (flash): 2,048 bytes  (1024 × 16-bit)
//      RAM:                 ~30 bytes (oscillator state)
//
//  Signal Flow:
//
//    A2 (pitch CV)──►[freqTable]──►phaseInc
//                                     │
//    A1 (fine-tune)──────────────►(±offset)
//                                     │
//                                     ▼
//           ┌──────────────────────────────────┐
//           │   Phase Accumulator (16-bit)     │
//           │   acc += phaseInc   @ 66.67kHz   │
//           └──────────┬───────────────────────┘
//                      │ top 8 bits = step
//                      ▼
//           ┌──────────────────────────────────┐
//           │   Waveform Switch (A0 selects)   │
//           │   f(step, mod) → 8-bit sample    │◄── A3 (mod)
//           └──────────┬───────────────────────┘
//                      │
//           ┌──────────▼──────────┐
//           │  R-2R DAC (pins 5-12) │──► DAC Out ×2
//           └─────────────────────┘
//           Phase wrap ──► D0 trigger
//           Clock In   ──► Hard sync (resets phase)
//
//  Based on: AC33_SSQScreecherWT architecture (tinydvco Timer2 ISR)
//  Author:   mamonu
//  Created:  05 Apr 2026
//
//  ============================================================

#include <avr/io.h>
#include <avr/interrupt.h>
#include "pitchtable.h"

//  ================= ArdCore pin constants ====================

const int clkIn = 2;
const int digPin[2] = {3, 4};
const int pinOffset = 5;
const int trigTime = 10;         // trigger pulse duration (ms)

//  ================= oscillator state =========================
//  All variables touched by the ISR must be volatile.

volatile uint16_t syncPhaseAcc = 0;   // 16-bit phase accumulator
volatile uint16_t syncPhaseInc = 0;   // phase increment (pitch)
volatile uint8_t  currentWave  = 0;   // active waveform 0-15
volatile uint8_t  modParam     = 0;   // modifier from A3 (0-255)
volatile uint8_t  cycleFlag    = 0;   // set by ISR on phase wrap

//  ================= trigger state ============================

volatile int clkState = LOW;
int digState = LOW;
unsigned long digMilli = 0;

//  ================= waveform smoothing =======================

#define WAVE_BUFF_LEN   4
#define WAVE_BUFF_SHIFT 2
uint16_t waveBuff[WAVE_BUFF_LEN];
uint8_t  waveBuffStep = 0;

//  ================= number of waveforms ======================

#define NUM_WAVES 16

//  ==================== setup() ===============================

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

  attachInterrupt(0, clkISR, RISING);

  // Timer2: CTC mode, /8 prescaler, OCR2A=29 → 66.67kHz ISR
  cli();
  TCCR2A = (1 << WGM21);
  TCCR2B = (1 << CS21);
  OCR2A  = 29;
  TIMSK2 = (1 << OCIE2A);
  sei();

  memset(waveBuff, 0, sizeof(waveBuff));
}

//  ==================== Timer2 ISR ============================
//
//  Fires at 66.67kHz. Budget: ~240 clock cycles at 16MHz.
//  Every waveform is computed from step (0-255) and mod (0-255)
//  using only integer ops — no table lookups, no division.

ISR(TIMER2_COMPA_vect)
{
  uint16_t prevPhase = syncPhaseAcc;

  // Hard sync: clock input resets the accumulator
  if (clkState) {
    clkState = LOW;
    syncPhaseAcc = 0;
    prevPhase = 0;
  }

  syncPhaseAcc += syncPhaseInc >> 1;

  uint8_t s = syncPhaseAcc >> 8;    // position in cycle (0-255)
  uint8_t m = modParam;             // snapshot modifier

  // Detect cycle wrap for D0 trigger
  if (syncPhaseAcc < prevPhase) {
    cycleFlag = 1;
  }

  uint8_t val;

  switch (currentWave) {

    // ── Classic waveforms ──────────────────────────────────

    case 0:  // SAW — ramp up
      val = s;
      break;

    case 1:  // RAMP — ramp down (inverse saw)
      val = 255 - s;
      break;

    case 2:  // SQUARE — 50% duty cycle
      val = (s < 128) ? 0xFF : 0x00;
      break;

    case 3:  // PULSE — variable width via mod (A3)
      val = (s < m) ? 0xFF : 0x00;
      break;

    case 4:  // TRIANGLE — symmetric ramp up/down
      val = (s < 128) ? (s << 1) : ((255 - s) << 1);
      break;

    case 5: { // SINE APPROXIMATION — parabolic
      // Two half-parabolas mirrored around 128.
      // hs * (127 - hs) peaks at hs=63 → 63×64 = 4032
      // >> 5 scales to ~126, centered on 128 → range ~2–254
      uint8_t hs = (s < 128) ? s : (s - 128);
      uint8_t bump = (uint8_t)((uint16_t)hs * (127 - hs) >> 5);
      val = (s < 128) ? (128 + bump) : (128 - bump);
      break;
    }

    // ── Harmonic multipliers ───────────────────────────────

    case 6:  // DOUBLE SAW — octave up (2× frequency)
      val = (uint8_t)(s << 1);
      break;

    case 7:  // TRIPLE SAW — octave + fifth (3× frequency)
      val = (uint8_t)(s * 3);
      break;

    // ── Quantized / bitcrushed ─────────────────────────────

    case 8:  // STAIRCASE 8 — fixed 8-level quantized saw
      val = s & 0xE0;
      break;

    case 9: { // STAIRCASE VARIABLE — mod (A3) controls coarseness
      // m >> 6 gives 0-3 → shift by 1-4 bits → 128/64/32/16 levels
      uint8_t shift = 1 + (m >> 6);
      val = (s >> shift) << shift;
      break;
    }

    case 10: // BITCRUSH SAW — 4-bit resolution (16 levels)
      val = s & 0xF0;
      break;

    // ── XOR-based (digital noise/texture) ──────────────────

    case 11: // XOR GRAY — Gray code pattern, buzzy harmonics
      val = s ^ (s >> 1);
      break;

    case 12: // XOR RICH — multiple XOR folds, complex spectrum
      val = s ^ (s >> 2) ^ (s >> 4);
      break;

    case 13: // XOR METAL — inharmonic, metallic partials
      val = (uint8_t)(s ^ (uint8_t)(s * 3));
      break;

    // ── Waveshaping ────────────────────────────────────────

    case 14: { // WAVEFOLD TRIANGLE — mod (A3) controls fold depth
      // Start with triangle 0-254
      int16_t t = (s < 128) ? ((int16_t)s << 1)
                             : ((int16_t)(255 - s) << 1);
      // Amplify by 1×–4× based on mod, then fold into 0-255
      // m=0: clean triangle, m=255: heavily folded (rich harmonics)
      t = t * (int16_t)(1 + (m >> 6));
      t = t & 0x1FF;                  // mod 512
      if (t > 255) t = 511 - t;       // reflect back
      val = (uint8_t)t;
      break;
    }

    case 15: // NEEDLE — narrow triangle impulse (32-sample wide)
      // Sharp attack transient, useful for plucks and clicks
      if (s < 16)      val = s << 4;            // ramp up  0→240
      else if (s < 32) val = (31 - s) << 4;     // ramp down 240→0
      else             val = 0;                  // silence
      break;

    default:
      val = s;
      break;
  }

  // Write to R-2R DAC via direct port manipulation (pins 5-12)
  PORTB = (PORTB & B11100000) | (val >> 3);
  PORTD = (PORTD & B00011111) | ((val & B00000111) << 5);
}

//  ==================== loop() ================================
//
//  Reads knobs/CV at whatever rate is left after ISR servicing
//  (~2-3kHz with 4 analogReads).

void loop()
{
  // --- Pitch CV (A2) → frequency table lookup ---
  uint16_t cvRaw = analogRead(2);
  uint16_t baseFreq = mapFreq(cvRaw);

  // --- Fine-tune (A1) → ±1 semitone offset ---
  int fineTune = (int)analogRead(1) - 512;
  int16_t freqWithTune = (int16_t)baseFreq + (fineTune >> 3);
  if (freqWithTune < 0) freqWithTune = 0;
  syncPhaseInc = (uint16_t)freqWithTune;

  // --- Modifier (A3) → pulse width / fold depth / etc ---
  modParam = analogRead(3) >> 2;  // scale 0-1023 → 0-255

  // --- Waveform select (A0) with smoothing ---
  uint16_t waveRaw = analogRead(0);
  uint8_t waveIdx = (uint8_t)((uint32_t)waveRaw * NUM_WAVES / 1024);
  if (waveIdx >= NUM_WAVES) waveIdx = NUM_WAVES - 1;

  waveBuff[waveBuffStep++] = waveIdx;
  if (waveBuffStep >= WAVE_BUFF_LEN) {
    uint16_t acc = 0;
    for (int i = 0; i < WAVE_BUFF_LEN; i++) acc += waveBuff[i];
    currentWave = (acc >> WAVE_BUFF_SHIFT);
    if (currentWave >= NUM_WAVES) currentWave = NUM_WAVES - 1;
    waveBuffStep = 0;
  }

  // --- Cycle trigger on D0 ---
  if (cycleFlag) {
    cycleFlag = 0;
    digState = HIGH;
    digMilli = millis();
    digitalWrite(digPin[0], HIGH);
  }

  if ((digState == HIGH) && (millis() - digMilli > trigTime)) {
    digState = LOW;
    digitalWrite(digPin[0], LOW);
  }
}

//  =================== interrupt handlers =====================

void clkISR()
{
  clkState = HIGH;
}
