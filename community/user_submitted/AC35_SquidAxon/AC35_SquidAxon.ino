//  ============================================================
//
//  Program: ArdCore SquidAxon
//
//  Description: Port of the Nonlinear Circuits SquidAxon module.
//               A 4-stage clocked shift register with nonlinear
//               (diode-model) feedback from stage 4 back to
//               stage 1. Produces chaotic stepped CV sequences.
//
//               Based on SquidAxon by Andrew Fitch (NLC).
//               https://github.com/mhetrick/nonlinearcircuits
//
//  How It Works:
//
//    The SquidAxon is a 4-stage pipeline that shifts values forward
//    on every clock pulse. New values enter stage 1, old values
//    cascade through stages 2→3→4.
//
//    Clock ──┐
//            ↓
//    ┌───────────────────────────────────────────────┐
//    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
//    │  │ Stage 1 │→ │ Stage 2 │→ │ Stage 3 │→ │ Stage 4 │
//    │  └────┬────┘  └─────────┘  └─────────┘  └────┬────┘
//    │       │              NEW VALUE                 │
//    │       │         ┌─────────────┐               │
//    │       │    ┌────┤   Mix In    │←── In1 (A2)   │
//    │       │    │    │  in1 + in2  │←── In2 (A3)   │
//    │       │    │    │  + linFb    │               │
//    │       │    │    │  + nlFb     │               │
//    │       │    │    └─────────────┘               │
//    │       ↓    │                                   │
//    │    DAC Out │         FEEDBACK PATHS            │
//    │            │    ┌─────────────────────────────┘
//    │            │    │
//    │            │    ├──→ Linear: stage4 × Knob2 (0-1x)
//    │            │    │    (direct copy, scaled down)
//    │            │    │
//    │            │    └──→ Nonlinear: squidDiode(stage4 × Knob1)
//    │            │         (diode-shaped distortion, inverted)
//    │            │
//    │            └────→ into stage 1
//    └───────────────────────────────────────────────┘
//
//    The magic is in the nonlinear feedback path. The squidDiode()
//    function models an analog diode: small inputs produce almost
//    no output (below the "knee"), but once the signal exceeds a
//    threshold (~0.667 in normalized terms), the output rises
//    sharply as a squared curve. This is what creates chaos —
//    the feedback relationship is not proportional, so the system
//    can't settle into a simple repeating pattern.
//
//    squidDiode transfer curve:
//
//    output
//      │            ╱
//      │           ╱   ← steep quadratic rise
//      │          ╱
//      │        ╱
//      │      _╱       ← "knee" at 0.667
//      │  ___─
//      │──          ← near-zero below knee
//      └───────────── input
//
//    The diode output is also inverted (× -0.7), creating negative
//    feedback — when stage 4 goes strongly positive, the diode
//    pushes stage 1 negative. This push-pull between stages is
//    what generates the chaotic wandering.
//
//    Knob 1 (nonlinear amount) controls how much chaos: at zero,
//    the system is a boring shift register. Turn it up and values
//    start evolving unpredictably. Knob 2 (linear feedback) adds
//    a simpler recirculation that creates longer correlations
//    between clock steps.
//
//    Integer Math Note:
//    The VCV original uses ±10V floats. Here we use ±1023 signed
//    integers (matching the 10-bit ADC range). All multiplications
//    use (long) to avoid 16-bit overflow, then divide back down.
//    The diode model constants are pre-scaled to this integer
//    domain — see comments in squidDiode() for the derivation.
//
//  I/O Usage:
//    Knob 1:         Nonlinear feedback amount (0-4x)
//    Knob 2:         Linear feedback amount (0-1x)
//    Analog In 1:    Signal input 1 (fed into stage 1)
//    Analog In 2:    Signal input 2 (summed with input 1)
//    Digital Out 1:  Gate: stage 1 positive (> 0)
//    Digital Out 2:  Gate: stage 4 positive (oldest value)
//    Clock In:       Advances the shift register
//    Analog Out:     Stage 1 output (newest value, 8-bit DAC)
//
//  Input Expander:  unused
//  Output Expander: 8 bits of output exposed
//
//  Created:  04 Apr 2026  Ported from NLC VCV Rack plugin
//
//  ============================================================
//
//  License:
//
//  This software is licensed under the Creative Commons
//  "Attribution-NonCommercial license. This license allows you
//  to tweak and build upon the code for non-commercial purposes,
//  without the requirement to license derivative works on the
//  same terms. If you wish to use this (or derived) work for
//  commercial work, please contact 20 Objects LLC at our website
//  (www.20objects.com).
//
//  For more information on the Creative Commons CC BY-NC license,
//  visit http://creativecommons.org/licenses/
//
//  ================= start of global section ==================

//  constants related to the Arduino Nano pin use
const int clkIn = 2;           // the digital (clock) input
const int digPin[2] = {3, 4};  // the digital output pins
const int pinOffset = 5;       // the first DAC pin (from 5-12)

