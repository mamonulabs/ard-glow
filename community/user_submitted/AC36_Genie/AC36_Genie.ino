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
  // hard sync: reset all neuron state
  if (clkState) {
    clkState = LOW;
    neuron1Out = 0;
    neuron2Out = 0;
    neuron3Out = 0;
  }

  // read parameters
  // sense: 0-1023 maps to 0-512 in our ±1023 domain (~0-5V)
  int sense = analogRead(0) >> 1;

  // response: 0-1023 maps to 102-1023 (~1-10V)
  int response = (analogRead(1) * 9L / 10L) + 102;

  // input gain from A3: 0-1023 maps to 0-1024 (fixed-point 0.0-1.0)
  int inputGain = analogRead(3);

  // read external input on A2 (signed, centered at 512)
  int extIn = analogRead(2) - 512;

  // ring topology: each neuron feeds the next
  // neuron 1 input: from neuron 3 (or external if A2 is patched)
  // we use external input if it's significantly non-zero (>±32)
  int n1input;
  if (abs(extIn) > 32) {
    n1input = (int)((long)extIn * inputGain / 1023L);
  } else {
    n1input = (int)((long)neuron3Out * inputGain / 1023L);
  }

  int n2input = (int)((long)neuron1Out * inputGain / 1023L);
  int n3input = (int)((long)neuron2Out * inputGain / 1023L);

  // process neurons
  neuron1Out = neuronProcess(n1input, sense, response);
  neuron2Out = neuronProcess(n2input, sense, response);
  neuron3Out = neuronProcess(n3input, sense, response);

  // differential rectifier: (neuron1 + neuron3) - neuron2
  int diffIn = (int)(((long)neuron1Out + neuron3Out) / 2L) - neuron2Out;
  if (diffIn > 1023) diffIn = 1023;
  if (diffIn < -1023) diffIn = -1023;

  int posOut = diffIn > 0 ? diffIn : 0;
  int negOut = diffIn < 0 ? -diffIn : 0;

  // DAC output: map positive diff-rect 0..1023 to 0..255
  int dacVal = posOut >> 2;
  if (dacVal > 255) dacVal = 255;
  dacOutput((byte)dacVal);

  // D0: gate when diff-rect positive is active
  digitalWrite(digPin[0], posOut > 10 ? HIGH : LOW);
  // D1: gate when diff-rect negative is active
  digitalWrite(digPin[1], negOut > 10 ? HIGH : LOW);
}

//  =================== convenience routines ===================

void isr()
{
  clkState = HIGH;
}

//  neuronProcess - NLC neuron: biased comparator
//  input, sense, response all in ±1023 / 0-1023 domain
//  output: signed ±1023
//  NLC formula: clamp(input + sense, 0, 1023) then subtract
//  response with sign of rectified input
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
