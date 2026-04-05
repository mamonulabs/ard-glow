//  ============================================================
//
//  Program: ArdCore Genie
//
//  Description: Port of the Nonlinear Circuits Genie module.
//               Three neurons in a self-oscillating ring topology
//               with a differential rectifier combining the outputs.
//               Produces chaotic CV and gate patterns from internal
//               feedback alone — no external input required.
//
//               Based on GENiE by Andrew Fitch (NLC).
//               https://github.com/mhetrick/nonlinearcircuits
//
//  How It Works:
//
//    THE NEURON
//    ──────────
//    Each "neuron" is a biased comparator with a dead zone. It
//    takes an input, adds a bias ("sense"), clips negative values
//    to zero (half-wave rectification), then subtracts a fixed
//    offset ("response") based on whether the signal is active:
//
//      input + sense
//           │
//           ↓
//      ┌──────────┐
//      │ clamp    │  if < 0, force to 0 (dead zone)
//      │ 0..1023  │  if > 1023, cap at 1023
//      └────┬─────┘
//           │ "rectified"
//           ↓
//      ┌──────────────────────────┐
//      │ if rectified > 0:        │
//      │   output = rect - response│  (pulled down by response)
//      │ else:                    │
//      │   output = rect + response│  (pushed up by response)
//      └──────────────────────────┘
//
//    The sense knob shifts the operating point. Low sense = the
//    neuron needs a strong positive input to activate. High sense
//    = it's always "on" and the input modulates around the active
//    region.
//
//    The response knob controls the output strength. Higher
//    response = larger output swings when the neuron flips between
//    active/inactive.
//
//    THE RING
//    ────────
//    Three neurons are connected in a circle — each one's output
//    feeds the next one's input:
//
//      ┌──────────┐    ┌──────────┐    ┌──────────┐
//      │ Neuron 1 │──→ │ Neuron 2 │──→ │ Neuron 3 │
//      └──────────┘    └──────────┘    └──────────┘
//           ↑                                │
//           └────────────────────────────────┘
//                    feedback loop
//
//    This ring self-oscillates. With certain sense/response
//    settings, the three neurons chase each other around — N1 goes
//    high, which pushes N2 high, which pushes N3 high, which feeds
//    back and pushes N1 into its dead zone, and the cycle continues.
//    The exact pattern depends on the knob settings and can be
//    periodic, quasi-periodic, or chaotic.
//
//    THE DIFFERENTIAL RECTIFIER
//    ──────────────────────────
//    The diff-rect combines the three neuron outputs into a single
//    signal by comparing "team A" (neurons 1+3) against "team B"
//    (neuron 2):
//
//      diff = average(N1, N3) - N2
//
//      If diff > 0 → positive output (goes to DAC)
//      If diff < 0 → negative output (triggers D1 gate)
//
//    This creates a richer, more complex signal than any single
//    neuron output alone.
//
//    EXTERNAL INPUT (A2)
//    ───────────────────
//    When a signal is patched to A2, it replaces the ring feedback
//    into neuron 1 (breaking the N3→N1 link). The ring still
//    oscillates through N1→N2→N3, but N1 is now driven externally.
//    This turns the module from a self-contained chaos source into
//    a nonlinear signal processor.
//
//    Integer Math Note:
//    The VCV original uses ±10V floats. Here we use ±1023 signed
//    integers. Input gain is applied as fixed-point: multiply by
//    0-1023 (from A3), then divide by 1023, giving 0.0-1.0 range.
//    All intermediate products use (long) to avoid 16-bit overflow.
//
//  I/O Usage:
//    Knob 1:         Sense — bias point for all 3 neurons (0-5V)
//    Knob 2:         Response — comparator strength (1-10x)
//    Analog In 1:    External signal injected into neuron 1
//                    (overrides ring feedback from neuron 3)
//    Analog In 2:    Input gain — scales feedback strength (0-1x)
//    Digital Out 1:  Gate: diff-rect positive output (> 0)
//    Digital Out 2:  Gate: diff-rect negative output (< 0)
//    Clock In:       Hard sync — resets all neurons to zero
//    Analog Out:     Diff-rect positive output (8-bit DAC)
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

