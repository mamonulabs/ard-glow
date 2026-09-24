
//  ============================================================
//
//  Program: ArdCore 8-way Divider
//
//  Description: Given incoming clock pulses, output two
//               triggers with varying delays, as well as
//               user-defined clock divisions/alternations.
//
//    Knob 1: Clock speed - turn to 0 for external functionality
//    Knob 2: Trigger time (5-261 ms)
//    Analog In 1: HIGH to reset (holds all dividers at the start)
//    Analog In 2: Clock on/off (HIGH to run)
//    Digital Out 1: Trigger on every step
//    Digital Out 2: 5ms pulse when the clock starts running
//    Clock In: External trigger input
//    Analog Out: unused
//
//  Input Expander: unused
//  Output Expander: divide by 1 through 8
//
//  Created:  27 Jun 2012
//  Modified: 24 Sep 2026  Finished copy of OX04_8WayDivider (the
//            original is left as it was). What was wrong:
//
//            The original was OX01_MasterClock with the pattern table
//            swapped for a list of divisions {1..8}, but the step code
//            still read it as OX01's 2D table (clockMap[i][...]) and
//            the currClock counter it used was never declared, so it
//            didn't compile. The divider itself was never written.
//
//            What it does now: a step counter runs from the internal
//            clock (A0) or CLK, and expander output i fires on every
//            (i+1)th step, so the eight jacks divide by 1, 2, 3 ... 8.
//            The counter wraps at 840, the smallest number all eight
//            divide into, so the outputs stay lined up forever.
//            A2 above 2.5V holds the count at the start (reset), as
//            the header always said. Everything else is as in OX01:
//            A0 tempo (fully left = CLK only), A1 gate length, A3
//            run/stop, D0 a trigger every step, D1 a start pulse.
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

const unsigned int COUNT_WRAP = 840;  // lcm of 1..8

const int clockMap[8] = {1, 2, 3, 4, 5, 6, 7, 8};
unsigned int stepCount = 0;          // steps since the last reset

//  constants related to the Arduino Nano pin use
const int clkIn = 2;           // the digital (clock) input
const int digPin[2] = {3, 4};  // the digital output pins
const int pinOffset = 5;       // the first DAC pin (from 5-12)

//  variables for interrupt handling of the clock input
volatile int clkState = LOW;
int clockTick[2] = {1, 1};

//  variables used to control the current DIO output states
int digState[2] = {LOW, LOW};  // start with both set low
unsigned long prevMilli[2] = {0, 0};     // the last time of a loop

int currTick = 0; // ticks for the output expander
unsigned long currMilli = 0;
int currState = 0;

// variables for timing loop
unsigned long prevTiming = 0;    // the last time of a timed loop
int interval = 10;               // the last interval value
int doStep = 0;                  // do we perform a step move?

int onoffState = 0;              // the on/off state (from analog 3)
int oldState = 0;                // the old on/off state

int trigTime = 25;               // triggers are variable.

//  ==================== start of setup() ======================

void setup() {
  Serial.begin(9600);
  
  // set up the digital (clock) input
  pinMode(clkIn, INPUT);
  
  // set up the digital outputs
  for (int i=0; i<2; i++) {
    pinMode(digPin[i], OUTPUT);
    digitalWrite(digPin[i], LOW);
  }
  
  // set up the 8-bit DAC output pins
  for (int i=0; i<8; i++) {
    pinMode(pinOffset+i, OUTPUT);
    digitalWrite(pinOffset+i, LOW);
  }
  
  attachInterrupt(0, isr, RISING);
}

//  ==================== start of loop() =======================
void loop()
{
  int i;
  unsigned long thisMillis = millis();
  
  doStep = 0;
  
  // service a clock trigger
  if (clkState == HIGH) {
     clkState = LOW;
     if (interval >= 1270) {
       doStep = 1;
     }
  }
  
  // check for a timer hit
  if ((interval < 1270) && ((thisMillis - prevTiming) > interval)) {
    prevTiming = thisMillis;
    doStep = 1;
  }

  // if we are off, don't do anything
  if (!onoffState) {
    doStep = 0;
  }

  // do our Step function
  if (doStep) {
    // fire off the step blinker
    digState[0] = HIGH;
    prevMilli[0] = thisMillis;
    digitalWrite(digPin[0], HIGH);

    // output i fires on every clockMap[i]-th step: /1, /2 ... /8
    for (i=0; i<8; i++) {
      if ((stepCount % clockMap[i]) == 0) {
        digitalWrite(pinOffset + i, HIGH);
      }
    }
    stepCount++;
    if (stepCount >= COUNT_WRAP) {
      stepCount = 0;
    }
  }
  
  // do a state change
  if (oldState != onoffState) {
    oldState = onoffState;
    
    if (onoffState == 1) {
      digitalWrite(digPin[1], HIGH);
      delay(5);
      digitalWrite(digPin[1], LOW);
    }
  }
  
  // deal with trigger turnoff
  if ((digState[0] == HIGH) && ((thisMillis - prevMilli[0]) > trigTime)) {
    digState[0] = LOW;
    digitalWrite(digPin[0], LOW);
    
    for (i=0; i<8; i++) {
      digitalWrite(pinOffset + i, 0);
    }
  }
  
  // get the current user settings
  interval = (((1023 - analogRead(0)) >> 4) * 20) + 30;
  trigTime = (analogRead(1) >> 2) + 5;
  
  onoffState = analogRead(3) > 512;
  if (onoffState != oldState) {
    prevTiming = 0;
    stepCount = 0;   // starting or stopping lines the dividers up again
  }

  // reset: A2 high holds every divider at the start
  if (analogRead(2) > 512) {
    stepCount = 0;
  }
}

//  =================== convenience routines ===================

//  isr() - quickly handle interrupts from the clock input
//  ------------------------------------------------------
void isr()
{
  // Note: you don't want to spend a lot of time here, because
  // it interrupts the activity of the rest of your program.
  // In most cases, you just want to set a variable and get
  // out.
  clkState = HIGH;
}

//  ===================== end of program =======================
