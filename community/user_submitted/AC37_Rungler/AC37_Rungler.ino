//  ============================================================
//
//  Program: ArdCore Rungler
//
//  Description: Port of the HetrickCV Rungler module (inspired
//               by Rob Hordijk's Benjolin rungler circuit).
//               An 8-bit boolean shift register clocked externally
//               that produces a 3-bit stepped CV from bits 6-8.
//
//               Two modes selected by Knob 2 position:
//               - Write mode (knob > ~5%): data input is compared
//                 against a threshold and fed into bit 1. XOR
//                 feedback from bit 8 creates evolving sequences.
//               - Frozen mode (knob near zero): bit 8 wraps back
//                 to bit 1, looping the current 8-step pattern.
//
//               With the output expander, all 8 register bits
//               appear as individual gate outputs on pins 5-12.
//
//               Based on HetrickCV Rungler by Michael Hetrick.
//               https://github.com/mhetrick/hetern-cv
//
//  I/O Usage:
//    Knob 1:         Comparator threshold for data input
//    Knob 2:         Output scale (0 = frozen mode, >0 = write + scale)
//    Analog In 1:    Data input (compared against threshold)
//    Analog In 2:    Comparator CV modulation (added to threshold)
//    Digital Out 1:  Bit 8 output (serial out / feedback tap)
//    Digital Out 2:  XOR of bit 1 and bit 8
//    Clock In:       Advances the shift register
//    Analog Out:     3-bit rungler CV (8 stepped voltage levels)
//                    With expander: 8 register bits as gates
//
//  Input Expander:  unused
//  Output Expander: 8 register bits as individual gate outputs
//
//  Created:  04 Apr 2026  Ported from HetrickCV VCV Rack plugin
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

//  8-bit shift register stored as a single byte
//  bit 0 = newest (input end), bit 7 = oldest (output end)
byte shiftReg = 0x01;

//  rungler output (0-255)
byte runglerOut = 0;

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

    // read scale knob — near zero = frozen mode
    int scaleRaw = analogRead(1);
    bool frozen = (scaleRaw < 50);

    // save bit 7 (oldest) before shifting
    byte oldBit7 = (shiftReg >> 7) & 1;
    byte oldBit0 = shiftReg & 1;

    // shift register: all bits move up by one position
    shiftReg >>= 1;

    if (frozen) {
      // frozen mode: bit 7 wraps to bit 0 position (which is now bit 6
      // after shift), effectively looping. We feed old bit 7 into the
      // new MSB (bit 7).
      if (oldBit7) {
        shiftReg |= 0x80;
      }
      // XOR feedback still active in frozen mode
      shiftReg ^= (oldBit7 ^ oldBit0) ? 0x80 : 0x00;
    } else {
      // write mode: compare data input against threshold
      // threshold = knob 1 + CV on A3
      int threshold = analogRead(0) + (analogRead(3) - 512);
      if (threshold < 0) threshold = 0;
      if (threshold > 1023) threshold = 1023;

      int dataIn = analogRead(2);
      byte newBit = (dataIn > threshold) ? 1 : 0;

      // XOR with bit 7 feedback (the classic rungler topology)
      newBit ^= oldBit7;

      // feed into bit 7 (MSB, the new empty position after shift)
      if (newBit) {
        shiftReg |= 0x80;
      }
    }

    // calculate rungler output from bits 5, 6, 7
    // (the 3 oldest bits — matches HetrickCV weighting)
    runglerOut = 0;
    if (shiftReg & 0x20) runglerOut += 32;   // bit 5
    if (shiftReg & 0x40) runglerOut += 64;   // bit 6
    if (shiftReg & 0x80) runglerOut += 128;  // bit 7
    // runglerOut is now 0, 32, 64, 96, 128, 160, 192, or 224

    // apply scale from knob 2 (only in write mode, full scale)
    if (!frozen) {
      runglerOut = (byte)((int)runglerOut * scaleRaw / 1023);
    }
  }

  // DAC output: rungler CV
  // the 8 DAC pins also serve as gate outputs with the expander,
  // showing all 8 register bits directly
  dacOutput(runglerOut);

  // D0: bit 7 (serial output / oldest bit)
  digitalWrite(digPin[0], (shiftReg & 0x80) ? HIGH : LOW);

  // D1: XOR of bit 0 and bit 7 (feedback signal)
  byte xorBit = ((shiftReg & 0x01) ^ ((shiftReg >> 7) & 0x01));
  digitalWrite(digPin[1], xorBit ? HIGH : LOW);
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

//  ===================== end of program =======================
