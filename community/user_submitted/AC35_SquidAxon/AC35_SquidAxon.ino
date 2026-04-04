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

    if (stage == 0) {
      // read inputs: A2 and A3 as signed values centered at 512
      int in1 = analogRead(2) - 512;
      int in2 = analogRead(3) - 512;
      int mixIn = in1 + in2;

      // linear feedback: stage 4 output scaled by knob 2
      // knob 2 range 0-1023 maps to 0.0-1.0
      long linFb = (long)stages[3] * analogRead(1) / 1023L;
      mixIn += (int)linFb;

      // nonlinear feedback: diode model of stage 4, scaled by knob 1
      // knob 1 range 0-1023 maps to 0.0-4.0
      long nlInput = (long)stages[3] * analogRead(0) / 256L;
      int nlFb = squidDiode((int)nlInput);
      // invert and scale (~0.7x) like the original
      nlFb = (int)((long)nlFb * -718L / 1024L);
      mixIn += nlFb;

      // clamp to ±1023
      if (mixIn > 1023) mixIn = 1023;
      if (mixIn < -1023) mixIn = -1023;

      stages[0] = mixIn;
    } else {
      stages[stage] = stages[stage - 1];
    }

    stage = (stage + 1) & 3;  // mod 4
  }

  // DAC output: map signed -1023..+1023 to unsigned 0..255
  int dacVal = (stages[0] + 1023) >> 3;
  if (dacVal > 255) dacVal = 255;
  if (dacVal < 0) dacVal = 0;
  dacOutput((byte)dacVal);

  // D0: gate when stage 1 is positive
  digitalWrite(digPin[0], stages[0] > 0 ? HIGH : LOW);
  // D1: gate when stage 4 is positive
  digitalWrite(digPin[1], stages[3] > 0 ? HIGH : LOW);
}

//  =================== convenience routines ===================

void isr()
{
  clkState = HIGH;
}

//  squidDiode - piecewise polynomial diode model
//  input and output in signed integer domain (±1023 scale)
//  port of NLC's: sign * (|abs(x*0.1)-0.667| + |abs(x*0.1)-0.667|)^2 * 12.1
int squidDiode(int input)
{
  int sign = input >= 0 ? 1 : -1;
  long absIn = (long)(input >= 0 ? input : -input);

  // scale: absIn * 0.1 → absIn / 10, but we're in 1023-scale
  // so "0.667" in 1023-scale ≈ 68 (0.667 * 1023 / 10 ≈ 68)
  long scaled = absIn / 10;
  long diodeIn = scaled - 68L;
  if (diodeIn < 0) diodeIn = -diodeIn;
  long stage2 = diodeIn + diodeIn;  // same as abs(x) + x when x>0
  // square and scale: original multiplies by 0.0432477 * 28 * 10 ≈ 12.1
  // in integer domain, keep it proportional
  long stage3 = (stage2 * stage2) / 84L;  // tuned to match NLC range

  // clamp to ±1023
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
