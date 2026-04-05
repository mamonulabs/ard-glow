//  ============================================================
//
//  Program: ArdCore [MODULE NAME]
//
//  ─── PORTING CHECKLIST ───────────────────────────────────────
//
//  Original Module:
//    Name:    [e.g. SquidAxon]
//    Author:  [e.g. Andrew Fitch (NLC)]
//    Source:  [e.g. https://github.com/mhetrick/nonlinearcircuits]
//    License: [e.g. GPL-3.0]
//
//  What It Does:
//    [Plain English description of what the original module does.
//     One paragraph. Focus on the musical/functional purpose,
//     not the implementation details.]
//
//  VCV I/O → ArdCore I/O Mapping:
//
//    VCV Original            → ArdCore Pin        Notes
//    ──────────────────────  ─────────────────  ─────────────────
//    [Knob/Param 1]          → A0 (Knob 1)       [scaling notes]
//    [Knob/Param 2]          → A1 (Knob 2)       [scaling notes]
//    [CV Input 1]            → A2 (CV In 1)      [signed? range?]
//    [CV Input 2]            → A3 (CV In 2)      [signed? range?]
//    [Clock/Trigger Input]   → Clock In (pin 2)  [rising edge]
//    [Main Output]           → DAC Out (pins 5-12) [0-255 range]
//    [Gate/Trig Output 1]    → D0 (pin 3)        [gate or trig?]
//    [Gate/Trig Output 2]    → D1 (pin 4)        [gate or trig?]
//
//  What Was Dropped/Changed:
//    - [e.g. "9 knobs reduced to 2 — sense/response shared across
//       all neurons instead of per-neuron control"]
//    - [e.g. "Polyphony removed — single voice only"]
//    - [e.g. "10 CV inputs removed — self-patching ring only"]
//
//  Integer Math Conversion:
//    - VCV voltage domain: [e.g. ±10V float]
//    - ArdCore domain:     [e.g. ±1023 signed int (10-bit ADC)]
//    - Key conversions:
//      [e.g. "float × 0.7 → (long)val * 718L / 1024L"]
//      [e.g. "clamp(-10, 10) → clamp(-1023, 1023)"]
//      [e.g. "ADC 0-1023 read as signed: analogRead(x) - 512"]
//    - Overflow prevention: [e.g. "all multiplies cast to (long)
//      before dividing back to int"]
//
//  ─── HOW IT WORKS ────────────────────────────────────────────
//
//    [Explain the core algorithm in plain English. Use ASCII
//     diagrams to show signal flow, feedback paths, state
//     machines, or transfer functions. Aim for someone who
//     knows Arduino but not DSP to understand what's happening.]
//
//    [ASCII DIAGRAM GOES HERE — examples:]
//
//    Signal flow:
//      Input ──→ [Process] ──→ Output
//                    ↑
//                    └── Feedback
//
//    State machine:
//      ┌──────┐  clock  ┌──────┐  peak  ┌──────┐
//      │ IDLE │───────→│ RISE │──────→│ FALL │
//      └──────┘        └──────┘       └──┬───┘
//           ↑                             │ EOC
//           └─────────────────────────────┘
//
//    Transfer curve:
//      out │         ╱
//          │        ╱
//          │      _╱  ← knee
//          │  ___─
//          │──
//          └────────── in
//
//  ─── END PORTING NOTES ──────────────────────────────────────
//
//  Description: [Short version for quick scanning — 2-3 lines max.
//               What does this ArdCore sketch do?]
//
//  I/O Usage:
//    Knob 1:         [what it controls]
//    Knob 2:         [what it controls]
//    Analog In 1:    [what it receives]
//    Analog In 2:    [what it receives]
//    Digital Out 1:  [what it outputs]
//    Digital Out 2:  [what it outputs]
//    Clock In:       [what triggers it]
//    Analog Out:     [what it outputs]
//
//  Input Expander:  [used/unused, what for]
//  Output Expander: [used/unused, what for]
//
//  Created:  [DATE]  Ported from [SOURCE]
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
const int trigTime = 25;       // ms for a trigger output

//  variables for interrupt handling of the clock input
volatile int clkState = LOW;

