/* FIXED COPY, 24 Sep 2026, of BLOG_DELAY_BEST (the original is left as
   it was). What was wrong and what changed:

   1. The delay knob ran backwards. The code read the buffer delayLength
      samples ahead of where it writes, which in a ring buffer means
      (buffer size - delayLength) samples behind. So turning the knob up
      made the delay shorter. It now reads delayLength samples behind:
      turn up for a longer delay.

   2. The header below had the knobs swapped. In the code, and here:
      A1 = delay time, A3 = feedback. A0 isn't read.

   Kept on purpose: the all-or-nothing feedback
   (feedback = feedback && random(500)), the "VERY COOL EFFECT" this
   sketch is built around. Any A3 above zero gives full feedback that
   randomly cuts out, and the repeats pile up until they wrap.
*/

/* Delay WITH WEIRD LOOPING

Delay Input= jack A2...KNOB A2=INPUT LEVEL...turn this down quite a bit
Delay time=knob/jack A3
knob A0=mod...weird!!!
knob a1=FEEDBACK and looping


*/

#include "dsp.h" // include hardware timers and definitions
const int pinOffset = 5;       // the first DAC pin (from 5-12)
void setup() {
  
     // set up the 8-bit DAC output pins
  for (int i=0; i<8; i++) {
    pinMode(pinOffset+i, OUTPUT);
    digitalWrite(pinOffset+i, LOW);
    
  }

//Serial.begin(115200); //start fast serial comm

setupIO(); //run hardware timers setup

}

const short arraySize = 900; //max delay size for ATmega328 ~950
short delayLength = 1;
short timer = 0;

short timeout = 2048; //keep timeout low to keep from lowering srate
float feedback = 0.5;
unsigned short delArr[arraySize];
unsigned short input, out, pointer=0, delPointer;


//Main processing loop - one cycle per sample
void loop() {
	//read controll values from pots
	if(timer>timeout){ //check the clock
		//read the scaled pins
		delayLength = ( ( (float)arraySize-1 ) * ((float)analogRead(1)/1024.0)) + 1;
		feedback = (float)analogRead(3) / 1600.0; //limit feedback
		timer = 0; //reset the clock
	}



	//count the clock
	timer++; 
 
	//read the input value (signal => sample)
	input = analogRead(2);
 
	//update delPointer (where are we in the array)
	// read delayLength samples behind the write position.
	// (The original read delayLength samples AHEAD, which in a ring
	// buffer is arraySize - delayLength behind: the knob ran backwards.)
	delPointer = pointer + arraySize - delayLength;
	delPointer = delPointer % arraySize;
// delayLength=(delayLength&&random(500)); //not as great
feedback=((feedback)&&(random(500)));  // VERY COOL EFFECT!!
	//insert sample into the array with feedback.
	delArr[pointer] = input + (delArr[delPointer] * feedback);

 
	//set the output sample
	out = delArr[delPointer] + input;
	out = out >> 2; //reduce vol to prevent clipping. [adjust this if you change code]
 
	//move the array pointer
	pointer++;
	pointer = pointer % arraySize;

int output=out;
	//write to the pins [play the sample]
	dacOutput(output);//(left, out);
	//output(right, out);

}



//  =================== convenience routines ===================

//  isr() - quickly handle interrupts from the clock input
//  ------------------------------------------------------
//void isr()
//{
  //clkState = HIGH;
//}

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
