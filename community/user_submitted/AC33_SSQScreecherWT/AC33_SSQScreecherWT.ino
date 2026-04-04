//  ============================================================
//
//  Program: AC33 SSQ Screecher Wavetable VCO
//
//  Description: Wavetable oscillator ported from yorkmodular/tinydvco.
//               Uses a phase accumulator driven by a Timer2 ISR to
//               output 8-bit wavetable samples through the ArdCore
//               R-2R DAC. Features 7 waveforms (5 custom wavetables
//               plus algorithmic saw and square), 1V/oct pitch CV,
//               fine-tune, and hard sync via clock input.
//
//  I/O Usage:
//    Knob 1:       Waveform select (7 waveforms)
//    Knob 2:       Fine-tune (±~1 semitone)
//    Analog In 1:  1V/oct pitch CV
//    Analog In 2:  Phase modulation amount
//    Digital Out 1: Trigger on each waveform cycle
//    Digital Out 2: unused
//    Clock In:     Hard sync (resets phase accumulator)
//    Analog Out:   Oscillator audio output
//
//  Input Expander:  unused
//  Output Expander: 8 bits of output exposed
//
//  Waveforms:
//    0 - Sundial9  (complex organic)
//    1 - SSQ1      (screech square variant 1)
//    2 - SSQ2      (screech square variant 2)
//    3 - SSQ3      (screech square variant 3)
//    4 - Sundial2  (complex organic)
//    5 - Sawtooth  (algorithmic)
//    6 - Square    (algorithmic)
//
//  Based on: yorkmodular/tinydvco (MIT License)
//  Author:   mamonu
//  Created:  03 Apr 2026
//
//  ============================================================

#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/pgmspace.h>
#include "wavetables.h"

//  ================= ArdCore pin constants ====================

const int clkIn = 2;           // the digital (clock) input
const int digPin[2] = {3, 4};  // the digital output pins
const int pinOffset = 5;       // the first DAC pin (from 5-12)
const int trigTime = 10;       // trigger pulse duration in ms

//  ================= oscillator state =========================

// All variables accessed inside the Timer2 ISR must be volatile.
volatile uint16_t syncPhaseAcc = 0;   // 16-bit phase accumulator
volatile uint16_t syncPhaseInc = 0;   // phase increment (sets pitch)
volatile uint8_t  currentWave = 0;    // active waveform index
volatile uint8_t  phaseOffset = 0;    // phase modulation offset
volatile uint8_t  cycleFlag = 0;      // set by ISR when phase wraps

//  ================= trigger state ============================

volatile int clkState = LOW;          // clock input flag (hard sync)
int digState = LOW;
unsigned long digMilli = 0;

//  ================= waveform selection smoothing =============

#define WAVE_BUFF_LEN  4
#define WAVE_BUFF_SHIFT 2
uint16_t waveBuff[WAVE_BUFF_LEN];
uint8_t  waveBuffStep = 0;

//  ==================== setup() ===============================

void setup()
{
  // --- ArdCore standard pin setup ---

  // Clock input
  pinMode(clkIn, INPUT);

  // Digital outputs
  for (int i = 0; i < 2; i++) {
    pinMode(digPin[i], OUTPUT);
    digitalWrite(digPin[i], LOW);
  }

  // 8-bit DAC output pins (5-12)
  for (int i = 0; i < 8; i++) {
    pinMode(pinOffset + i, OUTPUT);
    digitalWrite(pinOffset + i, LOW);
  }

  // Clock interrupt for hard sync
  attachInterrupt(0, clkISR, RISING);

  // --- Timer2 setup: CTC mode, sample clock ---
  //
  // 16MHz / 8 prescaler = 2MHz timer tick
  // OCR2A = 29 → ISR fires every 30 ticks → 66.67kHz sample rate
  // This matches the original tinydvco rate so freqTable works as-is.
  cli();
  TCCR2A = (1 << WGM21);           // CTC mode (clear on compare match)
  TCCR2B = (1 << CS21);            // /8 prescaler
  OCR2A  = 29;                     // compare value → 66.67kHz
  TIMSK2 = (1 << OCIE2A);          // enable compare match A interrupt
  sei();

  // Zero the waveform selection buffer
  memset(waveBuff, 0, sizeof(waveBuff));
}