//  variables used to control the current DIO output states
int digState[2] = {LOW, LOW};
unsigned long digMilli[2] = {0, 0};

//  ─── MODULE STATE ──────────────────────────────────────────
//  [Declare your algorithm's state variables here.
//   Prefer int/byte over float. Note the value range and
//   what each variable represents in the original module.]

// int myState = 0;            // [description, range ±1023]

//  ==================== start of setup() ======================
void setup()
{
  // set up the digital (clock) input
  pinMode(clkIn, INPUT);

  // set up the digital outputs
  for (int i = 0; i < 2; i++) {
    pinMode(digPin[i], OUTPUT);
    digitalWrite(digPin[i], LOW);
  }

  // set up the 8-bit DAC output pins
  for (int i = 0; i < 8; i++) {
    pinMode(pinOffset + i, OUTPUT);
    digitalWrite(pinOffset + i, LOW);
  }

  // set up the clock interrupt (Interrupt 0 = pin 2)
  attachInterrupt(0, isr, RISING);
}

//  ==================== start of loop() =======================

void loop()
{
  // ─── 1. READ INPUTS ──────────────────────────────────────

  // Clock input (handled by interrupt, check flag)
  if (clkState) {
    clkState = LOW;
    // [handle clock event: advance state, shift register, etc.]
  }

  // Knobs: raw 0-1023
  int knob1 = analogRead(0);
  int knob2 = analogRead(1);

  // CV inputs: raw 0-1023
  // For signed: subtract 512 → range -512..+511
  // For 0-5V unipolar: use raw value
  int cvIn1 = analogRead(2);
  int cvIn2 = analogRead(3);

  // ─── 2. PROCESS (core algorithm) ─────────────────────────

  // [Your ported algorithm goes here.
  //  Call helper functions for complex operations.
  //  Use (long) casts for intermediate multiplications
  //  to avoid 16-bit overflow.]

  int result = 0;  // [replace with actual processing]

  // ─── 3. WRITE OUTPUTS ────────────────────────────────────

  // DAC output: must be 0-255 (unsigned byte)
  // If your result is signed ±1023: dacVal = (result + 1023) >> 3
  // If your result is unsigned 0-1023: dacVal = result >> 2
  int dacVal = constrain(result >> 2, 0, 255);
  dacOutput((byte)dacVal);

  // Digital outputs: gates or triggers
  // For gates (follow a condition):
  //   digitalWrite(digPin[0], condition ? HIGH : LOW);
  // For triggers (pulse on event, auto-off after trigTime ms):
  //   digState[0] = HIGH;
  //   digitalWrite(digPin[0], HIGH);
  //   digMilli[0] = millis();

  // Trigger auto-off handling
  for (int i = 0; i < 2; i++) {
    if ((digState[i] == HIGH) && (millis() - digMilli[i] > trigTime)) {
      digState[i] = LOW;
      digitalWrite(digPin[i], LOW);
    }
  }
}

//  =================== convenience routines ===================

//  isr() - quickly handle interrupts from the clock input
//  ------------------------------------------------------
void isr()
{
  clkState = HIGH;
}

//  ─── CORE ALGORITHM FUNCTIONS ──────────────────────────────
//  [Port your module's processing functions here.
//   Document the original formula and the integer conversion.]

// int myProcess(int input, int param)
// {
//   // Original: output = clamp(input * 0.5 + bias, -10, 10)
//   // Integer:  output = clamp(input / 2 + bias, -1023, 1023)
//   int out = input / 2 + param;
//   if (out > 1023) out = 1023;
//   if (out < -1023) out = -1023;
//   return out;
// }

//  dacOutput(byte) - write to the 8-bit R-2R DAC
//  ──────────────────────────────────────────────
//  Splits the byte across PORTB (bits 0-4) and PORTD (bits 5-7).
//  This is ~4x faster than 8 individual digitalWrite() calls.
void dacOutput(byte v)
{
  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}

//  deJitter(int, int) - smooth jittery ADC readings
//  ─────────────────────────────────────────────────
//  Only accepts new value if it differs from previous by >8.
//  Prevents output flicker from ADC noise on the knobs.
int deJitter(int v, int test)
{
  if (abs(v - test) > 8) {
    return v;
  }
  return test;
}

//  ===================== end of program =======================
