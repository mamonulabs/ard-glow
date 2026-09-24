/* FIXED COPY, 24 Sep 2026, of DeadCityRadio_LFOrate (the original is left as
   it was). What was wrong and what changed:

   1. After the first refill, the buffer was refilled on every pass
      through loop(). The line meant to clear the refill flag was
      "buffFlag == false;", a comparison that does nothing, so the flag
      stayed true. It now reads "buffFlag = false;", and the buffer is
      refilled once each time playback reaches its end.

   2. The smoothing read memory it shouldn't. whitenoise() used a
      variable, bufferMax, that was never given a value, as the index
      of the neighbouring samples, so at the ends of the buffer it read
      from wherever that garbage pointed.

   3. The smoothing didn't smooth. It averaged each new sample with old
      samples from the mirror-image position in the buffer, which are
      just other random values, so the noise got quieter but not
      darker. It now averages each sample with the one, two or three
      made just before it (A3), a real low-pass: the higher the
      setting, the darker the noise.

   4. buffFlag and bufferPointer are changed inside an interrupt and
      read in loop(), so they are now volatile.

   5. The step rate. The original counted passes through loop() and
      stepped after a knob-set number of them, so its speed depended on
      how long each pass took, and with the nonstop refill that was
      several milliseconds. With the refill fixed, each pass is roughly
      ten times quicker and the same count would step ten times faster,
      at the top end fast enough to be a buzz (the original already
      notes it was "too fast at the top end"). It now steps on a clock
      in milliseconds: A1 sets 20ms to about 2s per step, turn up for
      faster, and A2 fine-tunes it by up to 32ms either way.
*/

/**
 * Dead City Radio
 * White noise generator at modulation rates
 * A[0] Volume
 * A[1] Pitch
 * A[2] Fine Pitch
 * A[3] smoothing (0-3)
 *
 * If you want an audio speed version of this see the other sketch in the Dead City Radio folder
 *
 * Ardcore expander users: This patch produces some REALLY nice gate patterns out of the dac bits, try it :D
 */
 
#define cbi(sfr, bit) (_SFR_BYTE(sfr) &= ~_BV(bit))
#define sbi(sfr, bit) (_SFR_BYTE(sfr) |= _BV(bit))

const int bufferSize = 128;
float noizBuffer[bufferSize];
volatile int bufferPointer = 0;   // FIXED: volatile
volatile boolean buffFlag = false;   // FIXED: volatile
float noizLevel = 1.0;

#define SPEEDMULTCOUNT 2
int interp;

int doOutput(unsigned long speedcal)
{
    //knob range is too big at the moment, and too fast at the top end
    static int multCount = 0;
    int v;
    v = (noizBuffer[bufferPointer]+1)*127;
 
    PORTB = (PORTB & B11100000) | (v >> 3);
    PORTD = (PORTD & B00011111) | ((v & B00000111) << 5);
   
    (bufferPointer < bufferSize-1)?bufferPointer++:bufferPointer = 0;
    if(bufferPointer == 0)
      buffFlag = true;
    return 0;
}

long deJitter(long v, long test)
{
  if (abs(v - test) > 1) {
    return v;
  }
  return test;
}

 
 



//make the white noise buffer
float g_fScale = 2.0f / 0xffffffff;
long int g_x1 = 0x67452301;
long int g_x2 = 0xefcdab89;

void whitenoise(
  float* _fpDstBuffer, // Pointer to buffer
  unsigned int _uiBufferSize, // Size of buffer
  float _fLevel ) // Noiselevel (0.0 ... 1.0)
{
  // FIXED: smoothing now averages each new sample with the ones made
  // just before it (see the note at the top).
  static float h1 = 0, h2 = 0, h3 = 0;   // the last three raw samples
  _fLevel *= g_fScale;
  while( _uiBufferSize-- )
  {
    g_x1 ^= g_x2;
    float s = g_x2 * _fLevel;
    float out;
    if (interp == 1)      out = (s + h1) / 2;
    else if (interp == 2) out = (s + h1 + h2) / 3;
    else if (interp == 3) out = (s + h1 + h2 + h3) / 4;
    else                  out = s;
    h3 = h2; h2 = h1; h1 = s;
    if (out > 1)  out = 1;
    if (out < -1) out = -1;
    *_fpDstBuffer++ = out;
    g_x2 += g_x1;
  }
}

void setup()
{
  Serial.begin(9600);
  DDRD = DDRD | B11111000;
  DDRB = B111111;
  PORTD = B00000000;
  PORTB = B000000;
  whitenoise(noizBuffer,bufferSize, 1.0); //generate the first noise buffer
}

void loop()
{
  //our pitch vals
  static unsigned long pitchL;
  static int pitchF;
  static unsigned long speedcalc;
  static unsigned long speedcount;
  static unsigned long speedmult;
  if(buffFlag == true){
    whitenoise(noizBuffer,bufferSize, noizLevel);
    buffFlag = false;   // FIXED: was ==
  }
  
  noizLevel = analogRead(0)/1024.0;
  //these ranges need improving
  pitchL = (16384-(analogRead(1)<<4))+32;
  pitchF = ((64 -(analogRead(2)>>4)) - 32);
  speedcalc = (pitchL + pitchF);

  interp = analogRead(3)>>8;


  // FIXED: step on a millisecond clock instead of counting loop passes
  static unsigned long lastStep = 0;
  long stepMs = ((1023 - (long)analogRead(1)) << 1) + 20
              + ((512 - (long)analogRead(2)) >> 4);
  if (stepMs < 5) stepMs = 5;
  if (millis() - lastStep >= (unsigned long)stepMs) {
    lastStep = millis();
    doOutput(0);
  }

}

