/* Stereo BeatGen v1 slight mod for ardcore


//works on Ardcore by using Do and D1 as outputs
//put a gate into clock input to mess with pattern
//A0 is RANDOM SEED POT

- originally written by Loud Objects for the ATTiny85/NOISE TOY projects
loudobjects.com
- adapted/messed with for Arduino by Collin Cunningham
me [at] collinmel.com

assumes pins 3 & 4 connected to left & right audio


*/

/* FIXED COPY, 24 Sep 2026, of stereo_beat_gen_pde (the original is left
   as it was). What was wrong and what changed:

   1. It didn't compile. A global near the top is set with randomGen(),
      but randomGen() is only defined at the bottom of the file, and the
      Arduino tools don't add a declaration in time for a global. There
      is now a declaration just below this note.

   2. It watched pin 9 for a "new beat" button, with pins 8 and 9 set up
      as pulled-up inputs. On the ArdCore those are two of the DAC pins,
      wired into the resistor ladder, not buttons, so the pattern could
      re-roll by itself. Pins 8 and 9 are now left alone, and the
      new-beat action moved to the A1 knob: turn it past halfway to roll
      a new pattern (it rolls once each time it crosses halfway).

   Everything else is as in Loud Objects' original: 1-bit bass and snare
   on an 8-step pattern, left on D0, right on D1, A0 picks a tempo while
   CLK is low, a gate on CLK freezes it.
*/

unsigned long randomGen(void);   // declared here so the globals below can use it
unsigned char lastA1High = 0;    // for the A1 new-beat control

unsigned long NextRandom = 1;
unsigned long Bass_Start = 300, Bass_End = 600;
unsigned char Last_Val_Left = 1, Last_Val_Right = 1;
unsigned long Bass_Left_Period = Bass_Start, Bass_Right_Period = Bass_Start;
unsigned long Bass_Left_Sample = 1, Bass_Right_Sample = 1;
unsigned char Bass_Left_On = 1, Bass_Right_On = 1;
unsigned char Snare_Left_On = 1, Snare_Right_On = 1;
unsigned char Snare_Left_Sample = 1, Snare_Right_Sample = 1;
unsigned long Tempo_Period = 1200, Tempo_Outer = 1, Tempo_Sample = 1;
unsigned char Trax_Left[] = {
1, 2, 3, 0, 3, 2, 0, 1};
unsigned char Trax_Right[] = {
2, 1, 0, 3, 1, 3, 0, 2};
unsigned char Track_Index = -1;
unsigned long New_Rand = randomGen();
unsigned long NextRandom2 = 1;
unsigned long Snare_Length = 500;

void setup()
{
// SET PINS 3 AND 4 AS OUTPUTS
pinMode(3, OUTPUT);
pinMode(4, OUTPUT);
pinMode(2, INPUT);

// (the original set pull-ups on pins 8 and 9 here; on the ArdCore
// those are DAC pins, so they are left alone)
digitalWrite(5, LOW);

}

void loop(){

NextRandom2 = NextRandom2 + 9;
New_Rand = NextRandom2;

// UPDATE SAMPLES
if (Bass_Left_On)
{
if (!(--Bass_Left_Sample))
{
if ((Bass_Left_Period += 11) > Bass_End)
{
Bass_Left_On = 0;
}
Bass_Left_Sample = Bass_Left_Period;
Last_Val_Left = 1 - Last_Val_Left;
}
}

if (Bass_Right_On)
{
if (!(--Bass_Right_Sample))
{
if ((Bass_Right_Period += 13) > Bass_End)
{
Bass_Right_On = 0;
}
Bass_Right_Sample = Bass_Right_Period;
Last_Val_Right = 1 - Last_Val_Right;
}
}

if (Snare_Left_On)
{
if (!(--Snare_Left_Sample))
{
Snare_Left_Sample = New_Rand / 200;// % 10;
Last_Val_Left = 1 - Last_Val_Left;
}
if (!(--Snare_Length))
{
Snare_Left_On = 0;
}
}

if (Snare_Right_On)
{
if (!(--Snare_Right_Sample))
{
Snare_Right_Sample = New_Rand / 200;// % 10;
Last_Val_Right = 1 - Last_Val_Right;
}
if (!(--Snare_Length))
{
Snare_Right_On = 0;
}
}

// CHECK FOR NEXT BEAT
if (!(--Tempo_Outer))
{
Tempo_Outer = 10;
if (!(--Tempo_Sample))
{
if (++Track_Index == 8)
Track_Index = 0;

Tempo_Sample = Tempo_Period;
Bass_Left_On = (Trax_Left[Track_Index] & 1);
Bass_Right_On = (Trax_Right[Track_Index] & 1);
Snare_Left_On = (Trax_Left[Track_Index] & 2);
Snare_Right_On = (Trax_Right[Track_Index] & 2);
Snare_Length = 5000;
Bass_Left_Period = Bass_Start;
Bass_Left_Sample = 1;
Bass_Right_Period = Bass_Start;
Bass_Right_Sample = 1;
}
}

// OUTPUT
if (Last_Val_Left)
PORTD |= (1 << 3);
else
PORTD &= ~((1 << 3));
if (Last_Val_Right)
PORTD |= (1 << 4);
else
PORTD &= ~((1 << 4));

// BUTTON INPUT CHECKS
//pin 8 for tempo
if ((digitalRead(2)) == LOW)
{
randomSeed(analogRead(0));
Tempo_Period = (random(1627) / 15 * 25); // experiment with diff values for better range
}
//new beat: A1 crossing halfway (was pin 9)
unsigned char a1High = (analogRead(1) > 511);
unsigned char newBeat = (a1High && !lastA1High);
lastA1High = a1High;
if (newBeat)
{
unsigned char i;
for (i = 0; i < 8; i++)
{
Trax_Left[i] = randomGen();
Trax_Right[i] = randomGen();
}
}
}

unsigned long randomGen(void) //pseudo random from original sketch
{
NextRandom = NextRandom * 3865 + 131;
return ((NextRandom >> 16) & 32767);
}