//  ==================== Timer2 ISR (sample output) ============
//
//  This fires at 66.67kHz. It must be as fast as possible:
//  advance phase accumulator, look up sample, write to DAC.

ISR(TIMER2_COMPA_vect)
{
  uint8_t val;
  uint16_t prevPhase = syncPhaseAcc;

  // Hard sync: reset phase if clock was received
  if (clkState) {
    clkState = LOW;
    syncPhaseAcc = 0;
    prevPhase = 0;
  }

  // Advance phase accumulator (>> 1 matches original tinydvco scaling)
  syncPhaseAcc += syncPhaseInc >> 1;

  // Extract 8-bit table index from top byte of accumulator
  uint8_t step = syncPhaseAcc >> 8;

  // Detect cycle wrap (accumulator rolled over) for D0 trigger
  if (syncPhaseAcc < prevPhase) {
    cycleFlag = 1;
  }

  // Look up or compute sample based on current waveform
  switch (currentWave) {
    case WT_SAW:
      val = step;
      break;
    case WT_SQUARE:
      val = (step < 128) ? 0x00 : 0xFF;
      break;
    default: {
      // Wavetable lookup from PROGMEM
      const uint8_t *tbl = (const uint8_t *)pgm_read_ptr(&wavetables[currentWave]);
      uint8_t idx = step + phaseOffset;
      val = pgm_read_byte_near(tbl + idx);
      break;
    }
  }

  // Write to R-2R DAC (pins 5-12) via direct port manipulation
  PORTB = (PORTB & B11100000) | (val >> 3);
  PORTD = (PORTD & B00011111) | ((val & B00000111) << 5);
}

//  ==================== loop() ================================
//
//  Reads knobs and CV inputs. Runs at whatever rate is left
//  over after ISR servicing (~2-3kHz with 4 analogReads).

void loop()
{
  // --- Read pitch CV (A2) and apply frequency table ---
  uint16_t cvRaw = analogRead(2);
  uint16_t baseFreq = mapFreq(cvRaw);

  // --- Read fine-tune knob (A1) and apply offset ---
  // Center position (512) = no offset. Range: roughly ±1 semitone.
  int fineTune = (int)analogRead(1) - 512;
  int16_t freqWithTune = (int16_t)baseFreq + (fineTune >> 3);
  if (freqWithTune < 0) freqWithTune = 0;
  syncPhaseInc = (uint16_t)freqWithTune;

  // --- Read phase modulation CV (A3) ---
  phaseOffset = analogRead(3) >> 2;  // 0-255

  // --- Read waveform select knob (A0) with smoothing ---
  // Buffer the last 4 readings and average to avoid jitter.
  uint16_t waveRaw = analogRead(0);
  // Map 0-1023 to 0-(NUM_WAVETABLES-1) = 0-6
  uint8_t waveIdx = (uint8_t)((uint32_t)waveRaw * NUM_WAVETABLES / 1024);
  if (waveIdx >= NUM_WAVETABLES) waveIdx = NUM_WAVETABLES - 1;

  waveBuff[waveBuffStep++] = waveIdx;
  if (waveBuffStep >= WAVE_BUFF_LEN) {
    uint16_t acc = 0;
    for (int i = 0; i < WAVE_BUFF_LEN; i++) acc += waveBuff[i];
    currentWave = (acc >> WAVE_BUFF_SHIFT);
    if (currentWave >= NUM_WAVETABLES) currentWave = NUM_WAVETABLES - 1;
    waveBuffStep = 0;
  }

  // --- Handle cycle trigger on D0 ---
  if (cycleFlag) {
    cycleFlag = 0;
    digState = HIGH;
    digMilli = millis();
    digitalWrite(digPin[0], HIGH);
  }

  // --- Trigger turn-off ---
  if ((digState == HIGH) && (millis() - digMilli > trigTime)) {
    digState = LOW;
    digitalWrite(digPin[0], LOW);
  }
}

//  =================== interrupt handlers =====================

// Clock input ISR — just sets a flag for hard sync.
// The actual phase reset happens inside the Timer2 ISR
// for sample-accurate sync.
void clkISR()
{
  clkState = HIGH;
}
