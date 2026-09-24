/* FIXED COPY, 24 Sep 2026, of waveshpr2 (the original is left as it
   was). What was wrong and what changed:

   1. The array of shifted copies was declared with 10 slots and filled
      with 11: xorvalue[10] was written past the end, onto whatever sat
      next to it on the stack. It now has 11 slots.

   2. It always played the same shape. x and v, which pick the two
      shifted copies to XOR, were set to 1 and 0 at the start of every
      call and then bumped once, so every sample used copies 2 and 1:
      the input shifted up 4 XORed with it shifted up 5. The header
      lists A1 as "wave offset" and A2 as "wave shape depth/CV", but
      neither was read. They now pick the two copies: A1 chooses one,
      A2 (knob or CV) the other, eleven positions each. When both
      pick the same copy the XOR is zero and the output goes quiet.

   Unchanged: A0 lowers the sample rate (fully left holds each sample
   for 22ms), A3 is the audio input, and the output is the low 8 bits
   of the result shifted down 2, so it wraps.
*/


//QUICK N DIRTY WAVESHAPER
//A0=crush
//A1=wave offset
//A2=Wave shape depth/Cv
//A3=input gain/Audio In..this effects sound quite a bit.

//DAC OUT=audio out
//
//
//




// defines for setting and clearing register bits
#ifndef cbi
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#endif
#ifndef sbi
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))
#endif

 int newOut;	

unsigned long SHmil = 0;
int    S1out;
int  CENTERPOS;

const int digPin[2] = {3, 4};  // the digital output pins
const int pinOffset = 5;       // the first DAC pin (from 5-12)
//volatile int clkState = LOW;

int digState[2] = {HIGH, LOW};  // start with both set low

void setup () {
  
 
    // set up the digital outputs
  for (int i=0; i<2; i++) {
    pinMode(digPin[i], OUTPUT);
    digitalWrite(digPin[i], digState[i]);
  }
  
    // set up the 8-bit DAC output pins
  for (int i=0; i<8; i++) {
    pinMode(pinOffset+i, OUTPUT);
    digitalWrite(pinOffset+i, LOW);
    
    
      // set the ADC to a higher prescale factor
  sbi(ADCSRA,ADPS2);
  cbi(ADCSRA,ADPS1);
  sbi(ADCSRA,ADPS0);
  }
  
  
  
  
}

void loop () {
 //  CENTERPOS=analogRead(2)>>2;
  S1out=analogRead(3)>>2;
  
  distortion();

   dacOutput(newOut>>2);
    delayMicroseconds(map(analogRead(0), 0, 1023, 22000, 1));
   //  CENTERPOS=analogRead(2)>>2;
}





// Swap high and low nibbles
void distortion(void) {
  int x = (analogRead(1) * 11L) >> 10;   // FIXED: 0-10 from A1
  int v = (analogRead(2) * 11L) >> 10;   // FIXED: 0-10 from A2

  int xorvalue[11];                      // FIXED: was [10], written up to [10]
  xorvalue[0]=S1out>>1;
  xorvalue[1]=S1out<<5;
  xorvalue[2]=S1out<<4;
  xorvalue[3]=S1out<<3;
  xorvalue[4]=S1out<<2;
  xorvalue[5]=S1out<<1;
  xorvalue[6]=S1out>>1;
  xorvalue[7]=S1out>>2;
  xorvalue[8]=S1out>>3;
  xorvalue[9]=S1out>>4;
  xorvalue[10]=S1out;

  newOut = xorvalue[x] ^ xorvalue[v];
}




    

  
  

//  dacOutput(long) - deal with the DAC output
//  ------------------------------------------
void dacOutput(long v)
{
 int tmpVal = v;
 bitWrite(PORTD, 5, tmpVal & 1);
 bitWrite(PORTD, 6, (tmpVal & 2) > 0);
 bitWrite(PORTD, 7, (tmpVal & 4) > 0);
 bitWrite(PORTB, 0, (tmpVal & 8) > 0);
 bitWrite(PORTB, 1, (tmpVal & 16) > 0);
 bitWrite(PORTB, 2, (tmpVal & 32) > 0);
 bitWrite(PORTB, 3, (tmpVal & 64) > 0);
 bitWrite(PORTB, 4, (tmpVal & 128) > 0);
}
