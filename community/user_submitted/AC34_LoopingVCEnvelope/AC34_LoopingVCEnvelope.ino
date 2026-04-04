//  ============================================================
//
//  Program: ArdCore Looping VC AR Envelope
//
//  Description: A looping attack-release envelope with voltage
//               control over both stages and EOC trigger output.
//               Based on AC25_VCAREnvelope by Darwin Grosse.
//
//               The envelope free-runs on power-up: it rises to
//               peak, falls to zero, fires an EOC trigger, and
//               immediately restarts. Clock input acts as a hard
//               sync (resets to start of attack).
//
//               Designed for generative patches where the EOC
//               trigger drives sample-and-holds that modulate
//               the envelope's own rise/fall times and other
//               parameters each cycle.
//
//  I/O Usage:
//    Knob 1:         Attack time (base)
//    Knob 2:         Release time (base)
//    Analog In 1:    Attack time CV adder (patch S&H here)
//    Analog In 2:    Release time CV adder (patch S&H here)
//    Digital Out 1:  Trigger at envelope peak (end of attack)
//    Digital Out 2:  EOC trigger (end of cycle / start of new)
//    Clock In:       Hard sync — resets envelope to start of attack
//    Analog Out:     Envelope CV (8-bit DAC, 0-5V)
//
//  Input Expander:  unused
//  Output Expander: 8 bits of output exposed
//
//  Created:  04 Apr 2026  Based on AC25_VCAREnvelope (19 Mar 2011 ddg)
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

//  envelope state: 1 = rising (attack), -1 = falling (release)
int envState = 1;
float riseValue = 0.0;
float fallValue = 0.0;
float currValue = 0.0;

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
  // hard sync: clock resets envelope to start of attack
  if (clkState) {
    clkState = 0;
    currValue = 0.0;
    envState = 1;
  }

  // advance the envelope
  if (envState == 1) {
    currValue += riseValue;
  } else {
    currValue -= fallValue;
  }

  // peak transition: attack complete, start release
  if (currValue > 255.0) {
    currValue = 255.0;
    envState = -1;

    digState[0] = HIGH;
    digitalWrite(digPin[0], HIGH);
    digMilli[0] = millis();
  }

  // end-of-cycle: release complete, restart attack and fire EOC
  if (currValue < 0.0) {
    currValue = 0.0;
    envState = 1;

    digState[1] = HIGH;
    digitalWrite(digPin[1], HIGH);
    digMilli[1] = millis();
  }

  // output the envelope value
  dacOutput((byte)currValue);

  // auto-off for trigger outputs
  for (int i = 0; i < 2; i++) {
    if ((digState[i] == HIGH) && (millis() - digMilli[i] > trigTime)) {
      digState[i] = LOW;
      digitalWrite(digPin[i], LOW);
    }
  }

  // read knobs + CV and compute rise/fall increments
  int riseSetting = analogRead(0) + analogRead(2) + 5;
  int fallSetting = analogRead(1) + analogRead(3) + 5;

  riseValue = 255.0 / riseSetting;
  fallValue = 255.0 / fallSetting;
}

//  =================== convenience routines ===================

//  isr() - quickly handle interrupts from the clock input
//  ------------------------------------------------------
void isr()
{
  clkState = HIGH;
}

//  dacOutput(byte) - deal with the DAC output
//  -----------------------------------------
void dacOutput(byte v)
{
  PORTB = (PORTB & B11100000) | (v >> 3);
  PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
}

//  deJitter(int, int) - smooth jitter input
//  ----------------------------------------
int deJitter(int v, int test)
{
  if (abs(v - test) > 8) {
    return v;
  }
  return test;
}

//  ===================== end of program =======================