//  variables for interrupt handling of the clock input
volatile int clkState = LOW;

//  4-stage shift register, stored as signed 16-bit
//  range: -1023 to +1023 (maps to ±5V in eurorack terms)
int stages[4] = {0, 0, 0, 0};
int stage = 0;

//  ==================== start of setup() ======================
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

//  ==================== start of loop() =======================

void loop()
{
  if (clkState) {
    clkState = LOW;

    // The shift register advances in round-robin: on clock pulse 0,
    // stage 1 gets a new mixed value. On pulses 1-3, each stage
    // copies the one before it. This means it takes 4 clocks for
    // a value to travel from stage 1 to stage 4.
    if (stage == 0) {
      // --- Build the new value for stage 1 ---

      // External inputs: read A2 and A3 as signed values.
      // ArdCore ADC gives 0-1023, subtract 512 to center at zero.
      // With nothing patched, the knobs sit near 512 → ~0.
      int in1 = analogRead(2) - 512;
      int in2 = analogRead(3) - 512;
      int mixIn = in1 + in2;

      // Linear feedback: stage 4 output scaled by Knob 2.
      // This is a straight copy of the oldest value, attenuated.
      // At Knob 2 = 0, no feedback. At full CW, 100% feedback.
      // Uses (long) to avoid overflow: 1023 * 1023 > 16-bit max.
      long linFb = (long)stages[3] * analogRead(1) / 1023L;
      mixIn += (int)linFb;

      // Nonlinear feedback: run stage 4 through the diode model.
      // Knob 1 scales the input to the diode (0-4x gain).
      // The /256L gives 0-4x range from the 0-1023 knob value.
      long nlInput = (long)stages[3] * analogRead(0) / 256L;
      int nlFb = squidDiode((int)nlInput);

      // Invert (× -1) and attenuate (× 0.7) the diode output.
      // The inversion is key: it creates negative feedback, so
      // large positive stage 4 values push stage 1 negative.
      // -718/1024 ≈ -0.7 using fixed-point division.
      nlFb = (int)((long)nlFb * -718L / 1024L);
      mixIn += nlFb;

      // Clamp to ±1023 (our ±5V equivalent)
      if (mixIn > 1023) mixIn = 1023;
      if (mixIn < -1023) mixIn = -1023;

      stages[0] = mixIn;
    } else {
      // Stages 2-4 simply copy the previous stage (shift forward)
      stages[stage] = stages[stage - 1];
    }

    stage = (stage + 1) & 3;  // mod 4 via bitmask (faster than %)
  }

  // DAC output: convert signed ±1023 to unsigned 0-255.
  // Add 1023 to shift range to 0-2046, then >>3 to fit 0-255.
  int dacVal = (stages[0] + 1023) >> 3;
  if (dacVal > 255) dacVal = 255;
  if (dacVal < 0) dacVal = 0;
  dacOutput((byte)dacVal);

  // D0: HIGH when stage 1 (newest) is positive — useful as a
  // gate that follows the chaos, flipping unpredictably.
  digitalWrite(digPin[0], stages[0] > 0 ? HIGH : LOW);
  // D1: HIGH when stage 4 (oldest) is positive — a delayed,
  // smoother version of D0 (4 clocks behind).
  digitalWrite(digPin[1], stages[3] > 0 ? HIGH : LOW);
}

//  =================== convenience routines ===================

void isr()
{
  clkState = HIGH;
}

//  squidDiode - piecewise polynomial diode model
//  ─────────────────────────────────────────────
//  Models the voltage-current curve of a real diode: nearly zero
//  output below a threshold ("knee"), then a steep quadratic rise.
//
//  Original NLC formula (float, ±10V domain):
//    sign(x) × (|abs(x×0.1) - 0.667| + |abs(x×0.1) - 0.667|)² × 12.1
//
//  Simplified: the inner term is just 2×|x×0.1 - 0.667| (always ≥0),
//  then squared and scaled. The 0.667 is the diode knee voltage.
//
//  Integer port (±1023 domain):
//    0.1 scaling  → divide by 10
//    0.667 knee   → 68 in our scale (0.667 × 1023 / 10 ≈ 68)
//    12.1 gain    → absorbed into /84L divisor after squaring
//                   (tuned empirically to match NLC output range)
//
//  Input:  signed int, ±1023 scale (but can exceed with 4x gain)
//  Output: signed int, clamped to ±1023
int squidDiode(int input)
{
  int sign = input >= 0 ? 1 : -1;
  long absIn = (long)(input >= 0 ? input : -input);

  long scaled = absIn / 10;          // × 0.1
  long diodeIn = scaled - 68L;       // subtract knee voltage
  if (diodeIn < 0) diodeIn = -diodeIn;  // absolute value
  long stage2 = diodeIn + diodeIn;   // × 2 (double-rectified)
  long stage3 = (stage2 * stage2) / 84L;  // square and scale

  if (stage3 > 1023) stage3 = 1023;

  return (int)(stage3 * sign);
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

//  ===================== end of program =======================