//  neuron outputs, stored as signed 16-bit
//  range: -1023 to +1023 (maps to ±10V in NLC domain)
int neuron1Out = 0;
int neuron2Out = 0;
int neuron3Out = 0;

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
  // Hard sync: clock resets all neurons to zero, restarting
  // the ring oscillation from a known state.
  if (clkState) {
    clkState = LOW;
    neuron1Out = 0;
    neuron2Out = 0;
    neuron3Out = 0;
  }

  // --- Read parameters ---

  // Sense (Knob 1): shifts the neuron operating point.
  // 0-1023 ADC → 0-511 in our domain (~0-5V equivalent).
  // Low = neurons need strong input to activate.
  // High = neurons are biased "on", always in active region.
  int sense = analogRead(0) >> 1;

  // Response (Knob 2): how hard the neuron "snaps" when active.
  // 0-1023 ADC → 102-1023 in our domain (~1-10V equivalent).
  // The minimum of 102 ensures the neuron always has some output
  // swing — at zero response, nothing interesting happens.
  int response = (analogRead(1) * 9L / 10L) + 102;

  // Input gain (A3): scales the feedback between neurons.
  // 0-1023 maps to 0.0-1.0 fixed-point multiplier.
  // At zero, the ring is broken (no feedback = no oscillation).
  // At full, maximum feedback = most chaotic behavior.
  int inputGain = analogRead(3);

  // External input (A2): signed, centered at 512 (0V).
  // If a signal is patched here, it replaces the N3→N1 feedback.
  int extIn = analogRead(2) - 512;

  // --- Ring topology: each neuron feeds the next ---

  // Neuron 1 input: normally from neuron 3 (ring feedback).
  // If A2 has a signal (>±32 to filter ADC noise), use that instead.
  int n1input;
  if (abs(extIn) > 32) {
    n1input = (int)((long)extIn * inputGain / 1023L);
  } else {
    n1input = (int)((long)neuron3Out * inputGain / 1023L);
  }

  // Neuron 2 input: always from neuron 1
  int n2input = (int)((long)neuron1Out * inputGain / 1023L);
  // Neuron 3 input: always from neuron 2
  int n3input = (int)((long)neuron2Out * inputGain / 1023L);

  // --- Process all three neurons ---
  neuron1Out = neuronProcess(n1input, sense, response);
  neuron2Out = neuronProcess(n2input, sense, response);
  neuron3Out = neuronProcess(n3input, sense, response);

  // --- Differential rectifier ---
  // Combines neurons: (N1 + N3)/2 vs N2.
  // Positive half goes to DAC, negative half to D1 gate.
  // The /2 prevents overflow when adding two ±1023 values.
  int diffIn = (int)(((long)neuron1Out + neuron3Out) / 2L) - neuron2Out;
  if (diffIn > 1023) diffIn = 1023;
  if (diffIn < -1023) diffIn = -1023;

  int posOut = diffIn > 0 ? diffIn : 0;
  int negOut = diffIn < 0 ? -diffIn : 0;

  // DAC output: positive diff-rect, 0-1023 → 0-255
  int dacVal = posOut >> 2;
  if (dacVal > 255) dacVal = 255;
  dacOutput((byte)dacVal);

  // D0: gate HIGH when diff-rect is positive (N1+N3 winning)
  // Threshold of 10 prevents gate chatter near zero crossing.
  digitalWrite(digPin[0], posOut > 10 ? HIGH : LOW);
  // D1: gate HIGH when diff-rect is negative (N2 winning)
  digitalWrite(digPin[1], negOut > 10 ? HIGH : LOW);
}

//  =================== convenience routines ===================

void isr()
{
  clkState = HIGH;
}

//  neuronProcess - NLC neuron: biased comparator with dead zone
//  ────────────────────────────────────────────────────────────
//  Implements the NLC neuron transfer function:
//
//    1. Add sense (bias) to input
//    2. Half-wave rectify: negative values → 0
//    3. Subtract response (with sign flip at zero crossing)
//
//  The result is a nonlinear function with a "dead zone" below
//  the sense threshold, then a linear region offset by ±response.
//  This is what makes the ring oscillate — each neuron acts like
//  a switch with hysteresis.
//
//  All values in ±1023 integer domain (matches 10-bit ADC range).
int neuronProcess(int input, int sense, int response)
{
  int rectified = input + sense;
  if (rectified < 0) rectified = 0;
  if (rectified > 1023) rectified = 1023;

  int comparator = rectified > 0 ? response : -response;

  int out = rectified - comparator;
  if (out > 1023) out = 1023;
  if (out < -1023) out = -1023;

  return out;
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
