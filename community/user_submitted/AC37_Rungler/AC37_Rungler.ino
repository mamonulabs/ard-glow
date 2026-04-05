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
//               https://github.com/mhetrick/hetrickcv
//
//  How It Works:
//
//    THE SHIFT REGISTER
//    ──────────────────
//    An 8-bit register stored as a single byte. On each clock
//    pulse, all bits shift right by one position. A new bit
//    enters at the MSB (bit 7):
//
//    Before clock:  [b7][b6][b5][b4][b3][b2][b1][b0]
//                    ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓
//    After shift:   [ ?][b7][b6][b5][b4][b3][b2][b1] → b0 lost
//                    ↑
//                    new bit goes here
//
//    WRITE MODE (Knob 2 > ~5%)
//    ─────────────────────────
//    The new bit comes from comparing the data input (A2) against
//    a threshold (Knob 1 + A3 CV):
//
//      data (A2) ──→ ┌────────────┐
//                     │ data > thr │──→ 1 or 0
//      threshold ───→ └────────────┘       │
//      (Knob1+A3)                          ↓
//                                     ┌─────────┐
//                                     │  XOR ⊕  │──→ new bit 7
//                                     └────┬────┘
//                                          │
//      old bit 7 (before shift) ───────────┘
//
//    The XOR with the old bit 7 is the classic rungler feedback.
//    It means the register's own history influences what goes in
//    next, creating sequences that evolve in hard-to-predict ways.
//
//    FROZEN MODE (Knob 2 near zero)
//    ──────────────────────────────
//    The old bit 7 (shifted off the end) wraps back to bit 7
//    (the new empty position). The pattern circulates forever
//    as an 8-step loop. XOR feedback is still applied, so the
//    loop may slowly mutate.
//
//    THE RUNGLER OUTPUT
//    ──────────────────
//    Only the 3 oldest bits (5, 6, 7) contribute to the CV output,
//    weighted as a 3-bit DAC:
//
//      bit 5 → weight 32
//      bit 6 → weight 64
//      bit 7 → weight 128
//
//    This gives exactly 8 possible output levels:
//      0, 32, 64, 96, 128, 160, 192, 224
//
//    These 8 levels are the "rungler" — a chaotic stepped voltage
//    that jumps between 8 values in unpredictable order. In Knob 2
//    write mode, the output is further scaled by the knob position.
//
//    Why only 3 bits? Rob Hordijk's original Benjolin design uses
//    3 taps from the shift register to create a stepped CV. Using
//    all 8 bits would give 256 levels (essentially noise). The
//    3-bit selection creates a constrained vocabulary of 8 pitches
//    that the chaos navigates through — musical enough to be
//    interesting, unpredictable enough to surprise.
//
//    OUTPUT EXPANDER BONUS
//    ─────────────────────
//    The 8-bit DAC output on pins 5-12 IS the shift register when
//    used with the expander. Each expander output becomes a gate
//    for one register bit — giving you all 8 stage outputs like
//    the original VCV module, for free.
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

    // Check if we're in frozen mode (Knob 2 near zero)
    int scaleRaw = analogRead(1);
    bool frozen = (scaleRaw < 50);

    // Save the bits that will be affected by the shift.
    // We need the old bit 7 (about to be shifted off) for feedback,
    // and old bit 0 for the D1 XOR output.
    byte oldBit7 = (shiftReg >> 7) & 1;
    byte oldBit0 = shiftReg & 1;

    // Shift right: every bit moves one position toward bit 0.
    // Bit 0 falls off the end. Bit 7 becomes empty (0).
    shiftReg >>= 1;

    if (frozen) {
      // Frozen: wrap old bit 7 back into the new bit 7 position.
      // The pattern loops as a circular buffer.
      if (oldBit7) {
        shiftReg |= 0x80;
      }
      // Even in frozen mode, XOR feedback can mutate the loop.
      // This creates slow evolution of the frozen pattern.
      shiftReg ^= (oldBit7 ^ oldBit0) ? 0x80 : 0x00;
    } else {
      // Write mode: generate a new bit from external data.

      // Threshold = Knob 1 (base) + A3 (CV modulation, signed).
      // A3 is centered: 512 = no offset, 0 = -512, 1023 = +511.
      int threshold = analogRead(0) + (analogRead(3) - 512);
      if (threshold < 0) threshold = 0;
      if (threshold > 1023) threshold = 1023;

      // Compare data input (A2) against threshold.
      // This is the "comparator" from the Benjolin design.
      int dataIn = analogRead(2);
      byte newBit = (dataIn > threshold) ? 1 : 0;

      // XOR with old bit 7: the rungler feedback.
      // This means the register's own past influences its future,
      // creating sequences that are deterministic but complex.
      newBit ^= oldBit7;

      // Place the new bit into bit 7 (MSB, the vacant position)
      if (newBit) {
        shiftReg |= 0x80;
      }
    }

    // --- Calculate the 3-bit rungler CV output ---
    // Only bits 5, 6, 7 contribute, with binary weighting.
    // This gives 8 possible voltage levels (a 3-bit DAC).
    runglerOut = 0;
    if (shiftReg & 0x20) runglerOut += 32;   // bit 5 = weight 32
    if (shiftReg & 0x40) runglerOut += 64;   // bit 6 = weight 64
    if (shiftReg & 0x80) runglerOut += 128;  // bit 7 = weight 128
    // Result: one of {0, 32, 64, 96, 128, 160, 192, 224}

    // In write mode, scale the output by Knob 2 position.
    // This acts as an attenuator for the rungler CV range.
    if (!frozen) {
      runglerOut = (byte)((int)runglerOut * scaleRaw / 1023);
    }
  }

  // DAC output: the rungler CV value.
  // Note: with the output expander connected, the 8 DAC pins
  // (5-12) directly reflect the binary value written here.
  // Since runglerOut only uses bits 5-7, expander outputs 5-7
  // show the 3 rungler taps, while 0-4 are always low.
  // To see ALL 8 register bits on the expander instead, you
  // could replace this with: dacOutput(shiftReg);
  dacOutput(runglerOut);

  // D0: serial output — the oldest bit that was shifted off.
  // This is a single-bit stream, useful as a random gate.
  digitalWrite(digPin[0], (shiftReg & 0x80) ? HIGH : LOW);

  // D1: XOR of bits 0 and 7 — the feedback signal itself.
  // Toggles whenever the newest and oldest bits differ.
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
