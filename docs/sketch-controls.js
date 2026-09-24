/*
 * sketch-controls.js
 *
 * What each sketch does with the ArdCore's knobs and jacks, keyed by the
 * sketch path used in the catalog. Written from the code, not the header
 * comments.
 *
 *   how:    a few sentences on what the sketch is
 *   notes:  one line per control it uses. Ids are the ones in
 *           ardcore-panel.js: A0 A1 A2k A3k A2 CLK A3 D0 D0led D1 D1led DAC DATA DATAled
 *   extra:  anything that isn't on the panel (expanders, quirks)
 */
window.SKETCH_CONTROLS = {

  'official/AC25_VCAREnvelope/': {
    how: 'An attack/decay envelope. A trigger at CLK starts the rise from wherever the output is, so retriggering doesn\'t jump back to zero first. There\'s no sustain: it goes up to the top and straight back down.',
    notes: {
      A0:    'Attack time, from a few milliseconds up to about half a second. A2 adds to it.',
      A1:    'Decay time, same range. A3 adds to it.',
      A2k:   'More attack time on top of A0. With a cable in A2, it attenuates that CV instead.',
      A3k:   'More decay time on top of A1. With a cable in A3, it attenuates that CV instead.',
      A2:    'CV added to the attack time. More voltage, slower attack.',
      A3:    'CV added to the decay time. More voltage, slower decay.',
      CLK:   'A trigger here starts the envelope. It also restarts the rise if one is already running.',
      D0:    '25ms trigger when the envelope hits the top.',
      D0led: 'Flashes at the top of the envelope.',
      D1:    '25ms trigger when the envelope gets back to zero. It also fires if you retrigger while it\'s falling.',
      D1led: 'Flashes at the end of the envelope.',
      DAC:   'The envelope, 0 to 5V.'
    },
    extra: 'With the output expander, its eight outputs carry the envelope\'s eight bits.'
  },

  'official/AC29_VCADLoopEnvelope/': {
    how: 'The same attack/decay as AC25, but with gates instead of triggers. D0 is high for as long as the envelope is moving and D1 is high when it has stopped. Despite the name it doesn\'t loop: each trigger at CLK gives you one envelope.',
    notes: {
      A0:    'Attack time, from a few milliseconds up to about half a second. A2 adds to it.',
      A1:    'Decay time, same range. A3 adds to it.',
      A2k:   'More attack time on top of A0. With a cable in A2, it attenuates that CV instead.',
      A3k:   'More decay time on top of A1. With a cable in A3, it attenuates that CV instead.',
      A2:    'CV added to the attack time. More voltage, slower attack.',
      A3:    'CV added to the decay time. More voltage, slower decay.',
      CLK:   'A trigger here starts the envelope. Retriggering restarts the rise from the current level.',
      D0:    'Gate, high while the envelope is rising or falling.',
      D0led: 'On while the envelope is running.',
      D1:    'Gate, high while the envelope is at rest. It\'s the opposite of D0.',
      D1led: 'On while the envelope is at rest.',
      DAC:   'The envelope, 0 to 5V.'
    },
    extra: 'With the output expander, its eight outputs carry the envelope\'s eight bits.'
  },

  'official/AC32_BouncingBall/': {
    how: 'Drop a ball and let it bounce. A trigger at CLK starts it, and every bounce comes a bit sooner than the last until it settles. Each bounce fires D0 and steps the DAC down, so you get a rhythm and a falling staircase of voltages.',
    notes: {
      A0:    'Time to the first bounce, from 0 to 2 seconds.',
      A1:    'When to stop. The ball comes to rest once the gap between bounces is shorter than this: 5ms fully left, around half the first gap fully right. Turn it up for fewer bounces.',
      A2k:   'How bouncy the ball is. Fully left, each gap is half the one before. Fully right, the gaps barely shrink and it bounces for ages. With a cable in A2, it attenuates that CV.',
      A3k:   'Friction. Takes up to 100ms off every gap, so the bounces die out sooner. With a cable in A3, it attenuates that CV.',
      A2:    'CV for bounciness.',
      A3:    'CV for friction.',
      CLK:   'A trigger here drops the ball from the top, even if it\'s still bouncing.',
      D0:    '10ms trigger on every bounce, including the first one when the ball is dropped.',
      D0led: 'Flashes on each bounce.',
      D1:    'Gate, high once the ball has come to rest.',
      D1led: 'On while the ball is at rest.',
      DAC:   'Jumps to 5V when the ball is dropped, then steps down on each bounce in proportion to the gap. It holds the last step when the ball stops.'
    },
    extra: 'With the output expander, its eight outputs carry the DAC\'s eight bits.'
  },

  'community/user_submitted/AC34_LoopingVCEnvelope/': {
    how: 'AC25 on a loop. It starts running at power-up: up to the top, back down, a trigger on D1, and straight into the next one. Patch D1 into a few sample and holds and feed them back into A2 and A3 and it changes its own shape every cycle.',
    notes: {
      A0:    'Attack time, from a few milliseconds up to about half a second. A2 adds to it.',
      A1:    'Release time, same range. A3 adds to it.',
      A2k:   'More attack time on top of A0. With a cable in A2, it attenuates that CV instead.',
      A3k:   'More release time on top of A1. With a cable in A3, it attenuates that CV instead.',
      A2:    'CV added to the attack time. More voltage, slower attack.',
      A3:    'CV added to the release time. More voltage, slower release.',
      CLK:   'Hard sync. A trigger drops the output to zero and starts a new attack. It doesn\'t fire D1.',
      D0:    '25ms trigger at the top of each cycle.',
      D0led: 'Flashes at the top of each cycle.',
      D1:    '25ms trigger at the end of each cycle, just as the next one starts.',
      D1led: 'Flashes at the end of each cycle.',
      DAC:   'The looping envelope, 0 to 5V.'
    },
    extra: 'With the output expander, its eight outputs carry the envelope\'s eight bits.'
  },

  'snazzy_fx/ADSR_envelope/ADSR_ENV/': {
    how: 'A gated envelope by Dan Snazelle. Hold a gate high on A2 and it rises and then falls, and when the gate drops it releases. The sustain level is fixed in the code and works out at about zero, so while the gate is held it behaves like attack/decay. CLK, D0 and D1 aren\'t used.',
    notes: {
      A0:    'Attack. Only the bottom quarter of the knob does anything: from fast at zero to just under a second at a quarter turn. Past that the level rounds to zero on every step and the envelope never rises.',
      A1:    'Decay time, from very fast up to just under a second.',
      A2k:   'With nothing in A2, this is a manual gate: turn it up past about half a volt to open it, back down to close it. With a cable in, it attenuates the gate.',
      A2:    'Gate in. Above about 0.6V the envelope runs, below about 0.5V it releases.',
      A3k:   'Release time. With a cable in A3, it attenuates that CV instead.',
      A3:    'CV for release time. More voltage, longer release.',
      DAC:   'The envelope, 0 to 5V.'
    },
    extra: 'The sustain level is set by the line marked CHANGE THIS VALUE in the code. It\'s written for a 0 to 255 range but the envelope runs 0 to 1023, which is why it ends up near zero.'
  },
  'official/AC07_Sequencer/': {
    how: 'An 8-step sequencer you program with the two knobs. Park A1 on a step and after a quarter of a second that step takes whatever A0 is set to. Each clock plays the next step.',
    notes: {
      A0:    'The note for the step A1 is resting on, in 64 levels. It keeps writing for as long as A1 stays put, so set A0 first, then move A1 on.',
      A1:    'Picks which of the 8 steps you are editing. Whatever step it rests on for a quarter of a second gets A0\'s value, so sweeping past steps is safe but stopping on one isn\'t.',
      CLK:   'Moves to the next step and plays it.',
      D0:    '25ms trigger on every step.',
      D0led: 'Flashes on every step.',
      D1:    '25ms trigger when the step you\'re editing comes round, so you can hear where you are.',
      D1led: 'Flashes on the step you\'re editing.',
      DAC:   'The current step\'s note. The 64 levels are about 78mV apart, a little short of a semitone.'
    },
    extra: 'With the output expander, its eight outputs carry the note\'s eight bits.'
  },

  'official/AC10_NoteDelay/': {
    how: 'A delay line for notes. Each clock grabs the voltage at A2 and plays it back on the DAC a set time later, with a trigger. It holds up to 100 notes in the queue.',
    notes: {
      A0:    'Delay time, from none up to about 2 seconds. Changing it also moves notes that are already waiting.',
      A2k:   'With nothing in A2, this sets the note that gets grabbed. With a cable in, it attenuates the incoming pitch.',
      A2:    'The note to delay.',
      CLK:   'Grabs whatever is at A2 and puts it in the queue.',
      D0:    '25ms trigger each time a delayed note comes out.',
      D0led: 'Flashes as each delayed note plays.',
      DAC:   'The delayed notes, in 64 levels about 78mV apart.'
    },
    extra: 'Needs Alexander Brevig\'s SimpleFIFO library to compile, which is why it shows amber in the catalog.'
  },

  'official/AC14_GateSequence/': {
    how: 'Eight 16-step gate patterns, written into the code, all stepping together. It\'s built for the output expander, where each pattern gets its own jack. D0 and D1 carry the first two patterns so you can use it without one.',
    notes: {
      A0:    'Tempo. Fully left it only moves on CLK. Turn it up and it runs on its own, from about one step a second up to one every 15ms.',
      CLK:   'Moves to the next step. It still works with the internal clock running, and adds extra steps.',
      D0:    '10ms trigger on every fourth step: a four-on-the-floor kick.',
      D0led: 'Flashes with D0.',
      D1:    '10ms trigger on every second step.',
      D1led: 'Flashes with D1.',
      DAC:   'All eight patterns at once, one per bit, so the voltage jumps about in rhythm. On its own it\'s a lumpy stepped CV. It\'s really meant for the expander.'
    },
    extra: 'With the output expander, the eight jacks get: every 4th step, every 2nd, every 3rd, every step, two in every three, the off-beats, every 4th but skipping the first, and a skipping three-step pattern. Change them in the outSeq table at the top of the code.'
  },

  'official/AC27_101SEQ/': {
    how: 'A take on the SH-101\'s sequencer. Push A3 high and it records a note from A2 on every clock, up to 64. Drop A3 and it plays them back in a loop, with the knobs setting where the loop starts and ends. The recording is saved and comes back after a power cycle.',
    notes: {
      A0:    'Loop start, anywhere in what you recorded.',
      A1:    'Loop end. The loop stops just before this step, and the very last recorded note never plays back.',
      A2k:   'With nothing in A2, this sets the note to record, so you can step-program by hand. With a cable in, it attenuates the incoming pitch.',
      A3k:   'With nothing in A3, this is the record switch: past halfway to record, back to play. With a cable in, it attenuates that gate.',
      A2:    'Pitch to record, rounded to the nearest semitone.',
      A3:    'Record gate. Above 2.5V it starts a new recording from step 1. Going low saves it and starts playback.',
      CLK:   'Records or plays one step.',
      D0:    'Gate, high while recording.',
      D0led: 'On while recording.',
      D1:    '10ms trigger on every step, recording or playing.',
      D1led: 'Flashes on every step.',
      DAC:   'The recorded notes. Each semitone is 4 DAC steps, about 78mV, so tunes come out a little flat as they go up: about two thirds of a semitone per octave.'
    },
    extra: 'When the 64 steps are full it stops recording by itself and saves. To record again, take A3 low and then high.'
  },

  'official/AC30_DualEuclidean/': {
    how: 'Two Euclidean rhythms on one clock. Set how many steps each pattern has and how many hits to spread across them, and it spaces the hits out as evenly as it can.',
    notes: {
      A0:    'Length of rhythm A, from 1 to 32 steps.',
      A1:    'Length of rhythm B, from 1 to 32 steps.',
      A2k:   'Hits in rhythm A, from 1 to 32. With a cable in A2, it attenuates that CV.',
      A3k:   'Hits in rhythm B, from 1 to 32. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the number of hits in A.',
      A3:    'CV for the number of hits in B.',
      CLK:   'Moves both rhythms on a step.',
      D0:    'Rhythm A, 25ms triggers.',
      D0led: 'Flashes with rhythm A.',
      D1:    'Rhythm B, 25ms triggers.',
      D1led: 'Flashes with rhythm B.',
      DAC:   'A 25ms 5V pulse on every clock, so you get a copy of the clock.'
    },
    extra: 'With the output expander, all eight jacks pulse together with the clock.'
  },

  'community/asct/ASCTard001_Analytic_Geometry/': {
    how: 'By Ascetic. It records 64 steps of CV and lays them out as an 8 by 8 grid. In playback, A2 and A3 are the X and Y of the square to play, so two LFOs or random sources wander it around the grid.',
    notes: {
      A0:    'Mode. The first three eighths of the knob records, the next two plays back with the original order mixed in, the last three plays back from the grid.',
      A2k:   'In record mode, sets the value to record. In playback, the X position. With a cable in A2, it attenuates that CV.',
      A3k:   'Y position in playback. With a cable in A3, it attenuates that CV.',
      A2:    'In record mode, the CV to record. In playback, X: 0 to 5V covers the 8 columns.',
      A3:    'Y position in playback: 0 to 5V covers the 8 rows. Not used when recording.',
      CLK:   'Records one step or plays one square.',
      D0:    '25ms trigger on each step.',
      D0led: 'Flashes on each step.',
      D1:    'Recording: goes high at the start of the 64 steps. Playback: 25ms trigger on each step, same as D0.',
      D1led: 'Marks the start of the recording, or flashes on each step in playback.',
      DAC:   'Recording: the input passed straight through. Playback: the value in the chosen square. 64 levels, about 78mV apart.'
    },
    extra: 'In the middle mode, when A2 and A3 are both at zero it steps through the recording in order instead of reading the grid, so the original pattern comes back.'
  },

  'community/asct/ASCTard009_Phase_patterns/': {
    how: 'By Ascetic, after Steve Reich\'s Piano Phase. Two clocks run at almost the same speed. One plays a 12-note figure (E F♯ B C♯ D F♯ E C♯ B F♯ D C♯) and triggers D0, the other runs a touch slower and triggers D1, so the two drift apart and back together.',
    notes: {
      A0:    'Trigger length for D0 and D1, from 1 to 128ms.',
      A1:    'Transposes the tune up by 0 to 11 semitones.',
      A2k:   'Clock mode. Fully left stops it. The first quarter follows CLK. Past that it runs on its own, from about 0.9s per note down to 0.1s. With a cable in A2, it attenuates that CV.',
      A3k:   'How much slower the second clock runs, 0 to 127ms per step. At zero they stay locked together. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the clock mode and internal tempo.',
      A3:    'CV for the phase amount.',
      CLK:   'External clock, when A2 is in its first quarter. It measures the time between pulses and uses that as the tempo.',
      D0:    'Trigger on each note of the tune.',
      D0led: 'Flashes on each note.',
      D1:    'Trigger from the second, slower clock.',
      D1led: 'Flashes with the second clock.',
      DAC:   'The tune. Each semitone is 4 DAC steps, about 78mV, so it\'s a little narrow against 1V/oct.'
    },
    extra: 'Needs the TimedAction library to compile, which is why it shows amber in the catalog. On the internal clock, moving A3 can knock D1 off tempo until you touch A2 again. If D0 drifts from your external clock, unplug CLK and plug it back in.'
  },

  'snazzy_fx/dans_trashy_mods/ACDAN1_DepthCharge/': {
    how: 'By Dan Snazelle. Despite sitting under Sequencers it has no clock: it free-runs as fast as it can. With A2 up it spits out random values, which is noise at audio rate. With A2 down it multiplies A2 by A3 and wraps the result, which folds CV into odd steps.',
    notes: {
      A0:    'Random depth. Fully left gives the full 256 levels. Turning up drops the fine detail until fully right there are only two levels, a square-ish crackle.',
      A2k:   'With nothing in A2, picks the mode: up past about 0.7V for random, below for the multiply mode. With a cable in, it attenuates that CV.',
      A3k:   'Only used in the multiply mode. With a cable in A3, it attenuates that CV.',
      A2:    'Above about 0.7V: random mode, and it also scales the D0 output. Below: one side of the multiply.',
      A3:    'The other side of the multiply, in the lower mode.',
      D0:    'In random mode, short PWM spikes that come and go: the "weird sputterings" from the original notes.',
      D0led: 'Flickers with D0.',
      DAC:   'Random mode: noise, coarser as A0 goes up. Multiply mode: A2 × A3, wrapped round every 256.'
    },
    extra: 'A1 is read once at power-up to seed the random numbers, so its position then decides the sequence you get. It isn\'t read after that.'
  },

  'snazzy_fx/dans_trashy_mods/mem_check_/': {
    how: 'A voltage recorder. Push A3 high and it records A2 on each clock, up to 512 steps. Every clock also plays one back, and A0 lets playback skip ahead so the recording comes out faster or scrambled.',
    notes: {
      A0:    'Playback hop: how many steps it moves per clock, from 1 to 8.',
      A1:    'Loop length, from 1 to 255 steps. Only the first 255 of the 512 recorded steps can be reached. Keep it off fully left: a length of zero isn\'t handled.',
      A2k:   'With nothing in A2, sets the voltage to record. With a cable in, it attenuates the input.',
      A3k:   'With nothing in A3, past about a quarter starts recording. With a cable in, it attenuates that gate.',
      A2:    'The CV to record.',
      A3:    'Record gate. Above about 1.25V it starts recording from step 1. While it stays high it records over and over.',
      CLK:   'Records one step if recording, and plays one step.',
      D0:    'Gate, high while recording.',
      D0led: 'On while recording.',
      D1:    '25ms trigger when a recording finishes.',
      D1led: 'Flashes when a recording finishes.',
      DAC:   'The recording, at full 8-bit resolution.'
    },
    extra: 'With the output expander, its eight outputs carry the DAC\'s eight bits.'
  },

  'snazzy_fx/LFSR/LFSR_SEQUENCER/': {
    how: 'By Dan Snazelle. A 32-bit shift register spitting out random steps on the DAC. There\'s no clock: A2 and A3 set how long it waits between steps. Fully left it runs flat out and you get noise. Turned up you get random stepped CV to feed a VCO.',
    notes: {
      A2k:   'Step time. Counts twice, so it has the bigger effect. With a cable in A2, it attenuates that CV.',
      A3k:   'More step time on top of A2. With a cable in A3, it attenuates that CV.',
      A2:    'CV for step time. An LFO here speeds it up and slows it down.',
      A3:    'CV for step time as well.',
      DAC:   'The random steps. Each one waits 2 × A2 + A3 milliseconds, so up to about 3 seconds per step.'
    },
    extra: 'The sequence technically repeats, but only after about four billion steps.'
  },

  'snazzy_fx/shift_register_64/': {
    how: 'By Dan Snazelle, from a Darwin Grosse sketch. Every clock records A2 into a 64-step loop and plays back an older step, so what you put in comes back out later. A3 transposes the output.',
    notes: {
      A0:    'How far back to read. The first eighth of the knob goes from 57 clocks ago to right now. Past that it wraps round, and for part of each lap it reads outside the buffer and throws out stray values.',
      A1:    'Past halfway, it plays from a second buffer recorded at twice the level and two steps out. Anything above about 2.5V wraps back to the bottom, and steps recorded at 0V become rests.',
      A2k:   'With nothing in A2, sets the value to record. With a cable in, it attenuates the input.',
      A3k:   'Transpose, from -12 to +12 steps. With a cable in A3, it attenuates that CV.',
      A2:    'The CV to record.',
      A3:    'CV for the transpose.',
      CLK:   'Records a step and plays one back.',
      D0:    '25ms trigger on each step it plays.',
      D0led: 'Flashes on each step.',
      DAC:   'The delayed step plus the transpose. Each transpose step is 4 DAC steps, about 78mV.'
    }
  },
  'official/AC03_DrunkenWalk/': {
    how: 'A random walk. Each step moves the output up or down by a random amount from where it was, so it wanders rather than jumps. It bounces off the top and bottom instead of sticking there.',
    notes: {
      A0:    'Speed. The first sixteenth of the knob is clock only. Past that it steps on its own, from about 1.2 seconds per step up to as fast as it can go.',
      A1:    'How far each step can go, from ±1 up to ±16 DAC steps.',
      A2k:   'Transpose, shifting the whole walk up. With a cable in A2, it attenuates that CV.',
      A3k:   'Past halfway, a step is allowed to land on the same value. Below, it always moves. With a cable in A3, it attenuates that CV.',
      A2:    'CV to transpose the walk. It folds back down if it goes over the top.',
      A3:    'Above 2.5V, repeats are allowed.',
      CLK:   'Takes a step. Works alongside the internal speed.',
      D0:    '10ms trigger on every step.',
      D0led: 'Flashes on every step.',
      DAC:   'The walk, 0 to 5V in 256 levels.'
    },
    extra: 'With the output expander, its eight outputs carry the walk\'s eight bits.'
  },

  'official/AC04_DrunkenNote/': {
    how: 'The same random walk as AC03, but on notes: it wanders over 61 semitones (five octaves) instead of raw voltage, so it plays melodies into a VCO.',
    notes: {
      A0:    'Speed. The first sixteenth of the knob is clock only. Past that it steps on its own, from about 1.2 seconds per note up to as fast as it can go.',
      A1:    'How far each step can go, from ±1 up to ±16 semitones.',
      A2k:   'Transpose, up to 63 semitones. With a cable in A2, it attenuates that CV.',
      A3k:   'Past halfway, a step is allowed to land on the same note. Below, it always moves. With a cable in A3, it attenuates that CV.',
      A2:    'CV to transpose the walk. It folds back down past the top note.',
      A3:    'Above 2.5V, repeated notes are allowed.',
      CLK:   'Plays the next note. Works alongside the internal speed.',
      D0:    '10ms trigger on every note.',
      D0led: 'Flashes on every note.',
      DAC:   'The notes. Each semitone is 4 DAC steps, about 78mV, so it runs a little flat against 1V/oct.'
    },
    extra: 'With the output expander, its eight outputs carry the note\'s eight bits.'
  },

  'official/AC18_VariationGenerator/': {
    how: 'Ten 16-step gate patterns written into the code, one per output: D0, D1 and the eight DAC bits. The knobs slide the whole grid, one way to swap which pattern goes to which output and the other to shift them in time.',
    notes: {
      A0:    'Shifts which pattern goes to which output, 0 to 7 places. A2 adds to it.',
      A1:    'Shifts all the patterns in time, 0 to 7 steps. A3 adds to it.',
      A2k:   'More pattern shift on top of A0. With a cable in A2, it attenuates that CV.',
      A3k:   'More time shift on top of A1. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the pattern shift.',
      A3:    'CV for the time shift.',
      CLK:   'Moves on a step. There\'s no internal clock.',
      D0:    '25ms triggers from the first pattern. Unshifted, that\'s every step.',
      D0led: 'Flashes with D0.',
      D1:    '25ms triggers from the second pattern. Unshifted, three steps out of four.',
      D1led: 'Flashes with D1.',
      DAC:   'The other eight patterns at once, one per bit, so the voltage jumps about. It\'s meant for the expander.'
    },
    extra: 'With the output expander, each of the eight jacks gets its own pattern.'
  },

  'official/AC20_DepthRandom/': {
    how: 'A new random value on every clock, with a knob to throw away the fine detail. Turned down you get smooth random CV. Turned up you get only a few big steps, and on the expander only the top bits flicker.',
    notes: {
      A0:    'Depth. Fully left gives all 256 levels. Turning up drops the lower bits until fully right there are just two: 0V or 2.5V.',
      CLK:   'Picks a new random value.',
      D0:    'Flips on every clock, so it\'s the clock divided by two.',
      D0led: 'Toggles with each clock.',
      D1:    'The opposite of D0.',
      D1led: 'Toggles opposite D0.',
      DAC:   'The random value.'
    },
    extra: 'With the output expander, its eight outputs are random gates. The more depth you take away, the fewer of them move.'
  },

  'official/AC21_ShiftRegister/': {
    how: 'A short analog shift register. Every clock records A2 and plays back what went in a few clocks ago, so a melody comes back as a delayed copy, and A1 can shift it up or down.',
    notes: {
      A0:    'How far back to read, from 1 clock ago fully left to 8 clocks ago fully right.',
      A1:    'Transpose, from -12 to +12 steps of about 78mV. If it goes below 0V the value wraps round to the top.',
      A2k:   'With nothing in A2, sets the value to record. With a cable in, it attenuates the input.',
      A2:    'The CV to record.',
      CLK:   'Records a step and plays one back.',
      D0:    '25ms trigger on each step it plays. It stays quiet for the first few clocks until the register has filled.',
      D0led: 'Flashes on each step.',
      DAC:   'The delayed value plus the transpose.'
    },
    extra: 'With the output expander, its eight outputs carry the DAC\'s eight bits.'
  },

  'community/user_submitted/AC35_SquidAxon/': {
    how: 'A port of Nonlinear Circuits\' SquidAxon: four stages of CV passed along on the clock, with the last stage fed back into the first through a diode-shaped curve. That bent feedback is what stops it settling into a loop.',
    notes: {
      A0:    'Nonlinear feedback, the diode path from stage 4, from none to 4×. At zero there\'s no chaos; turn it up and it starts to wander.',
      A1:    'Straight feedback from stage 4, from none to 100%. Gives longer, more related runs.',
      A2k:   'An offset into stage 1: noon is zero. With a cable in A2, it attenuates that CV.',
      A3k:   'A second offset into stage 1, added to A2. With a cable in A3, it attenuates that CV.',
      A2:    'Signal into stage 1, centred on 2.5V.',
      A3:    'Second signal into stage 1, added to A2.',
      CLK:   'Moves the register on. A new value enters stage 1 only on every fourth clock, and takes three more to reach stage 4.',
      D0:    'Gate, high while stage 1 is above the middle.',
      D0led: 'On while stage 1 is above the middle.',
      D1:    'Gate, high while stage 4 is above the middle.',
      D1led: 'On while stage 4 is above the middle.',
      DAC:   'Stage 1, centred on 2.5V. It changes on every fourth clock.'
    },
    extra: 'At A0 zero it\'s a plain shift register. The diode only bites once stage 4 times the A0 gain gets past about two thirds of full scale, so the chaos comes in as you turn A0 up.'
  },

  'community/user_submitted/AC36_Genie/': {
    how: 'A port of Nonlinear Circuits\' Genie: three neuron circuits in a ring, each feeding the next. When it runs it gives buzzy, unstable tones at audio rate.',
    notes: {
      A0:    'Sense, the bias on all three neurons.',
      A1:    'Response, how hard each neuron snaps when it switches.',
      A2k:   'Away from noon, overrides the ring with a fixed input. With a cable in A2, it attenuates that signal.',
      A3k:   'Feedback strength around the ring. At zero the ring is broken. With a cable in A3, it attenuates that CV.',
      A2:    'Outside signal into the first neuron, centred on 2.5V. Anything more than about 0.16V off centre replaces the ring feedback.',
      A3:    'CV for the feedback strength.',
      CLK:   'Restarts the ring: resets the neurons and gives the first one a full-scale kick.',
      D0:    'Gate, high while the output is positive.',
      D0led: 'On while D0 is high.',
      D1:    'Gate, high while the output is negative.',
      D1led: 'On while D1 is high.',
      DAC:   'The positive half of the output.'
    },
    extra: 'Some settings settle to a steady value after the kick instead of ringing on. If it goes quiet, move A0, A1 or A3, or send a clock to kick it again.'
  },

  'community/user_submitted/AC37_Rungler/': {
    how: 'After the Benjolin\'s rungler: an 8-bit shift register fed by a comparator, with the newest three bits turned into an 8-level stepped CV. Turn A1 right down and it freezes into an 8-step loop.',
    notes: {
      A0:    'Comparator threshold. A2 above this makes the new bit flip from the last one. Below, it repeats it.',
      A1:    'Output level. Right at the bottom it freezes the register into an 8-step loop at full level. Anywhere else it writes new bits and scales the output.',
      A2k:   'With nothing in A2, sets the data level against the threshold. With a cable in, it attenuates the input.',
      A3k:   'Moves the threshold up or down, noon is no change. With a cable in A3, it attenuates that CV.',
      A2:    'Data in, compared against the threshold. Patch an oscillator or noise here.',
      A3:    'CV for the threshold, centred on 2.5V.',
      CLK:   'Shifts the register one step.',
      D0:    'The newest bit: a random-ish gate stream.',
      D0led: 'Follows D0.',
      D1:    'High when the newest bit and the one from seven steps back differ.',
      D1led: 'Follows D1.',
      DAC:   'The newest three bits as one of 8 levels, 0 to about 4.4V.'
    },
    extra: 'With the output expander, three of the eight jacks carry the three bits behind the CV and the other five stay low.'
  },

  'community/asct/ASCTard008_Changnesia/': {
    how: 'By Ascetic. It watches A2 and reacts when it changes: D0 fires, the DAC jumps to the value it just left, and D1 drops. When A2 holds still, D1 comes back up. There\'s no clock.',
    notes: {
      A0:    'How big a change counts, up to about 75mV. Turn it up to ignore wobble, down for more triggers.',
      A2k:   'With nothing in A2, turning it makes changes by hand. With a cable in, it attenuates the input.',
      A3k:   'Trigger length, from 0 to about 1 second. With a cable in A3, it attenuates that CV.',
      A2:    'The CV to watch.',
      A3:    'CV for the trigger length.',
      D0:    'Trigger when A2 changes.',
      D0led: 'Flashes on a change.',
      D1:    'Gate, high while A2 is steady. Drops on a change and comes back after the trigger length.',
      D1led: 'On while A2 is steady.',
      DAC:   'The value A2 had before the last change.'
    }
  },

  'snazzy_fx/LFSR/LFSR/': {
    how: 'Noise from a 16-bit shift register, running flat out on the DAC. There are no controls. It repeats every 65,535 steps.',
    notes: { DAC: 'Noise.' },
    extra: 'Nothing on the panel does anything here. It reads A2 once at start-up and ignores it.'
  },

  'snazzy_fx/LFSR/LFSR2/': {
    how: 'The same 16-bit noise as LFSR, worked out a different way (Galois instead of Fibonacci), so it sounds slightly different. No controls. It repeats every 65,535 steps.',
    notes: { DAC: 'Noise.' },
    extra: 'Nothing on the panel does anything here.'
  },

  'snazzy_fx/LFSR/LFSR32/': {
    how: 'Noise from a 32-bit shift register, running flat out on the DAC. No controls. It\'s long enough that it never audibly repeats.',
    notes: { DAC: 'Noise.' },
    extra: 'Nothing on the panel does anything here. LFSR_SEQUENCER is the same register with A2 and A3 slowing it down.'
  },

  'snazzy_fx/FRAKTAL_SYNTH_PORTS/CELLULAR_AUTOMATA_SYNTH/': {
    how: 'Eric Boger\'s cellular automata synth, ported by Dan Snazelle. A row of cells evolves by a rule, and the result sets the pitch of a square wave. Every so often it runs the automaton again and the pitch jumps.',
    notes: {
      A0:    'How often the pitch jumps: from about once a second fully left to every few milliseconds fully right.',
      A1:    'How many generations to run each time, from 1 to 64.',
      A2k:   'The rule. It cycles through all 256 rules four times across the knob, so small moves change a lot. With a cable in A2, it attenuates that CV.',
      A3k:   'Width of the row of cells. Only the very bottom of the knob opens any cells. Above that the row is empty and the pitch just steps round in a fixed pattern. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the rule.',
      A3:    'CV for the width. Anything above about 0.3V empties the row.',
      DAC:   'A square wave at audio rate, 0 or 5V.'
    }
  },

  'snazzy_fx/FRAKTAL_SYNTH_PORTS/fraktal_synth/': {
    how: 'Eric Boger\'s fractal synth, ported by Dan Snazelle. A counter runs through its values, and the knobs mask and multiply its bits to make patterns. It reads the knobs on every pass, so it only makes about 2,000 samples a second: expect gritty, rhythmic textures more than clean tones.',
    notes: {
      A0:    'Masks the counter\'s top half. In algorithm 1 only a few bits of the knob count, so it jumps about as you turn it. In algorithm 2 it moves in 16 steps.',
      A1:    'Algorithm 1: part of the multiplier. Algorithm 2: masks the counter\'s bottom half.',
      A2k:   'Adds a little to A0\'s mask and sets the output mask. Fully right gives the full 8-bit output. Anywhere else the output is just on or off. With a cable in A2, it attenuates that CV.',
      A3k:   'Algorithm 1 only: the multiplier. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the output mask.',
      A3:    'CV for the multiplier, algorithm 1 only.',
      CLK:   'Picks the algorithm: 1 while CLK is low, 2 while it\'s high. Send it a gate or a square LFO to switch between them.',
      DAC:   'The output, mostly 0 or 5V pulses.'
    }
  },
  'official/AC19_ShapedLFO/': {
    how: 'A free-running LFO with a warp control that leans the triangle over into a ramp one way or the other. D0 and D1 fire at the top and bottom of each cycle.',
    notes: {
      A0:    'Speed, from about 3 seconds per cycle fully left to about 16 cycles a second fully right.',
      A1:    'Warp. Noon is a plain triangle. Fully left it rises fast and falls slowly, a falling ramp. Fully right it rises slowly and drops fast, a rising ramp.',
      D0:    '25ms trigger at the top of each cycle.',
      D0led: 'Flashes at the top of each cycle.',
      D1:    '25ms trigger at the bottom, as each cycle starts.',
      D1led: 'Flashes at the start of each cycle.',
      DAC:   'The LFO, 0 to 5V.'
    },
    extra: 'The header says warp at zero is a normal triangle. In the code the triangle is at noon. With the output expander, its eight outputs carry the LFO\'s eight bits.'
  },

  'community/user_submitted/VC_LFO/': {
    how: 'Karl Gruenewald\'s voltage-controlled take on AC19. Rate and shape move to the CV inputs, A0 sets the overall range, A1 sets the output level, and a gate at CLK freezes the output.',
    notes: {
      A0:    'Range. Fully left makes everything 7 times slower, fully right 10 times faster, so with A2 it covers about 20 seconds per cycle up to low audio rate.',
      A1:    'Output level, from nothing to the full 0 to 5V.',
      A2k:   'Rate with nothing in A2. With a cable in, it attenuates the rate CV.',
      A3k:   'Shape with nothing in A3: noon is a triangle, left a falling ramp, right a rising ramp. With a cable in, it attenuates the shape CV.',
      A2:    'Rate CV. More voltage, faster.',
      A3:    'Shape CV.',
      CLK:   'Hold. While a gate is high the output freezes. The LFO keeps running underneath, so it jumps to catch up when the gate drops.',
      D0:    '60ms trigger at the top of each cycle.',
      D0led: 'Flashes at the top of each cycle.',
      D1:    '60ms trigger at the bottom, as each cycle starts.',
      D1led: 'Flashes at the start of each cycle.',
      DAC:   'The LFO, scaled by A1.'
    },
    extra: 'With the output expander, its eight outputs carry the LFO\'s eight bits.'
  },

  'community/asct/ASCTard005_LFO/': {
    how: 'By Ascetic. An LFO built on Mozzi\'s wavetable oscillator, with sine, cosine and saw shapes and a phase-modulation input. It needs the Mozzi library, which is why it shows amber.',
    notes: {
      A0:    'Range. Divides the speed by 1 to 32, so fully left is fastest and fully right slowest.',
      A1:    'Wave. Roughly the first half is sine, the next third cosine (the same sine shifted a quarter cycle), the top fifth saw.',
      A2k:   'Speed with nothing in A2. With a cable in, it attenuates the speed CV.',
      A3k:   'Phase modulation amount with nothing in A3. With a cable in, it attenuates that CV.',
      A2:    'Speed CV.',
      A3:    'Phase modulation. It only acts while the voltage is changing: a steady voltage does nothing, a moving one warps the wave.',
      CLK:   'Resets the wave to the start of its cycle.',
      DAC:   'The wave, 0 to 5V.'
    },
    extra: 'The header lists speed on A3 and modulation on A4, but the code uses A2 and A3. It also warns that Mozzi takes over the digital outs. This sketch never starts Mozzi\'s audio output, so D0 and D1 are just unused. The speeds in the code assume Mozzi\'s audio rate, but the sketch steps the wave once per pass through loop(), so it runs slower than those numbers suggest.'
  },

  'snazzy_fx/CV-LFO_SKETCHES/ARD_SINE_LFO/': {
    how: 'By Dan Snazelle. A sine wave worked out point by point with sin(). A2 sets how many points make up one cycle, so more points means a slower wave.',
    notes: {
      A2k:   'Speed, backwards: turning it up slows it down. Near the bottom it buzzes at audio rate, fully right it\'s about two cycles a second. Fully left it stops. With a cable in A2, it attenuates that CV.',
      A2:    'Speed CV. More voltage, slower. It\'s read once per cycle, so changes land at the start of the next one.',
      D0:    'Sits at 5V the whole time.',
      D0led: 'Always on.',
      DAC:   'The sine, 0 to 5V.'
    }
  },

  'snazzy_fx/CV-LFO_SKETCHES/ARD_SINE_LFO_smoother_rng/': {
    how: 'By Dan Snazelle. The same sine as ARD_SINE_LFO with the range turned round and stretched: the slow end uses up to 31,111 points per cycle, so it\'s much smoother when slow.',
    notes: {
      A2k:   'Speed. Fully left is about 4 seconds per cycle, fully right is up at a few hundred cycles a second. With a cable in A2, it attenuates that CV.',
      A2:    'Speed CV. More voltage, faster. It\'s read once per cycle, so at slow speeds changes take a while to land.',
      D0:    'Sits at 5V the whole time.',
      D0led: 'Always on.',
      DAC:   'The sine, 0 to 5V.'
    }
  },

  'snazzy_fx/fac_triple_lfo/': {
    how: 'By Alfonso Alba (fac), who also wrote the fast DAC routine most ArdCore sketches use. Three LFOs at once, each with its own speed: a triangle on the DAC, a second triangle as PWM on D0, and a square on D1. A clock resets all three.',
    notes: {
      A0:    'Speed of LFO 1 (DAC), from one cycle every 100 seconds to about 10 a second.',
      A1:    'Speed of LFO 2 (D0), same range.',
      A2k:   'Speed of LFO 3 (D1), same range. With a cable in A2, it attenuates that CV.',
      A2:    'Speed CV for LFO 3.',
      A3:    'Does nothing as shipped. Switch it on in the customization section at the top of the code to bend any LFO\'s shape or speed, centred on 2.5V.',
      CLK:   'Resets all three LFOs to the start of their cycle.',
      D0:    'LFO 2 as fast PWM. Run it through a slew limiter or filter to get a smooth triangle.',
      D0led: 'Glows brighter and dimmer with LFO 2.',
      D1:    'LFO 3, a square wave.',
      D1led: 'Blinks with LFO 3.',
      DAC:   'LFO 1, a triangle, 0 to 5V.'
    },
    extra: 'Originally a .pde file. It was renamed to .ino in 2026 so the compile check picks it up; the code is unchanged.'
  },
  'official/AC24_SimpleVCO/': {
    how: 'Darwin\'s early attempt at a VCO: a square wave made by flipping the DAC between 0 and 5V from inside loop(). He calls it "not-so-great" in the header, and it is rough, but it works.',
    notes: {
      A0:    'Pitch offset, in semitone steps across about ten octaves.',
      A2k:   'More pitch on top of A0. With a cable in A2, it attenuates that CV.',
      A2:    'Pitch CV. Despite the header this isn\'t 1V/oct: it\'s about 25 semitones per volt.',
      DAC:   'A square wave, 0 or 5V. It plays an octave below the note in the table, because the table holds full periods and the code flips the output once per period instead of twice.'
    },
    extra: 'If A0 and A2 add up to more than the top of the note table, it reads past the end and the pitch goes wild. With the output expander, all eight jacks carry the same square wave.'
  },

  'community/user_submitted/AC33_SSQScreecherWT/': {
    how: 'A port of yorkmodular\'s tinydvco: a wavetable VCO running on a 66.7kHz timer interrupt, with 1V/oct pitch, seven waveforms and hard sync.',
    notes: {
      A0:    'Waveform, seven zones: Sundial 9, SSQ 1, SSQ 2, SSQ 3, Sundial 2, saw, square.',
      A1:    'Fine tune, noon is centre. It adds a fixed amount rather than a ratio, so at the bottom of the range it swings from silence to an octave up, and at the top it\'s about half a semitone either way.',
      A2k:   'Pitch with nothing in A2. With a cable in, it attenuates the pitch CV, which throws off 1V/oct tracking.',
      A3k:   'Phase offset into the wavetable. With a cable in A3, it attenuates that CV.',
      A2:    'Pitch, 1V/oct: about 31Hz at 0V up to about 1kHz at 5V.',
      A3:    'Phase modulation for the five wavetables. A steady voltage just shifts the start point, which you won\'t hear; you need a moving signal. It\'s read about 2,000 times a second, so it can\'t follow audio-rate FM.',
      CLK:   'Hard sync: restarts the wave on a rising edge.',
      D0:    '10ms trigger at the start of each cycle. Above about 100Hz the triggers overlap and D0 just stays high.',
      D0led: 'Flashes each cycle, or stays lit at audio rate.',
      DAC:   'Audio out.'
    },
    extra: 'With the output expander, its eight outputs carry the waveform\'s eight bits.'
  },

  'community/user_submitted/AC38_AlgoVCO/': {
    how: 'Built on the same engine as AC33, but every waveform is worked out on the fly instead of read from a table, so there are 16 of them and no wavetable memory. Three respond to A3.',
    notes: {
      A0:    'Waveform, 16 zones: saw, ramp, square, pulse, triangle, sine (approx), double saw (octave up), triple saw (octave and a fifth), 8-step staircase, variable staircase, 4-bit saw, three XOR shapes (buzzy, rich, metallic), wavefolded triangle, needle.',
      A1:    'Fine tune, noon is centre. It adds a fixed amount, so it\'s coarse at the bottom of the range (silence to an octave up) and about half a semitone at the top.',
      A2k:   'Pitch with nothing in A2. With a cable in, it attenuates the pitch CV, which throws off 1V/oct tracking.',
      A3k:   'The modifier with nothing in A3. With a cable in, it attenuates that CV.',
      A2:    'Pitch, 1V/oct: about 31Hz at 0V up to about 1kHz at 5V.',
      A3:    'Modifier. Pulse: width. Variable staircase: 128, 64, 32 or 16 steps. Wavefold: how many folds. The other 13 waves ignore it.',
      CLK:   'Hard sync: restarts the wave on a rising edge.',
      D0:    '10ms trigger at the start of each cycle. Above about 100Hz the triggers overlap and D0 just stays high.',
      D0led: 'Flashes each cycle, or stays lit at audio rate.',
      DAC:   'Audio out.'
    },
    extra: 'The header says the variable staircase goes down to 2 steps. The code stops at 16. With the output expander, its eight outputs carry the waveform\'s eight bits.'
  },

  'snazzy_fx/ARDCORE_auduino_v5/': {
    how: 'Peter Knight\'s Auduino granular synth, lightly adapted by Dan Snazelle. Two decaying triangle grains restart together at a pitched rate, which gives the buzzy, vocal Auduino sound. The pitch steps through a pentatonic scale.',
    notes: {
      A0:    'Decay of grain 1. Turn up for shorter, clickier grains.',
      A1:    'Decay of grain 2.',
      A2k:   'Pitch (how often the grains restart), backwards: turning it up lowers the note. Fully up it goes silent. With a cable in A2, it attenuates that CV.',
      A3k:   'Pitch of grain 1, which acts like a formant. With a cable in A3, it attenuates that CV.',
      A2:    'Pitch CV, pentatonic, backwards: more voltage, lower note.',
      A3:    'CV for grain 1\'s pitch.',
      DAC:   'Audio out, at a 31.25kHz sample rate.'
    },
    extra: 'The header lists different knob jobs; this follows the code. Grain 2\'s pitch is fixed in the code rather than on a control. The three variants in the subfolders are written up separately.'
  },

  'snazzy_fx/ARDCORE_auduino_v5/ARDCORE_AUDUINO_MODS/ARDCORE_AUDUINO_MOD1/': {
    how: 'A bigger Auduino mod based on Lewis Sykes\' version, with six scale modes, a light sensor and status LEDs. Most of that hardware isn\'t on an ArdCore, so it doesn\'t sit well on the module.',
    notes: {
      A0:    'Decay of grain 2.',
      A1:    'Pitch of grain 2.',
      A2k:   'Decay of grain 1. With a cable in A2, it attenuates that CV.',
      A3k:   'Pitch of grain 1. With a cable in A3, it attenuates that CV.',
      A2:    'CV for grain 1\'s decay.',
      A3:    'CV for grain 1\'s pitch.',
      CLK:   'Each edge switches the note source between A4 and A5, the light-sensor input in the original.',
      D0:    'The audio, as fast PWM. Filter it to use it.',
      DAC:   'Not the audio. Three of its pins are driven by the mode and status LEDs, so it shows blinking junk.'
    },
    extra: 'The note itself comes from A4 or A5, which are only on the input expander. It also expects a mode button on pin 6, which on the ArdCore is one of the DAC pins, and it spends the first 5 seconds calibrating a light sensor that isn\'t there.'
  },

  'snazzy_fx/ARDCORE_auduino_v5/Auduino_SYNTH_ARDCORE_MODS/ARDCORE_auduino_v5a/': {
    how: 'Auduino v5 with grain 2\'s pitch put on A1 and the clipping changed: loud peaks fold back down instead of flattening, which adds grit.',
    notes: {
      A0:    'Decay of grain 1.',
      A1:    'Pitch of grain 2.',
      A2k:   'Pitch, pentatonic and backwards: turning it up lowers the note, fully up is silent. With a cable in A2, it attenuates that CV.',
      A3k:   'Pitch of grain 1. With a cable in A3, it attenuates that CV.',
      A2:    'Pitch CV, backwards.',
      A3:    'CV for grain 1\'s pitch.',
      DAC:   'Audio out.'
    },
    extra: 'Grain 2\'s decay is read from pin ~(3), which works out to an input that isn\'t connected on the ArdCore, so that decay drifts on its own.'
  },

  'snazzy_fx/ARDCORE_auduino_v5/Auduino_SYNTH_ARDCORE_MODS/ARDCORE_auduino_v5ab/': {
    how: 'The roughest of the Auduino ports. Pitch is smooth instead of stepped, and the grain decay was changed to use the grain\'s phase instead of its level, so grains wrap round instead of fading. Expect harsh, glitchy tones.',
    notes: {
      A0:    'Decay of grain 1, though with the changed formula it\'s more of a texture control.',
      A1:    'Pitch of grain 2.',
      A2k:   'Pitch, smooth and backwards: turning it up lowers the note. With a cable in A2, it attenuates that CV.',
      A3k:   'Pitch of grain 1. With a cable in A3, it attenuates that CV.',
      A2:    'Pitch CV, backwards.',
      A3:    'CV for grain 1\'s pitch.',
      DAC:   'Audio out.'
    },
    extra: 'Its timer setup has no top value, so the audio interrupt runs as fast as the chip allows instead of at 31.25kHz, and one DAC pin (pin 11) is handed to the timer. Grain 2\'s decay reads an unconnected input, as in v5a.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/ARDCORE_TRIANGLE/': {
    how: 'By Dan Snazelle. A triangle wave drawn step by step on the DAC with a delay between steps. The header says "FILTER IT!!!": the steps are audible.',
    notes: {
      A2k:   'Pitch, from about 26Hz fully left to about 400Hz fully right. With a cable in A2, it attenuates that CV.',
      A2:    'Pitch CV. Not 1V/oct: more voltage just means higher.',
      D0:    'A faint 62.5kHz pulse left over from a timer setup the sketch doesn\'t use.',
      DAC:   'The triangle, 0 to 5V.'
    }
  },

  'snazzy_fx/dans_trashy_mods/SIMPLEST_SAWTOOTH/': {
    how: 'By Dan Snazelle. About as simple as it gets: count up and write to the DAC, forever. No controls.',
    notes: {
      DAC:   'A rising sawtooth from 0 to about 2V, at a fixed pitch in the low kilohertz: however fast the loop runs.'
    },
    extra: 'A line to control the speed from A2 is there but commented out.'
  },

  'snazzy_fx/dans_trashy_mods/SIMPLEST_SAWTOOTH_mod/': {
    how: 'By Dan Snazelle. The sawtooth counter pushed through an XOR and a multiply, then wrapped to 8 bits. A2 changes the tone, not the pitch: a low buzz whose harmonics shift as you turn it.',
    notes: {
      A2k:   'Timbre. Fully left is silence. Turning up changes the multiplier, which folds the wave into different shapes. With a cable in A2, it attenuates that CV.',
      A2:    'CV for the timbre.',
      DAC:   'A buzzing wave at about 30Hz.'
    },
    extra: 'noiseBrother is the same file under another name.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/noiseBrother/': {
    how: 'Identical to SIMPLEST_SAWTOOTH_mod, byte for byte. A low buzz whose tone changes with A2.',
    notes: {
      A2k:   'Timbre. Fully left is silence. With a cable in A2, it attenuates that CV.',
      A2:    'CV for the timbre.',
      DAC:   'A buzzing wave at about 30Hz.'
    }
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/sine/': {
    how: 'Meant to step through an 8-point sine table on each clock. Two things get in the way. The table position moves on every pass through loop(), not every clock, so each clock lands on an effectively random point. And the table values run -1000 to 1000, which the DAC can\'t take, so only their low bits come out.',
    notes: {
      CLK:   'Each trigger puts out one of the 8 levels, more or less at random.',
      DAC:   'One of 0, 0.5, 1.2, 3.8 or 4.5V, held until the next clock. In practice a clocked random voltage.'
    }
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/FREQUOT/frequot2/': {
    how: 'Paul Badger\'s freqout tone routine, adapted by Dan Snazelle. It plays itself: a fixed scale of notes over and over, shifting up by about two semitones each time round, 12 times, then starting again.',
    notes: {
      A0:    'Stretches each note. Fully left, notes are a single click.',
      A2k:   'Base note length, up to about a quarter of a second. With a cable in A2, it attenuates that CV.',
      A3k:   'Gap between notes, up to about a quarter of a second. With a cable in A3, it attenuates that CV.',
      A2:    'CV for note length.',
      A3:    'CV for the gap.',
      DAC:   'Square-wave notes. They come out higher than the note names in the code, since the timing was changed from the original.'
    },
    extra: 'It plays 16 notes per pass but the scale only has 14, so the last two read past the end of the list and come out as clicks or gaps. It also prints every note over serial, which slows it a little.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/FREQUOT/freqout_ardcore.ino': {
    how: 'Another version of frequot2 with a four-step wave (5V, 3V, 0V, 1.5V) instead of a square, and a different scale. Same self-playing, rising pattern.',
    notes: {
      A2k:   'Note length. With a cable in A2, it attenuates that CV.',
      A3k:   'Gap between notes. With a cable in A3, it attenuates that CV.',
      A2:    'CV for note length.',
      A3:    'CV for the gap.',
      DAC:   'The four-step wave.'
    },
    extra: 'It sits loose in the FREQUOT folder instead of in its own folder, so the Arduino tools won\'t open it as a sketch; that\'s why it shows amber. Its 12-note scale is read 16 times per pass, so four notes come from past the end of the list and play as clicks or gaps.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/FREQUOT/frequot/': {
    how: 'Paul Badger\'s original freqout demo, unchanged. It isn\'t adapted for the ArdCore: it plays on pin 2, which is the ArdCore\'s clock input, so nothing comes out of the panel.',
    notes: {},
    extra: 'Kept as the starting point for frequot2 and freqout_ardcore. As a .pde it isn\'t compiled, and it also refers to a note A3 that\'s never defined.'
  },

  'snazzy_fx/dans_trashy_mods/AC_Sinetests_pde/': {
    how: 'Meant to be Martin Nawrath\'s DDS sine generator: a 31kHz timer, a sine table, and A2 setting the frequency once a second. The file is broken: two copies of a different sketch, a serial audio player, got pasted into the middle of line 67. It can\'t compile as it stands.',
    notes: {},
    extra: 'Even with the paste removed it writes to pin 11 as PWM, the way Nawrath\'s original drives a speaker, rather than using the DAC.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/chiptune.pde': {
    how: 'A four-voice chiptune player that plays one song stored in the file, once, and stops. The file doesn\'t say who wrote it.',
    notes: {
      D0:    'The music, as fast PWM. Filter it.'
    },
    extra: 'It replaces the Arduino main() with its own and sets pins without regard to the ArdCore: A1 (the knob) and pin 2 (the clock input) both become outputs. Don\'t run it on the module as it is. As a .pde it isn\'t compiled.'
  },

  'snazzy_fx/fac_fm_osc/': {
    how: 'By Alfonso Alba (fac). Two sine oscillators in FM: one modulates the pitch of the other, from gentle vibrato to clangy bells. Pitch tracks 1V/oct.',
    notes: {
      A0:    'Base pitch, from 55Hz to 220Hz.',
      A1:    'Modulator ratio. Noon is 1:1; fully left 1/8, fully right 8×.',
      A2k:   'Pitch with nothing in A2. With a cable in, it attenuates the pitch CV, which throws off 1V/oct tracking.',
      A3k:   'FM depth with nothing in A3. With a cable in, it attenuates that CV.',
      A2:    'Pitch, 1V/oct, five octaves on top of A0.',
      A3:    'FM depth. More voltage, brighter and more metallic.',
      CLK:   'Hard sync: restarts the carrier.',
      DAC:   'Audio out, at about 15.6kHz sample rate.'
    },
    extra: 'It shows amber because its tables use an old type, prog_uint32_t, that current Arduino tools no longer have. It also hands pin 11 to a timer, and pin 11 is one of the DAC bits, so that bit is lost and the wave is a bit distorted. Both are fixed in fac_fm_osc_fixed; this one is kept as it was.'
  },

  'snazzy_fx/FRAKTAL_SYNTH_PORTS/ARDCORE_twotone_mod/': {
    how: 'Dan Snazelle\'s port of yerpa58\'s Two Tone Drone: two wavetable oscillators slowly crossfading, with chorus and a touch of ring mod. It doesn\'t fit: its wavetables sit in RAM instead of flash and add up to more than the chip\'s 2KB, so it won\'t build.',
    notes: {
      A0:    'Crossfade speed between the two oscillators.',
      A1:    'Pitch of oscillator 1, picked up each time the crossfade reaches it.',
      A2k:   'Pitch of oscillator 2. With a cable in A2, it attenuates that CV.',
      A3k:   'Chorus length and speed. With a cable in A3, it attenuates that CV.',
      A2:    'CV for oscillator 2\'s pitch.',
      A3:    'CV for the chorus.',
      DAC:   'The drone.'
    },
    extra: 'It also only ever played a quarter of each wavetable, and its crossfade took the wrong byte of each multiply. ARDCORE_twotone_mod_fixed sorts all of that out; this one is kept as it was.'
  },

  'snazzy_fx/CV-LFO_SKETCHES/LFO_w_slow_CPU/': {
    how: 'By Dan Snazelle. Despite the name it\'s an oscillator, not an LFO: a rising ramp at audio rate. The header calls it a triangle, but the code counts up and snaps back to zero, so it\'s a sawtooth.',
    notes: {
      A2k:   'Pitch, from roughly 65Hz fully left to around 800Hz fully right. With a cable in A2, it attenuates that CV.',
      A2:    'Pitch CV. Not 1V/oct: more voltage just means higher.',
      DAC:   'A rising sawtooth from 0 to about 2V.'
    },
    extra: 'The "slow CPU" lines in setup set the clock divider to 1, which is the normal speed, so they don\'t slow anything down.'
  },
  'snazzy_fx/fac_fm_osc_fixed/': {
    how: 'A fixed copy of Alfonso Alba\'s fac_fm_osc, made in 2026. Same FM voice: two sine oscillators, one modulating the other\'s pitch, from gentle vibrato to clangy bells, tracking 1V/oct. The original sits next to it unchanged.',
    notes: {
      A0:    'Base pitch, from 55Hz to 220Hz.',
      A1:    'Modulator ratio. Noon is 1:1; fully left 1/8, fully right 8×.',
      A2k:   'Pitch with nothing in A2. With a cable in, it attenuates the pitch CV, which throws off 1V/oct tracking.',
      A3k:   'FM depth with nothing in A3. With a cable in, it attenuates that CV.',
      A2:    'Pitch, 1V/oct, five octaves on top of A0.',
      A3:    'FM depth. More voltage, brighter and more metallic.',
      CLK:   'Hard sync: restarts the carrier.',
      DAC:   'Audio out, at about 15.6kHz sample rate.'
    },
    extra: 'What was fixed. The tables now use const uint32_t PROGMEM instead of the long-gone prog_uint32_t, so it compiles. The timer no longer takes over pin 11, so all eight DAC bits carry the wave. The pitch and depth values are handed to the audio interrupt with interrupts briefly off, so it can\'t read a half-updated value and click. And it\'s a .ino, so the compile check builds it. The comment block at the top of the file explains each change.'
  },

  'snazzy_fx/FRAKTAL_SYNTH_PORTS/ARDCORE_twotone_mod_fixed/': {
    how: 'A fixed copy of Dan Snazelle\'s port of yerpa58\'s Two Tone Drone, made in 2026. Two wavetable oscillators slowly crossfade into each other, with chorus and a little ring mod on top. Each oscillator picks up a new pitch from its knob when the crossfade reaches it, so you can change notes without jumps. The original sits next to it unchanged.',
    notes: {
      A0:    'Crossfade speed. Turn up for slower.',
      A1:    'Pitch of oscillator 1, from nothing up to a few kHz. Picked up each time the crossfade swings fully to it.',
      A2k:   'Pitch of oscillator 2, picked up at the other end of the crossfade. With a cable in A2, it attenuates that CV.',
      A3k:   'Chorus: sets both the delay length and how fast the chorus depth moves. With a cable in A3, it attenuates that CV.',
      A2:    'CV for oscillator 2\'s pitch.',
      A3:    'CV for the chorus.',
      DAC:   'The drone.'
    },
    extra: 'What was fixed. The two 1KB wavetables moved to flash, so it fits in RAM (it now uses about a quarter). The table index was a byte, so only a quarter of each wave ever played; it\'s now 16-bit. The crossfade and chorus took the low byte of each multiply where yerpa58\'s original takes the high byte; now they take the high byte. The ring-mod product no longer overflows. The ring-mod speed still comes from A4, which is only on the input expander. The comment block at the top of the file explains each change.'
  },
  'official/AC05_ClockDivide/': {
    how: 'Two clock dividers from one clock input, each with its own division, plus a CV to push both further and a reset.',
    notes: {
      A0:    'Division for D0, from 1 to 16. The header says 32; the code stops at 16.',
      A1:    'Division for D1, from 1 to 16.',
      A2k:   'Adds 0 to 15 to both divisions. With a cable in A2, it attenuates that CV.',
      A3k:   'Reset with nothing in A3: past halfway it holds both counters at the start. With a cable in, it attenuates that gate.',
      A2:    'CV that adds to both divisions.',
      A3:    'Reset. Above 2.5V both dividers are held at the start, and they fire on the first clock after it drops.',
      CLK:   'The clock to divide.',
      D0:    '10ms trigger every A0 clocks.',
      D0led: 'Flashes with D0.',
      D1:    '10ms trigger every A1 clocks.',
      D1led: 'Flashes with D1.'
    },
    extra: 'It prints all four inputs over serial on every pass, which slows the loop to about 50 passes a second. Clocks faster than that get merged, so it can drop beats above about 50Hz.'
  },

  'official/AC12_Comparator/': {
    how: 'A comparator: set a level with A0, and D0 fires when A2 rises through it, D1 when it falls back through.',
    notes: {
      A0:    'The threshold, 0 to 5V.',
      A2k:   'With nothing in A2, turning it crosses the threshold by hand. With a cable in, it attenuates the input.',
      A2:    'The signal to compare.',
      D0:    '25ms trigger when A2 goes above the threshold.',
      D0led: 'Flashes on the way up.',
      D1:    '25ms trigger when A2 goes below the threshold.',
      D1led: 'Flashes on the way down.'
    },
    extra: 'There\'s no hysteresis, so a noisy or slow signal sitting right on the threshold can fire a burst of triggers.'
  },

  'official/AC13_SlopeDetector/': {
    how: 'Watches A2 and fires when it changes direction: D0 when it starts rising, D1 when it starts falling. Good for pulling triggers out of an LFO\'s peaks and troughs.',
    notes: {
      A2k:   'With nothing in A2, turning it back and forth fires the outputs by hand. With a cable in, it attenuates the input.',
      A2:    'The signal to watch. Changes under about 40mV are ignored.',
      D0:    'Trigger when A2 turns upward.',
      D0led: 'Flashes when A2 turns upward.',
      D1:    'Trigger when A2 turns downward.',
      D1led: 'Flashes when A2 turns downward.'
    },
    extra: 'The trigger-off check subtracts the times the wrong way round, so triggers switch off on the next pass. They end up about 10ms long only because the serial printing slows every pass to roughly that. The printing also limits it to about 100 checks a second.'
  },

  'official/AC16_TrigMultiplier/': {
    how: 'Clock multiplier. It times the incoming clock (averaged over the last six) and fires extra triggers in between, a different number on each output. A2 and A3 can mute the in-between ones for ratchet effects.',
    notes: {
      A0:    'Multiplier for D0, from 1 to 16.',
      A1:    'Multiplier for D1, from 1 to 16.',
      A2k:   'With nothing in A2, past halfway mutes D0\'s in-between triggers. With a cable in, it attenuates that gate.',
      A3k:   'Same for D1.',
      A2:    'Above 2.5V, D0 only fires on the clock itself.',
      A3:    'Above 2.5V, D1 only fires on the clock itself.',
      CLK:   'The clock. It needs six clocks before it starts, to measure the tempo.',
      D0:    '25ms triggers, A0 per clock.',
      D0led: 'Flashes with D0.',
      D1:    '25ms triggers, A1 per clock.',
      D1led: 'Flashes with D1.'
    },
    extra: 'At high multiples of a fast clock the gaps get shorter than the 25ms triggers and they merge into one.'
  },

  'official/AC17_LogicModule/': {
    how: 'Two-input logic. A2 and A3 count as on above about 1V. D0 is AND, D1 is OR and the DAC is XOR.',
    notes: {
      A2k:   'Input 1 by hand with nothing in A2. With a cable in, it attenuates that signal.',
      A3k:   'Input 2 by hand with nothing in A3. With a cable in, it attenuates that signal.',
      A2:    'Logic input 1. On above about 1V.',
      A3:    'Logic input 2. On above about 1V.',
      D0:    'AND: high while both inputs are on.',
      D0led: 'On with AND.',
      D1:    'OR: high while either input is on.',
      D1led: 'On with OR.',
      DAC:   'XOR: 5V while exactly one input is on.'
    },
    extra: 'With the output expander, all eight jacks carry XOR.'
  },

  'official/OX01_MasterClock/': {
    how: 'A master clock for the output expander. Each step fires D0 and sends eight gate patterns to the expander: halves, the off-beat half, quarters, and so on down to sixteenths. A3 is run/stop, and it has to be high for anything to happen.',
    notes: {
      A0:    'Tempo, from about 1.25s per step up to one every 30ms. Fully left it follows CLK instead.',
      A1:    'Gate length for D0 and the expander, from 5ms to about a quarter of a second.',
      A3k:   'Run/stop with nothing in A3: past halfway runs, below stops. With a cable in, it attenuates that gate.',
      A3:    'Run/stop. Above 2.5V it runs. Starting it resets the patterns to the top.',
      CLK:   'Steps the clock when A0 is fully left. Otherwise ignored.',
      D0:    'A trigger on every step.',
      D0led: 'Flashes on every step.',
      D1:    'A 5ms pulse when it starts running, to reset other modules.',
      D1led: 'Blinks when it starts.',
      DAC:   'All eight patterns at once, one per bit: a lumpy stepped CV. Meant for the expander.'
    },
    extra: 'The header lists A2 as a division offset and A3 as a reset; in the code A2 does nothing and A3 is run/stop. On the expander the eight jacks get: every 2nd step, the other every 2nd, every 4th, every 4th shifted by two, every 8th, every 8th shifted by four, every 16th, every 16th shifted by eight.'
  },

  'official/OX04_8WayDivider/': {
    how: 'Meant to be an 8-way clock divider for the output expander, dividing by 1 to 8. It was never finished: it\'s a copy of OX01 with the pattern table swapped for a list of 1 to 8, but the code still reads that list as a table, so it doesn\'t compile.',
    notes: {},
    extra: 'The controls it describes (A0 tempo, A1 gate length, A2 reset, A3 run/stop) come from OX01. The divider code itself was never written. OX04_8WayDivider_fixed finishes it.'
  },

  'community/asct/ASCTard004_Gate_Counter/': {
    how: 'By Ascetic. Two channels, each either a counter (fire every N clocks) or a toggle (flip on and off every N clocks), with N set by A2 and A3. As written the counting doesn\'t work, see below.',
    notes: {
      A0:    'Mode for channel 1: left half counts, right half toggles.',
      A1:    'Mode for channel 2: same.',
      A2k:   'Count for channel 1 with nothing in A2. With a cable in, it attenuates that CV.',
      A3k:   'Count for channel 2 with nothing in A3. With a cable in, it attenuates that CV.',
      A2:    'How many clocks to count for channel 1, 0 to 63.',
      A3:    'How many clocks to count for channel 2, 0 to 63.',
      CLK:   'The clock to count.',
      D0:    'Channel 1: a 25ms trigger in count mode, a gate in toggle mode.',
      D0led: 'Follows D0.',
      D1:    'Channel 2, the same.',
      D1led: 'Follows D1.'
    },
    extra: 'The counter is advanced with "count = count++;", which in C++ leaves count where it was. The compiler turns the whole step into nothing, so the count never goes up. The result: with A2 or A3 right at zero the channel fires (or toggles) on every clock, and anywhere above zero it never fires at all. ASCTard004_Gate_Counter_fixed has the one-word fix.'
  },

  'community/asct/ASCTard006_Burst_gen_ino/': {
    how: 'By Ascetic. Push A3 high to arm a burst, and the next clocks each fire a trigger until the burst count runs out. Feed CLK from something irregular for stuttery bursts.',
    notes: {
      A2k:   'Burst length with nothing in A2. With a cable in, it attenuates that CV.',
      A3k:   'With nothing in A3, turning past halfway arms a burst. With a cable in, it attenuates that gate.',
      A2:    'Burst length, 1 to 32 triggers.',
      A3:    'Arms a burst when it goes above 2.5V.',
      CLK:   'Sets the timing of the burst: one trigger per clock while armed. Ignored otherwise.',
      D0:    '2ms trigger for each clock in the burst.',
      D0led: 'Flickers during a burst.',
      D1:    'The same as D0.',
      D1led: 'Flickers during a burst.'
    },
    extra: 'The header numbers the inputs from 1, so it says A3 and A4 where the code uses A2 and A3. The clock after the last trigger is used up ending the burst.'
  },

  'community/asct/ASCTard010_Tapped_Out/': {
    how: 'By Ascetic. A ten-channel pattern sequencer: D0, D1 and the eight expander outputs each play one of 256 stored 32-step rhythms at their own speed, with shuffle, eight saved presets and clock sync. Knobs A2 and A3 do different jobs depending on the layer picked with A1. It comes with a manual and a pattern-file app for Mac and Windows.',
    notes: {
      A0:    'Which of the 10 outputs the other knobs are editing.',
      A1:    'Layer, 1 to 4: pattern and speed, shuffle, presets, or global tempo and clock mode.',
      A2k:   'Layer 1: pattern (of 256). Layer 2: shuffle frequency. Layer 3: preset number. Layer 4: master tempo.',
      A3k:   'Layer 1: pattern speed. Layer 2: shuffle amount. Layer 3: load (first third) or save (last third). Layer 4: CLK mode, reset below noon or sync above.',
      CLK:   'Reset or sync, depending on the layer 4 setting.',
      D0:    'Pattern output 1.',
      D0led: 'Follows output 1.',
      D1:    'Pattern output 2.',
      D1led: 'Follows output 2.',
      DAC:   'Outputs 3 to 10, one per bit. On the expander each gets a jack; on its own the DAC is a busy stepped CV.'
    },
    extra: 'Knobs have pickup: after switching channel or layer, a knob does nothing until you sweep it through its stored value. As shipped, user_settings.h has EEPROMreset defined, which wipes the presets at every power-up; the manual says to remove it after the first upload. The 24ppq clock it describes is on pin 13, which the ArdCore doesn\'t bring to a jack.'
  },

  'official/AC02_Quantizer/': {
    how: 'A semitone quantizer. A2 is rounded to the nearest note and sent to the DAC, with triggers and gates whenever the note changes. A3 can hold it so it only moves on the clock, like a quantizing sample and hold.',
    notes: {
      A0:    'Transpose, 0 to 11 semitones up.',
      A1:    'Length of the D1 gate, up to about a second.',
      A2k:   'With nothing in A2, pick notes by hand. With a cable in, it attenuates the input.',
      A3k:   'Past halfway, holds the output until the next clock. With a cable in A3, it attenuates that gate.',
      A2:    'The voltage to quantize, 0 to 5V: five octaves.',
      A3:    'Above 2.5V the output only updates on CLK.',
      CLK:   'Forces a new reading, even while held.',
      D0:    '10ms trigger when the note changes.',
      D0led: 'Flashes when the note changes.',
      D1:    'Gate when the note changes, as long as A1 sets.',
      D1led: 'On during the gate.',
      DAC:   'The quantized note. Each semitone is 4 DAC steps, about 78mV, so it runs a little flat against 1V/oct.'
    },
    extra: 'Near the top with a big transpose the note goes past what the DAC can hold and wraps round to the bottom. With the output expander, its eight outputs carry the note\'s eight bits.'
  },

  'official/AC06_TrigToGate/': {
    how: 'Turns a trigger into two gates of different lengths.',
    notes: {
      A0:    'Length of the D0 gate, from 20ms to about 2 seconds. A2 adds to it.',
      A1:    'Length of the D1 gate, same range. A3 adds to it.',
      A2k:   'More D0 length. With a cable in A2, it attenuates that CV.',
      A3k:   'More D1 length. With a cable in A3, it attenuates that CV.',
      A2:    'CV added to the D0 length, up to another 2 seconds.',
      A3:    'CV added to the D1 length.',
      CLK:   'Starts both gates. A new trigger restarts them.',
      D0:    'Gate 1.',
      D0led: 'On during gate 1.',
      D1:    'Gate 2.',
      D1led: 'On during gate 2.'
    }
  },

  'official/AC08_GateDelay/': {
    how: 'Delays gates. A gate into A2 comes out of D0 later, the same length; A3 to D1 likewise. It only remembers one gate per channel, so a new one arriving before the last has played replaces it.',
    notes: {
      A0:    'Delay for channel 1, 0 to 2 seconds.',
      A1:    'Delay for channel 2, 0 to 2 seconds.',
      A2k:   'A manual gate for channel 1 with nothing in A2. With a cable in, it attenuates the gate.',
      A3k:   'A manual gate for channel 2.',
      A2:    'Gate in for channel 1. On above about 1.2V.',
      A3:    'Gate in for channel 2.',
      D0:    'Channel 1, delayed.',
      D0led: 'Follows D0.',
      D1:    'Channel 2, delayed.',
      D1led: 'Follows D1.'
    }
  },

  'official/AC09_TriggerDelay/': {
    how: 'One trigger in, two delayed triggers out, each with its own delay. Like AC08, it only remembers the latest trigger.',
    notes: {
      A0:    'Delay before D0, 0 to about 1 second.',
      A1:    'Delay before D1, 0 to about 1 second.',
      CLK:   'The trigger to delay.',
      D0:    '50ms trigger after the A0 delay.',
      D0led: 'Flashes with D0.',
      D1:    '50ms trigger after the A1 delay.',
      D1led: 'Flashes with D1.'
    }
  },

  'official/AC11_Glissando/': {
    how: 'A glide in DAC steps. When A2 moves, the output slides to the new value over the time set by A0, however far it has to go, then fires D0.',
    notes: {
      A0:    'Glide time, from instant up to about 2.5 seconds per move.',
      A2k:   'The target with nothing in A2. With a cable in, it attenuates the input.',
      A2:    'Where to glide to.',
      D0:    '25ms trigger when the glide arrives.',
      D0led: 'Flashes on arrival.',
      DAC:   'The gliding voltage, in 256 steps.'
    },
    extra: 'The glide time is read when a new target arrives, so turning A0 mid-glide takes effect on the next one. With the output expander, its eight outputs carry the DAC\'s eight bits.'
  },

  'official/AC15_AutoSwitch/': {
    how: 'Switches the DAC between A2 and A3, on each clock or on its own timer. D0 and D1 show which one is live.',
    notes: {
      A0:    'Switching speed. Fully left it only switches on CLK. Turn it up and it switches on its own, from about every 4 seconds to every 20ms.',
      A2k:   'Input 1 by hand with nothing in A2. With a cable in, it attenuates that signal.',
      A3k:   'Input 2 by hand with nothing in A3.',
      A2:    'Input 1.',
      A3:    'Input 2.',
      CLK:   'Switches to the other input.',
      D0:    'High while A2 is live.',
      D0led: 'On while A2 is live.',
      D1:    'High while A3 is live.',
      D1led: 'On while A3 is live.',
      DAC:   'Whichever input is live, passed through at 8 bits.'
    },
    extra: 'With the output expander, its eight outputs carry the DAC\'s eight bits.'
  },

  'official/AC22_Standards/': {
    how: 'A fixed-voltage source: pick an octave and a note and it holds that voltage. Handy for tuning or transposing.',
    notes: {
      A0:    'Octave, 0 to 5.',
      A1:    'Note within the octave, 0 to 11 semitones.',
      DAC:   'The voltage. Octaves are 48 DAC steps, about 0.94V, and semitones about 78mV, so it\'s about 6% short of true 1V/oct.'
    },
    extra: 'With the output expander, its eight outputs carry the DAC\'s eight bits.'
  },

  'official/AC23_VoltageRecorder/': {
    how: 'A voltage recorder. Push A3 high and it records A2 on each clock, up to 512 steps. Every clock also plays one back, and A0 lets playback skip ahead so the recording comes out faster or scrambled. mem_check_ is a copy of this sketch with memory reporting added.',
    notes: {
      A0:    'Playback hop: how many steps it moves per clock, from 1 to 8.',
      A1:    'Loop length, from 1 to 255 steps. Only the first 255 of the 512 recorded steps can be reached. Keep it off fully left: a length of zero isn\'t handled.',
      A2k:   'With nothing in A2, sets the voltage to record. With a cable in, it attenuates the input.',
      A3k:   'With nothing in A3, past about a quarter starts recording. With a cable in, it attenuates that gate.',
      A2:    'The CV to record.',
      A3:    'Record gate. Above about 1.25V it starts recording from step 1. While it stays high it records over and over.',
      CLK:   'Records one step if recording, and plays one step.',
      D0:    'Gate, high while recording.',
      D0led: 'On while recording.',
      D1:    '25ms trigger when a recording finishes.',
      D1led: 'Flashes when a recording finishes.',
      DAC:   'The recording, at full 8-bit resolution.'
    },
    extra: 'The loop-length line reads analogRead(1) >> 1 + 1, which C works out as >> 2, hence the 255 limit. With the output expander, its eight outputs carry the DAC\'s eight bits.'
  },

  'community/asct/ASCTard002_CV_Scaler/': {
    how: 'By Ascetic. Rescales A2 to fit between a minimum and a maximum. Cross them over and it inverts. The ArdCore ignores negative voltages, so offset bipolar CV first.',
    notes: {
      A0:    'Minimum output, 0 to 5V.',
      A1:    'Maximum output, 0 to 5V. Set it below A0 to flip the input upside down.',
      A2k:   'The input by hand with nothing in A2. With a cable in, it attenuates the input.',
      A2:    'The CV to scale.',
      DAC:   'The scaled CV.'
    },
    extra: 'It only recalculates when A2 changes, so after moving A0 or A1 the output catches up on the next input change.'
  },

  'community/asct/ASCTard007_Rat_s_h___t/': {
    how: 'By Ascetic, loosely after the Buchla/Eardrill pendulum-ratchet. A clock is divided down to an internal clock, by plain division or by counting only on primes, Fibonacci, Fermat or Recamán numbers. That internal clock is divided again, the same ways, for D0 and D1. Each internal tick also makes a random voltage. It needs a fast clock.',
    notes: {
      A0:    'Internal clock. Left half: divide by 1 to 127. Right half, in four zones: primes, Fibonacci, Fermat, Recamán.',
      A1:    'Top of the random voltage, 0 to 5V.',
      A2k:   'D0\'s pattern: divide by 1 to 34 over most of the knob, then primes, Fibonacci, Fermat and Recamán zones near the top. With a cable in A2, it attenuates that CV.',
      A3k:   'D1\'s pattern, the same way. With a cable in A3, it attenuates that CV.',
      A2:    'CV for D0\'s pattern.',
      A3:    'CV for D1\'s pattern.',
      CLK:   'The clock to divide. Counts run 0 to 127 and wrap.',
      D0:    '2ms trigger when the internal clock matches D0\'s pattern.',
      D0led: 'Flickers with D0.',
      D1:    '2ms trigger when the internal clock matches D1\'s pattern.',
      D1led: 'Flickers with D1.',
      DAC:   'A random voltage, updated when D0 fires.'
    }
  },

  'snazzy_fx/CV-LFO_SKETCHES/harmonize_NOTES_CV/': {
    how: 'By Dan Snazelle, after an idea in Curtis Roads\' Computer Music Tutorial. It takes the note at A2 and alternates between a fifth and a fourth above it. It alternates on every pass through loop(), thousands of times a second, so into a VCO it\'s a buzzing trill rather than a harmony.',
    notes: {
      A2k:   'The note with nothing in A2. With a cable in, it attenuates the input.',
      A3k:   'The "transpose" amount with nothing in A3. With a cable in, it attenuates that CV.',
      A2:    'The note in.',
      A3:    'Multiplies the output by 0 to 12. At zero the output is 0V. Above one it multiplies rather than adds, so values quickly wrap past 5V back to the bottom.',
      DAC:   'The alternating notes.'
    },
    extra: 'The sketch file is harmonize.ino inside a folder called harmonize_NOTES_CV. Arduino needs the two names to match, which is why it shows amber.'
  },

  'snazzy_fx/CV-LFO_SKETCHES/nscale_CV_best/': {
    how: 'By Dan Snazelle, after the nscale example in The Audio Programming Book. Despite the catalog name it isn\'t a quantizer: it plays through an N-note equal-tempered scale on its own. It works the scale out as frequencies in Hz and sends those numbers to the DAC, folded into range, so what comes out is a repeating stepped pattern, not the scale itself.',
    notes: {
      A0:    'Read but not used.',
      A1:    'Time between notes, up to about a quarter of a second.',
      A2k:   'How many notes in the scale. With a cable in A2, it attenuates that CV.',
      A3k:   'Root note. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the number of notes.',
      A3:    'CV for the root.',
      DAC:   'The stepped pattern, 0 to about 2V.'
    },
    extra: 'It switches the ADC to the chip\'s internal 1.1V reference, so every knob and input reaches full scale about a fifth of the way up; the rest of the travel does nothing. It also speeds up Timer0 64 times, which makes delay() 64 times shorter. The folder holds two more versions, nscale_CV and nscale_CV_strict, which send the Hz values straight to the DAC and let them wrap. Three sketches in one folder won\'t build, which is why it shows amber.'
  },

  'snazzy_fx/CV-LFO_SKETCHES/uffq_quantizer/': {
    how: 'A forum snippet, not a working sketch. It contains a line of plain English ("here\'s an idiot version...") that stops it compiling, and it\'s written for a 7-bit DAC on pins 0 to 6.',
    notes: {},
    extra: 'On the ArdCore, pins 0 to 6 include the serial pins, the clock input and D0/D1, so this would drive the clock input as an output. Don\'t run it on the module.'
  },

  'snazzy_fx/THERMOMETER/': {
    how: 'Reads the ATmega328P\'s built-in temperature sensor and prints it in °C over serial four times a second. Nothing on the panel is used. Open the serial monitor to see it.',
    notes: {
      DATA:  'Prints the temperature over USB. Adjust OFFSET in the code to calibrate.'
    }
  },

  'snazzy_fx/AUTOMATIC_VOLTAGE_METER_MODIFIED_FOR_ARDCORE_A2/': {
    how: 'A voltmeter: it averages A2 over 2,500 readings and prints the voltage over serial, a few times a second. Handy for checking what a module is putting out. Nothing is output on the panel.',
    notes: {
      A2k:   'With nothing in A2, reads the knob. With a cable in, it attenuates the input, so turn it fully up for true readings.',
      A2:    'The voltage to measure, 0 to 5V.',
      DATA:  'Prints the reading over USB. Lower SAMPLES in the code for faster-changing signals.'
    }
  },

  'snazzy_fx/CV-LFO_SKETCHES/arbitray_quantizer_FASTNOTES.pde': {
    how: 'A modified AC02 by Dan Snazelle that "quantizes" to a list of 35 arbitrary values instead of notes: weird CV rather than a scale.',
    notes: {
      A0:    'Transpose, 0 to 11 steps.',
      A1:    'D1 gate length.',
      A2k:   'The input with nothing in A2. With a cable in, it attenuates it.',
      A2:    'Picks one of 35 zones, each mapped to a fixed value from the list. Values past the top of the DAC wrap round.',
      CLK:   'Forces an update.',
      D0:    'Retriggered on every pass, so in practice it stays high.',
      D1:    'Retriggered on every pass, so it stays high too.',
      DAC:   'The looked-up value.'
    },
    extra: 'The A3 hold from AC02 was removed. As a .pde it isn\'t compiled.'
  },

  'snazzy_fx/CV-LFO_SKETCHES/spaceshipquantizer_pde.pde': {
    how: 'AC02 by way of Dan Snazelle, with the quantize maths replaced by note × transpose × sin(A0). A0 goes into sin() as radians, so small turns swing the output wildly. Spaceship noises, as the name says.',
    notes: {
      A0:    'Both the multiplier (0 to 11) and the sin() input, so it jumps about unpredictably.',
      A1:    'D1 gate length.',
      A2k:   'The input with nothing in A2. With a cable in, it attenuates it.',
      A3k:   'Past halfway, holds the output until the next clock.',
      A2:    'The input.',
      A3:    'Above 2.5V the output only updates on CLK.',
      CLK:   'Forces an update.',
      D0:    '10ms trigger on each update.',
      D0led: 'Flashes on each update.',
      D1:    'Gate on each update, as long as A1 sets.',
      D1led: 'On during the gate.',
      DAC:   'The result, wrapped to 8 bits.'
    },
    extra: 'As a .pde it isn\'t compiled.'
  },

  'official/AC28_RectifiedRingMod/': {
    how: 'Multiplies A2 by A3, a digital ring mod. The inputs only see positive voltage, so bipolar audio gets half-rectified first, which the code comments call "very clangorous". The product is also bigger than the DAC can take and wraps round, which adds a lot of extra grit.',
    notes: {
      A2k:   'Level of input 1 with a cable in; with nothing in, a fixed voltage that becomes a gain for A3.',
      A3k:   'Level of input 2 with a cable in; with nothing in, a fixed gain for A2.',
      A2:    'Audio or CV in, 1.',
      A3:    'Audio or CV in, 2.',
      DAC:   'A2 × A3, wrapped to 8 bits.'
    },
    extra: 'The multiply is kept to its low 8 bits, so once the two inputs together pass about a quarter of full scale the output folds over. That, more than the rectifying, is where most of the harshness comes from.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/ANOTHER_DELAY/': {
    how: 'By Dan Snazelle. The input mixed with an 800-sample delay (about a tenth of a second) and a short repeating slice of the buffer set by A3. The sum is louder than the DAC can take and wraps, so it\'s dirty.',
    notes: {
      A2k:   'Input level. The header says turn it well down: louder input wraps sooner.',
      A3k:   'Length of the repeating slice. With a cable in A3, it attenuates that CV.',
      A2:    'Audio in.',
      A3:    'CV for the slice length. At exactly zero it divides by zero.',
      DAC:   'The mix.'
    },
    extra: 'A0 and A1 are labelled mod and feedback in the header. A0 isn\'t read. A1 is read into a feedback value, but the line after overwrites the buffer with the plain input, so feedback never happens.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/ANOTHER_DELAY_mod/': {
    how: 'ANOTHER_DELAY with the input made twice as loud and the dry signal left out of the final mix. Even more wrapping, as the name "mod" suggests.',
    notes: {
      A2k:   'Input level. Keep it low.',
      A3k:   'Length of the repeating slice.',
      A2:    'Audio in.',
      A3:    'CV for the slice length. At exactly zero it divides by zero.',
      DAC:   'The mix.'
    },
    extra: 'As in ANOTHER_DELAY, the feedback on A1 never takes effect. A0 now feeds a delay-length value that isn\'t used.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/BLOG_DELAY_BEST/': {
    how: 'A short digital delay (up to about a tenth of a second) with a twist: the feedback is either full or off. A3 above zero turns on 100% feedback, which then randomly cuts out now and then. The repeats never die away, they pile up until the numbers wrap, so it builds into a glitchy loop.',
    notes: {
      A1:    'Delay time, backwards: turning it up shortens the delay.',
      A2k:   'Input level. Keep it low.',
      A3k:   'Feedback on or off: anywhere above zero is full feedback. With a cable in A3, it attenuates that CV.',
      A2:    'Audio in.',
      A3:    'Feedback on above zero.',
      DAC:   'Dry plus delayed signal.'
    },
    extra: 'The header lists A3 as delay time and A1 as feedback; the code has them the other way round. The on/off feedback comes from feedback = feedback && random(500), which the comment calls a "VERY COOL EFFECT!!". A0 isn\'t read. BLOG_DELAY_BEST_fixed turns the delay knob the right way round.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/Long_DELAY_BEST/': {
    how: 'The plainest delay of the set, and the one the header calls "maybe the best": up to about 60ms of delay with normal feedback, so slapback, doubling and flanging territory.',
    notes: {
      A1:    'Feedback, from none to about 64%.',
      A2k:   'Input level. Keep it low.',
      A3k:   'Delay time, backwards: turning it up shortens the delay. With a cable in A3, it attenuates that CV.',
      A2:    'Audio in.',
      A3:    'Delay time CV. Sweep it slowly for flanging.',
      DAC:   'Dry plus delayed signal.'
    },
    extra: 'A0 isn\'t read. Long_DELAY_BEST_fixed turns the delay knob the right way round.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/SWIRLY_DELAY/': {
    how: 'Long_DELAY_BEST with the delay-time maths changed so the number overflows. The delay time jumps around unpredictably as A3 moves, rather than sliding. Put a slow LFO on A3 for the swirl.',
    notes: {
      A1:    'Feedback, from none to about 64%.',
      A2k:   'Input level. Keep it low.',
      A3k:   'The "swirl": sets the delay time, but in jumps. With a cable in A3, it attenuates that CV.',
      A2:    'Audio in.',
      A3:    'Swirl CV.',
      DAC:   'Dry plus delayed signal.'
    },
    extra: 'The header lists A0 as time; it isn\'t read.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/DELAY_ONLY/': {
    how: 'By Dan Snazelle: "dirty but soft". A delay with a fixed 50% feedback, plus a sample-rate crusher on A0. The input goes to A3 here, not A2.',
    notes: {
      A0:    'Sample rate: fully left it holds each sample for 20ms, turning up goes back to full rate. All of the change happens in the first fifth of the knob.',
      A2k:   'Delay time, backwards: turning it up shortens it. With a cable in A2, it attenuates that CV.',
      A3k:   'Input level. Keep it low.',
      A2:    'Delay time CV.',
      A3:    'Audio in.',
      DAC:   'The delay output.'
    },
    extra: 'It switches the ADC to the chip\'s 1.1V reference, so inputs clip above 1.1V and the knobs reach full scale about a fifth of the way round. That\'s why the header says to keep the input level down. It also speeds up Timer0 64 times.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/DELAY_SMOOTH/': {
    how: 'By Dan Snazelle. The DELAY_ONLY delay without the crusher: echoes with a fixed 50% feedback. The header suggests mixing it with the dry signal.',
    notes: {
      A1:    'Delay time, backwards: turning it up shortens it. Only the first fifth of the knob does anything.',
      A2k:   'Input level. Keep it low.',
      A2:    'Audio in. Clips above 1.1V.',
      DAC:   'The delay output.'
    },
    extra: 'Like DELAY_ONLY it uses the 1.1V ADC reference, so inputs clip early and knobs reach full scale about a fifth of the way round.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/reverb_prttygood/': {
    how: 'By Dan Snazelle. Called a reverb, it\'s really the input plus two fixed echoes, at about 45ms and 90ms. A typo means the input isn\'t scaled down, so it wraps round four times across its range: keep the level low.',
    notes: {
      A3k:   'Input level. Keep it low, or the input folds over.',
      A3:    'Audio in.',
      DAC:   'Dry plus the two echoes.'
    },
    extra: 'The input line reads analogRead(3) >> 2-CENTERPOS, which works out as a shift by a negative number. The compiler does no shift at all, so the 10-bit reading is cut to its low 8 bits. The folder has two copies of the sketch with the same code and different header comments. reverb_prttygood_fixed corrects the shift.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/weird_delay/': {
    how: 'By Dan Snazelle: "noisy delay experiments". The delay buffer is filled but never played. What comes out is read from a 1,100-byte array made on the stack every sample and never filled in, so you hear whatever is in that memory. Noisy and unpredictable.',
    notes: {
      A0:    'Sample rate: fully left holds each sample for 20ms, turning up goes back to full rate.',
      A1:    'Moves where the output reads from.',
      A3k:   'Input level. Keep it low.',
      A3:    'Audio in, though it only reaches the output through whatever memory it disturbs.',
      DAC:   'Noise shaped by the input and knobs.'
    },
    extra: 'The stack array plus the delay buffer come to more than the chip\'s 2KB of RAM, so the stack runs into the rest of the program\'s data. It also uses the 1.1V ADC reference.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/weird_modulator/weird_modulator/': {
    how: 'By Dan Snazelle. A random-level chopper: every so often it picks a new random gain for the input, then squeezes the result into a narrow band around the middle. Two knobs slow the sample rate down.',
    notes: {
      A0:    'Sample rate: fully left adds 2ms per sample, fully right none.',
      A1:    'A second sample-rate slowdown, the same way.',
      A3k:   'Input level. Keep it low.',
      A3:    'Audio in.',
      D0:    'Sits at 5V the whole time.',
      D0led: 'Always on.',
      DAC:   'The chopped signal, between about 1.8V and 3.2V.'
    },
    extra: 'How often the gain changes was meant to come from A2, but the code reads one past the end of a two-value array (anaVs[2]), so it uses whatever is next in memory instead.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DISTORTION/': {
    how: 'By Dan Snazelle. Swaps the top and bottom halves of each sample\'s bits, then masks and shifts it: a harsh digital scramble rather than a clipper. Two knobs lower the sample rate as well.',
    notes: {
      A0:    'Sample rate: fully left holds each sample for 22ms, fully right full rate.',
      A2k:   'Input level with a cable in A2.',
      A3k:   'Another sample-rate control, up to 32ms per sample. With a cable in A3, it attenuates that CV.',
      A2:    'Audio in.',
      A3:    'Sample-rate CV.',
      D0:    'Sits at 5V the whole time.',
      D0led: 'Always on.',
      DAC:   'The scrambled signal.'
    }
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/waveshapers/waveshpr1/': {
    how: 'By Dan Snazelle, from a set of three waveshapers ("try them on CV too"). The input is bit-scrambled around an offset, masked by A1, and folded into 6 bits.',
    notes: {
      A0:    'Sample rate: fully left holds each sample for 22ms, fully right full rate.',
      A1:    'A bit mask: turning it changes which bits survive.',
      A2k:   'The offset the scrambling works around. With a cable in A2, it attenuates that CV.',
      A3k:   'Input level with a cable in A3.',
      A2:    'CV for the offset.',
      A3:    'Audio or CV in.',
      D0:    'Sits at 5V the whole time.',
      D0led: 'Always on.',
      DAC:   'The shaped signal, fairly quiet.'
    }
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/waveshapers/waveshpr2/': {
    how: 'By Dan Snazelle. Meant to cycle through XORs of the input with shifted copies of itself. The counters that should step through them reset on every call, so it always does the same one: the input shifted 4 bits XORed with it shifted 5. A fixed, harsh digital shaper.',
    notes: {
      A0:    'Sample rate: fully left holds each sample for 22ms, fully right full rate.',
      A3k:   'Input level with a cable in A3.',
      A3:    'Audio or CV in.',
      D0:    'Sits at 5V the whole time.',
      D0led: 'Always on.',
      DAC:   'The shaped signal.'
    },
    extra: 'It also writes one past the end of a 10-value array, which overwrites whatever sits next to it on the stack. waveshpr2_fixed corrects both and puts A1 and A2 to use.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/waveshapers/waveshpr2_fixed/': {
    how: 'Fixed 2026 copy of waveshpr2. It makes eleven shifted copies of the input and XORs two of them. A1 and A2 now pick which two, as the original header meant, so there are over a hundred harsh digital shapes to choose from.',
    notes: {
      A0:    'Sample rate: fully left holds each sample for 22ms, fully right full rate.',
      A1:    'First shifted copy, eleven positions.',
      A2k:   'Second shifted copy, eleven positions. With a cable in A2, it attenuates that CV. When both knobs pick the same copy, the output goes quiet.',
      A2:    'CV for the second copy: sweep it for a stepped, glitchy change of tone.',
      A3k:   'Input level with a cable in A3.',
      A3:    'Audio or CV in.',
      D0:    'Sits at 5V the whole time.',
      D0led: 'Always on.',
      DAC:   'The shaped signal.'
    },
    extra: 'Fixed: the array now has room for all eleven copies, and x and v come from the knobs instead of being reset to the same pair every sample.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/waveshapers/waveshpr3/': {
    how: 'waveshpr2 with A2 mixed in: the XOR part is divided by A2 and added back to the input, then scaled up so it wraps.',
    notes: {
      A0:    'Sample rate: fully left holds each sample for 22ms, fully right full rate.',
      A2k:   'How much of the XOR part gets through: more voltage, less of it. Fully left divides by zero. With a cable in A2, it attenuates that CV.',
      A3k:   'Input level with a cable in A3.',
      A2:    'CV for the XOR mix.',
      A3:    'Audio or CV in.',
      D0:    'Sits at 5V the whole time.',
      D0led: 'Always on.',
      DAC:   'The shaped signal.'
    },
    extra: 'Same out-of-bounds array write as waveshpr2.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/WORKING_CRUSHER/': {
    how: 'By Dan Snazelle. A sample-rate crusher run from a clock: each clock grabs A2 and puts out the previous grab. Feed CLK a fast square wave; its pitch is the sample rate.',
    notes: {
      A2k:   'Input level with a cable in A2. Keep it low.',
      A2:    'Audio in. With the 1.1V reference it wraps once on the way up to about 0.55V, and pins at the top above 1.1V.',
      CLK:   'The sample clock. Audio-rate squares work best.',
      DAC:   'The crushed audio.'
    },
    extra: 'It declares a 1,500-sample buffer, but the index is reset on every pass so only one slot is ever used. The effect is a clocked sample and hold with a one-clock delay, which is what makes it a crusher.'
  },

  'snazzy_fx/dans_trashy_mods/fucked_square/': {
    how: 'By Dan Snazelle: AC19\'s shaped LFO run through bitwise NOTs, ANDs and ORs until it turns into a buzzy, glitchy square-ish wave. It\'s an oscillator more than an effect.',
    notes: {
      A0:    'Speed, though not smoothly: it changes the numbers going in to the mangling.',
      A1:    'Warp, same story.',
      D0:    'Fires erratically.',
      D1:    'Fires erratically.',
      DAC:   'The mangled wave.'
    },
    extra: 'As a .pde it isn\'t compiled.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/fucked_squareB/': {
    how: 'fucked_square with the controls moved to A2 and A3 so they take CV.',
    notes: {
      A2k:   'Speed with nothing in A2. With a cable in, it attenuates that CV.',
      A3k:   'Warp with nothing in A3.',
      A2:    'Speed CV.',
      A3:    'Warp CV.',
      D0:    'Fires erratically.',
      D1:    'Fires erratically.',
      DAC:   'The mangled wave.'
    },
    extra: 'As a .pde it isn\'t compiled.'
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/accorian/': {
    how: 'Bytebeat after viznut\'s one-line formulas, switching between five of them as it goes. Written for a plain Arduino with a speaker on pin 11. On the ArdCore pin 11 is one DAC bit, so it comes out of the DAC as a quiet 31kHz PWM signal (0 to about 1.25V). Filter it.',
    notes: {
      DAC:   'The bytebeat, as PWM on one DAC bit.'
    },
    extra: 'The line meant to slow the counter down, if (++i != 64) return;, has its return commented out, so it runs far faster and higher than the formulas were written for. No controls.'
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/fucking_techno/': {
    how: 'A single bytebeat formula, (t*(t>>8|t>>9)&46&t>>8)^(t&t>>13|t>>6), played as PWM on pin 11 like accorian. On the ArdCore that\'s one DAC bit: filter it.',
    notes: {
      DAC:   'The bytebeat, as PWM on one DAC bit.'
    },
    extra: 'Same commented-out return as accorian, so it runs fast. A switch with four more formulas is in the file, commented out. No controls.'
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/french_friesWcv/': {
    how: 'accorian\'s five formulas sent to the DAC properly, with A2 dropped into the formulas as a shift amount.',
    notes: {
      A2k:   'The shift. Only the very bottom of the knob matters: past about 3% the shift is too big and that term drops out. With a cable in A2, it attenuates that CV.',
      A2:    'CV for the shift, 0 to about 0.15V.',
      DAC:   'The bytebeat.'
    },
    extra: 'Same commented-out return as accorian, so it runs fast.'
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/drumsandmelody/': {
    how: 'A bytebeat formula, (t*9&t>>4|t*5&t>>7|t*38&t>>10)-1, on the DAC, with A2 setting how fast it steps. Slow it right down and it\'s a stepped CV pattern rather than audio.',
    notes: {
      A2k:   'Speed, backwards: turning it up slows it, from about 20,000 steps a second down to about 300. With a cable in A2, it attenuates that CV.',
      A2:    'Speed CV.',
      DAC:   'The pattern.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/drumsandmelody_2/': {
    how: 'drumsandmelody without the -1 at the end of the formula.',
    notes: {
      A2k:   'Speed, backwards: turning it up slows it. With a cable in A2, it attenuates that CV.',
      A2:    'Speed CV.',
      DAC:   'The pattern.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/mvValues_musc/': {
    how: 'A bytebeat formula with both CV inputs inside it: A2 divides the counter and A3 masks it.',
    notes: {
      A2k:   'Divider. Right at the bottom it divides by zero and the output sticks. With a cable in A2, it attenuates that CV.',
      A3k:   'Mask. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the divider.',
      A3:    'CV for the mask.',
      DAC:   'The bytebeat, quiet.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/pretty1/': {
    how: 'The formula 3*t&t>>8 on the DAC, as fast as the chip can go. No controls.',
    notes: {
      DAC:   'The bytebeat, high and fast.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/pretty1_pot/': {
    how: 'pretty1 with A2 setting the speed.',
    notes: {
      A2k:   'Speed, backwards: turning it up slows it, from about 20,000 steps a second down to about 300. With a cable in A2, it attenuates that CV.',
      A2:    'Speed CV.',
      DAC:   'The bytebeat.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/pretty1a_pot/': {
    how: 'A different formula, t*5&t>>7|t*38&t>>8, with A2 setting the speed.',
    notes: {
      A2k:   'Speed, backwards: turning it up slows it. With a cable in A2, it attenuates that CV.',
      A2:    'Speed CV.',
      DAC:   'The bytebeat.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/stairstep_pot/': {
    how: 'pretty1a_pot with a different output stage. It works out value mod (value / 4), and value / 4 is often zero, so it divides by zero a lot: the result is a jumpy staircase.',
    notes: {
      A2k:   'Speed, backwards: turning it up slows it. With a cable in A2, it attenuates that CV.',
      A2:    'Speed CV.',
      DAC:   'The staircase.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/two_controls_machine/': {
    how: 'A bytebeat with A2 for speed and A1 dividing the output.',
    notes: {
      A1:    'Divides the output by 1, 2 or 3. The bottom quarter divides by zero and the output sticks.',
      A2k:   'Speed, backwards: turning it up slows it. With a cable in A2, it attenuates that CV.',
      A2:    'Speed CV.',
      DAC:   'The bytebeat.'
    },
    extra: 'A3 is read but not used, and the outer counter j never moves on, so it\'s one control fewer than the name suggests.'
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/shortArduino1/': {
    how: 'The formula from viznut\'s "crowd", ((t<<1)^((t<<1)+(t>>7)&t>>12))|t>>(4-(1^7&(t>>19)))|t>>7, as PWM on pin 11. On the ArdCore that\'s one DAC bit: filter it. It changes slowly over minutes.',
    notes: {
      DAC:   'The bytebeat, as PWM on one DAC bit.'
    },
    extra: 'A switch with four more formulas sits after a return and never runs. No controls.'
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/shortArduino1_2/': {
    how: 'A short melodic bytebeat, t*(((t>>9)^((t>>9)-1)^1)%13), sent to D0 with analogWrite().',
    notes: {
      D0:    'The bytebeat as PWM at about 490Hz, which you\'ll hear as a whine under it. Filter it.',
      D0led: 'Glows with the output.'
    },
    extra: 'No controls.'
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/shortArduino_DANT/': {
    how: 'A long layered bytebeat formula sent to D0 with analogWrite(). The notes in the _melody copy say to plug into D0 and give it time: it takes a while to get going.',
    notes: {
      D0:    'The bytebeat as PWM at about 490Hz. Filter it.',
      D0led: 'Glows with the output.'
    },
    extra: 'No controls. shortArduino_DANT_melody is the same code with different comments.'
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/shortArduino_DANT_melody/': {
    how: 'The same code as shortArduino_DANT, with a note to plug into D0 and give it time.',
    notes: {
      D0:    'The bytebeat as PWM at about 490Hz. Filter it.',
      D0led: 'Glows with the output.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/sloe_dub/': {
    how: 'The fucking_techno formula, (t*(t>>8|t>>9)&46&t>>8)^(t&t>>13|t>>6), slowed down properly and sent to D0 with analogWrite().',
    notes: {
      D0:    'The bytebeat as PWM at about 490Hz. Filter it.',
      D0led: 'Glows with the output.'
    },
    extra: 'No controls.'
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/simple_template/': {
    how: 'The template Dan used for these: one formula, as fast as it will go, straight to the DAC. Swap the formula to try your own.',
    notes: {
      DAC:   'The bytebeat.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/delay_expeweriments/delay_byte1/': {
    how: 'BLOG_DELAY_BEST with bytebeat formulas in the middle: the delay time and feedback go through formulas before they\'re used. Turning A3 or A1 jumps between unrelated settings instead of sweeping.',
    notes: {
      A1:    'Feeds the feedback formula. In practice it only switches between two settings.',
      A2k:   'Input level. Keep it low.',
      A3k:   'Feeds the delay-time formula. With a cable in A3, it attenuates that CV.',
      A2:    'Audio in.',
      A3:    'CV for the delay-time formula.',
      DAC:   'Dry plus delayed signal.'
    }
  },

  'snazzy_fx/BYTEBEAT_CV_and_AUDIO/CROWD_Make_compatible/': {
    how: 'A bytebeat that also draws its waveform on a TV using the TVout library. Not an ArdCore sketch: it needs a TV on the video pins and a speaker on pin 11. The first line is missing its #, so it doesn\'t compile as it stands.',
    notes: {},
    extra: 'Kept as a reference for the formulas in its comments, which include viznut\'s "crowd" and several others.'
  },
  'community/asct/ASCTard004_Gate_Counter_fixed/': {
    how: 'A fixed copy of Ascetic\'s ASCTard004, made in 2026. Two channels, each either a counter (fire every N clocks) or a toggle (flip on and off every N clocks), with N from 1 to 64 set by A2 and A3. The original sits next to it unchanged.',
    notes: {
      A0:    'Mode for channel 1: left half counts, right half toggles.',
      A1:    'Mode for channel 2: same.',
      A2k:   'Count for channel 1 with nothing in A2. With a cable in, it attenuates that CV.',
      A3k:   'Count for channel 2 with nothing in A3. With a cable in, it attenuates that CV.',
      A2:    'How many clocks between events on channel 1, 1 to 64.',
      A3:    'How many clocks between events on channel 2, 1 to 64.',
      CLK:   'The clock to count.',
      D0:    'Channel 1: a 25ms trigger in count mode, a gate that flips in toggle mode.',
      D0led: 'Follows D0.',
      D1:    'Channel 2, the same.',
      D1led: 'Follows D1.'
    },
    extra: 'What was fixed: the counters were advanced with "count = count++;", which leaves count unchanged, so nothing counted. Both lines are now "count++;". The comment at the top of the file explains it.'
  },

  'official/OX04_8WayDivider_fixed/': {
    how: 'OX04 finished in 2026: an 8-way clock divider for the output expander. Jack 1 fires every step, jack 2 every second step, and so on up to every eighth. It runs from its own clock or from CLK, like OX01. The original sits next to it unchanged.',
    notes: {
      A0:    'Tempo, from about 1.25s per step up to one every 30ms. Fully left it follows CLK instead.',
      A1:    'Gate length for D0 and the expander, from 5ms to about a quarter of a second.',
      A2k:   'Reset with nothing in A2: past halfway holds all dividers at the start. With a cable in, it attenuates that gate.',
      A3k:   'Run/stop with nothing in A3: past halfway runs. With a cable in, it attenuates that gate.',
      A2:    'Reset. Above 2.5V all eight dividers are held at the start.',
      A3:    'Run/stop. Above 2.5V it runs. Starting it lines the dividers up again.',
      CLK:   'Steps the dividers when A0 is fully left.',
      D0:    'A trigger on every step.',
      D0led: 'Flashes on every step.',
      D1:    'A 5ms pulse when it starts running.',
      D1led: 'Blinks when it starts.',
      DAC:   'All eight divisions at once, one per bit: a stepped CV. Meant for the expander.'
    },
    extra: 'What was done: the original was OX01 with the pattern table swapped for the list 1 to 8, still read as a table, and missing a variable, so it didn\'t compile. The divider now counts steps and fires output N every N steps, wrapping at 840 (the smallest number 1 to 8 all divide into) so the outputs never drift apart. A2 is now the reset the header always described. With the output expander, the eight jacks divide by 1 to 8.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/BLOG_DELAY_BEST_fixed/': {
    how: 'A fixed copy of BLOG_DELAY_BEST, made in 2026. The same short delay with all-or-nothing feedback that builds into glitchy loops, but the delay knob now works the right way: turn up for a longer delay. The original sits next to it unchanged.',
    notes: {
      A1:    'Delay time, up to about a tenth of a second.',
      A2k:   'Input level. Keep it low.',
      A3k:   'Feedback on or off: anywhere above zero is full feedback, which randomly drops out. With a cable in A3, it attenuates that CV.',
      A2:    'Audio in.',
      A3:    'Feedback on above zero.',
      DAC:   'Dry plus delayed signal.'
    },
    extra: 'What was fixed: the code read the buffer delayLength samples ahead of where it writes, which in a ring buffer is the long way round, so the knob ran backwards. It now reads delayLength samples behind. The header\'s swapped knob labels are corrected in the comment at the top. The on/off feedback is kept, since it\'s the point of this one.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/Long_DELAY_BEST_fixed/': {
    how: 'A fixed copy of Long_DELAY_BEST, made in 2026. The plain delay with normal feedback, up to about 60ms, with the delay knob now the right way round: turn up for longer. The original sits next to it unchanged.',
    notes: {
      A1:    'Feedback, from none to about 64%.',
      A2k:   'Input level. Keep it low.',
      A3k:   'Delay time, up to about 60ms. With a cable in A3, it attenuates that CV.',
      A2:    'Audio in.',
      A3:    'Delay time CV. Sweep it slowly for flanging.',
      DAC:   'Dry plus delayed signal.'
    },
    extra: 'What was fixed: the code read the buffer delayLength samples ahead of where it writes, so the knob ran backwards. It now reads delayLength samples behind. Nothing else changed.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/reverb_prttygood_fixed/': {
    how: 'A fixed copy of reverb_prttygood, made in 2026. The input plus two echoes, at about 45ms and 90ms, now with the input read properly and the output centred and clipped instead of wrapping. The original sits next to it unchanged.',
    notes: {
      A3k:   'Input level with a cable in A3.',
      A3:    'Audio in.',
      DAC:   'Dry plus the two echoes, centred on 2.5V.'
    },
    extra: 'What was fixed: the input line analogRead(3)>>2-CENTERPOS was a shift by a negative number, so the reading wrapped round four times across 0 to 5V. It\'s now (analogRead(3) >> 2) - CENTERPOS. The output then has CENTERPOS added back and is clamped to the DAC\'s range, so loud peaks clip rather than wrap.'
  },
  'community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_AudioRate/': {
    how: 'By Ascetic. White noise from a 128-sample buffer played back on a timer. A1 and A2 set the playback rate, which changes the colour of the noise from a low rumble to bright hiss, and A3 smooths it.',
    notes: {
      A0:    'Level of the noise.',
      A1:    'Rate, coarse: from about 60 samples a second up to about 31,000.',
      A2k:   'Rate, fine. With a cable in A2, it attenuates that CV.',
      A3k:   'Smoothing, four steps: none, then averaging with more and more neighbouring samples. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the fine rate.',
      A3:    'CV for the smoothing.',
      DAC:   'The noise.'
    },
    extra: 'After the first pass, the flag that should stop the buffer being refilled is compared (==) instead of set (=), so the buffer is refilled nonstop. At the fastest rates the buffer can loop before it\'s refilled, which may add a faint pitch to the noise. DeadCityRadio_AudioRate_fixed corrects it.'
  },

  'community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_LFOrate/': {
    how: 'By Ascetic. The same noise buffer stepped slowly, as random CV. Ascetic notes it makes good gate patterns on the output expander.',
    notes: {
      A0:    'Level of the noise.',
      A1:    'Step rate, coarse. Turn up for faster.',
      A2k:   'Step rate, fine. With a cable in A2, it attenuates that CV.',
      A3k:   'Smoothing, four steps. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the fine rate.',
      A3:    'CV for the smoothing.',
      DAC:   'Random stepped CV.'
    },
    extra: 'The same == for = slip as the audio-rate version means that once the first 128 steps are played, the buffer is refilled on every pass. That makes each pass much slower, so after the first cycle it steps far more slowly than before: from under a second per step at the fast end to minutes at the slow end. With the output expander, the eight jacks give random gate patterns. DeadCityRadio_LFOrate_fixed corrects it.'
  },

  'community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_Clocked/': {
    how: 'By Ascetic. The noise buffer stepped by CLK: each clock moves to the next random value. A clocked random source, and on the expander, clocked random gates.',
    notes: {
      A0:    'Level of the noise.',
      A3k:   'Smoothing, four steps. With a cable in A3, it attenuates that CV.',
      A3:    'CV for the smoothing.',
      CLK:   'Steps to the next random value.',
      DAC:   'Random stepped CV, changing on each clock.'
    },
    extra: 'A1 and A2 are read for a rate but nothing uses it in this version. With the output expander, the eight jacks give random gate patterns.'
  },

  'community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_AudioRate_fixed/': {
    how: 'Fixed 2026 copy of Dead City Radio, audio rate. White noise from a 128-sample buffer played back on a timer. The buffer is refilled once per pass instead of nonstop, so the knobs respond straight away, and the smoothing now works: each sample is averaged with the ones just before it, so turning A3 up makes the noise darker.',
    notes: {
      A0:    'Level of the noise.',
      A1:    'Rate, coarse: from about 60 samples a second up to about 31,000.',
      A2k:   'Rate, fine. With a cable in A2, it attenuates that CV.',
      A3k:   'Smoothing, four steps: off, then averaging over 2, 3 and 4 samples. Each step is darker. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the fine rate.',
      A3:    'CV for the smoothing.',
      DAC:   'The noise.'
    },
    extra: 'The comment at the top of the sketch lists the four fixes: the == that should have been =, an index that was never set, smoothing that averaged the wrong samples, and two variables shared with the interrupt that needed to be volatile.'
  },

  'community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_LFOrate_fixed/': {
    how: 'Fixed 2026 copy of Dead City Radio, LFO rate. The noise buffer stepped slowly, as random CV. It now steps on a millisecond clock, so the rate no longer depends on how busy the loop is, and the smoothing works.',
    notes: {
      A0:    'Level of the noise.',
      A1:    'Step time, coarse: about 2s per step fully left, 20ms fully right.',
      A2k:   'Step time, fine, up to 32ms either way. With a cable in A2, it attenuates that CV.',
      A3k:   'Smoothing, four steps: each new value is averaged with the ones before it, so higher settings give smaller, smoother jumps. With a cable in A3, it attenuates that CV.',
      A2:    'CV for the fine rate.',
      A3:    'CV for the smoothing.',
      DAC:   'Random stepped CV.'
    },
    extra: 'With the output expander, the eight jacks give random gate patterns. The comment at the top of the sketch lists the fixes.'
  },

  'community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_Clocked_fixed/': {
    how: 'Fixed 2026 copy of Dead City Radio, clocked. Each clock steps to the next random value. The buffer is refilled once per pass instead of nonstop, so fast clocks aren\'t missed, and the smoothing works.',
    notes: {
      A0:    'Level of the noise.',
      A3k:   'Smoothing, four steps: each new value is averaged with the ones before it. With a cable in A3, it attenuates that CV.',
      A3:    'CV for the smoothing.',
      CLK:   'Steps to the next random value.',
      DAC:   'Random stepped CV, changing on each clock.'
    },
    extra: 'A1 and A2 are still read for a rate that nothing uses, as in the original. With the output expander, the eight jacks give clocked random gates.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/ARDCORE_NOISEMAKER/': {
    how: 'By Dan Snazelle, "as simple as it gets": A2 times A0, cut to 8 bits. The product is far bigger than the DAC can take, so it wraps round many times. Put an LFO in A2 and it folds into a buzz.',
    notes: {
      A0:    'Multiplier. More means more wrapping and a brighter buzz.',
      A2k:   'The other side of the multiply with nothing in A2. With a cable in, it attenuates the input.',
      A2:    'CV or LFO in.',
      DAC:   'The wrapped product: CV, or audio if A2 is moving.'
    }
  },

  'snazzy_fx/WHITE_NOISE/SDIY_ARDCORE_NOISE/': {
    how: 'White noise from a 32-bit shift register, stepped by a timer at about 31kHz. No controls.',
    notes: {
      DAC:   'White noise.'
    },
    extra: 'It also turns on PWM on pin 11, which is one of the DAC bits, so that bit carries a PWM copy of the noise rather than the plain bit. It still comes out as noise.'
  },

  'snazzy_fx/dans_trashy_mods/AC66_NOISE_BOMB/': {
    how: 'By Dan Snazelle, built on the AC23 voltage recorder. It holds a sine table, and each clock jumps through it by a random-ish amount, so what comes out is a clocked, scrambled sine: noisy, but pitched by the clock.',
    notes: {
      A0:    'How far each clock jumps through the table.',
      A1:    'Loop length. Keep it off fully left: a length of zero isn\'t handled.',
      CLK:   'Steps the output. Its rate sets the pitch.',
      DAC:   'The scrambled sine, 0 to about 1.2V.'
    },
    extra: 'As a .pde it isn\'t compiled.'
  },

  'snazzy_fx/fac_drums/': {
    how: 'By Alfonso Alba (fac). A lo-fi drum sample player with eight short sounds stored in flash. A trigger at CLK plays the selected sound, with pitch control.',
    notes: {
      A0:    'Which of the 8 sounds. A2 adds to it.',
      A1:    'Pitch: fully left is half speed, noon is normal, fully right double. A3 adds to it, up to 8 times.',
      A2k:   'More sound selection on top of A0. With a cable in A2, it attenuates that CV.',
      A3k:   'More pitch on top of A1. With a cable in A3, it attenuates that CV.',
      A2:    'CV for sound selection.',
      A3:    'CV for pitch.',
      CLK:   'Plays the sound. The knobs are read at this moment, so changes land on the next hit.',
      DAC:   'The drum sound, around 24kHz sample rate before pitching.'
    },
    extra: 'It shows amber for the same reason as fac_fm_osc: its tables use prog_uchar and prog_uint32_t, types current Arduino tools no longer have. The sample files came from a converter Alba wrote; the sketch doesn\'t say which drum each one is. fac_drums_fixed updates the types so it builds.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/stereo_beat_gen_pde/': {
    how: 'Loud Objects\' Stereo BeatGen, from their ATtiny noise toys, by way of Collin Cunningham. A 1-bit drum machine: falling-pitch bass drums and noise snares on an 8-step pattern, left channel on D0 and right on D1.',
    notes: {
      A0:    'Tempo, in a scrambled order: each position seeds a random tempo. It\'s only read while CLK is low.',
      CLK:   'Hold a gate high to freeze the tempo. While CLK is low, the tempo follows A0.',
      D0:    'Left channel audio, 1-bit.',
      D0led: 'Flickers with the beat.',
      D1:    'Right channel audio, 1-bit.',
      D1led: 'Flickers with the beat.'
    },
    extra: 'It doesn\'t compile as it stands: a global uses randomGen() before the function is declared. It also watches pin 9 for a "new beat" button, which on the ArdCore is one of the DAC pins, so the pattern may re-roll on its own. stereo_beat_gen_fixed fixes both.'
  },

  'official/OX02_StepVariation/': {
    how: 'An 8-step switch for the output expander: on each clock one of the eight jacks lights, following one of ten stored patterns (forwards, backwards, ping-pong, skips and so on). D0 and D1 give a trigger and a gate for every step.',
    notes: {
      A0:    'Which pattern, 1 to 10. A2 adds to it.',
      A1:    'Gate length, from 3ms to about 3 seconds.',
      A2k:   'More pattern offset on top of A0. With a cable in A2, it attenuates that CV.',
      A3k:   'Past halfway, pattern changes wait until the end of the 16-step cycle. With a cable in A3, it attenuates that gate.',
      A2:    'CV for pattern selection.',
      A3:    'Above 2.5V, holds the pattern until the cycle ends.',
      CLK:   'Moves to the next step.',
      D0:    '5ms trigger on every step.',
      D0led: 'Flashes on every step.',
      D1:    'Gate on every step, as long as A1 sets.',
      D1led: 'On during the gate.',
      DAC:   'One bit at a time, so eight voltages that double each step: jumpy, but usable as CV.'
    },
    extra: 'A0 on its own covers the ten patterns. With A2 added the total can go past ten, and the code then reads past the end of the pattern table, giving stray steps.'
  },

  'official/OX03_AnalogTracker/': {
    how: 'A bar-graph for CV: A2 is split into eight bands and the matching expander jack lights, one at a time. D0 fires when it moves to a new band, D1 when it hits the top.',
    notes: {
      A0:    'Sensitivity. Fully left, 0 to 5V covers all eight bands. Turn up and a smaller voltage reaches the top band.',
      A2k:   'The input by hand with nothing in A2. With a cable in, it attenuates the input.',
      A2:    'The CV to track.',
      D0:    '25ms trigger when it moves to a new band.',
      D0led: 'Flashes on each change.',
      D1:    '25ms trigger when it reaches the top band.',
      D1led: 'Flashes at the top.',
      DAC:   'One bit for the current band, so eight voltages that double each step.'
    },
    extra: 'A new band has to read the same three times in a row before it counts, which keeps it from flickering. With the output expander, the eight jacks light one at a time with the input.'
  },
  'snazzy_fx/fac_drums_fixed/': {
    how: 'A fixed copy of Alfonso Alba\'s fac_drums, made in 2026. The same lo-fi eight-sound drum player: a trigger at CLK plays the selected sound, with pitch control. The original sits next to it unchanged.',
    notes: {
      A0:    'Which of the 8 sounds. A2 adds to it.',
      A1:    'Pitch: fully left is half speed, noon is normal, fully right double. A3 adds to it, up to 8 times.',
      A2k:   'More sound selection on top of A0. With a cable in A2, it attenuates that CV.',
      A3k:   'More pitch on top of A1. With a cable in A3, it attenuates that CV.',
      A2:    'CV for sound selection.',
      A3:    'CV for pitch.',
      CLK:   'Plays the sound. The knobs are read at this moment, so changes land on the next hit.',
      DAC:   'The drum sound.'
    },
    extra: 'What was fixed: the sample and pitch tables used prog_uchar and prog_uint32_t, which current Arduino tools no longer have. They are now const ... PROGMEM, and the file is a .ino so the compile check builds it. The sounds and playback code are unchanged.'
  },

  'snazzy_fx/EXPERIMENTAL_AUDIO/stereo_beat_gen_fixed/': {
    how: 'A fixed copy of Loud Objects\' Stereo BeatGen, made in 2026. The same 1-bit drum machine, left on D0 and right on D1, now building and with its "new beat" control on A1. The original sits next to it unchanged.',
    notes: {
      A0:    'Tempo, in a scrambled order: each position seeds a random tempo. It\'s only read while CLK is low.',
      A1:    'New beat: turn it past halfway to roll a new pattern. It rolls once each time it crosses halfway.',
      CLK:   'Hold a gate high to freeze the tempo. While CLK is low, the tempo follows A0.',
      D0:    'Left channel audio, 1-bit.',
      D0led: 'Flickers with the beat.',
      D1:    'Right channel audio, 1-bit.',
      D1led: 'Flickers with the beat.'
    },
    extra: 'What was fixed: a global called randomGen() before it was declared, so it didn\'t compile; there\'s now a declaration at the top. It also treated pin 9, one of the DAC pins, as a pulled-up button, so the pattern could re-roll by itself. Pins 8 and 9 are now left alone and the new-beat action is on A1.'
  },

  'official/CP01_Compound01/': {
    how: 'Darwin\'s QuadSketch: four sketches in one, so you can switch without re-uploading. Where A0 is set when the module powers up decides which one runs, in quarters. After that A0 goes back to being that sketch\'s own control. Here the four are: AC29 attack/decay envelope, AC02 quantizer, AC04 drunken note and AC27 101 sequencer.',
    notes: {
      A0:    'At power-up: which sketch, in quarters (envelope, quantizer, drunken note, 101). After that: attack time / transpose / walk speed / loop start.',
      A1:    'Decay time / D1 gate length / step size / loop end.',
      A2k:   'With nothing in A2: attack offset / manual note / transpose / manual note. With a cable in, it attenuates the input.',
      A3k:   'With nothing in A3: decay offset / hold switch / repeats switch / record switch.',
      A2:    'Attack CV / note to quantize / transpose / pitch to record.',
      A3:    'Decay CV / hold above 2.5V / repeats above 2.5V / record above 2.5V.',
      CLK:   'Starts the envelope / forces a new quantize / steps the walk / records or plays a step.',
      D0:    'High while the envelope runs / trigger on note change / trigger on each step / high while recording.',
      D0led: 'Follows D0.',
      D1:    'High while the envelope rests / gate on note change / not used / trigger on each step.',
      D1led: 'Follows D1.',
      DAC:   'Envelope / quantized note / walk note / recorded note.'
    },
    extra: 'Each part behaves as its own sketch does, so see AC29, AC02, AC04 and AC27 for detail. One difference: in the 101 part, the line that reloads the saved recording at power-up is commented out, so recordings are saved but not brought back after a power cycle.'
  },

  'official/CP02_Compound02/': {
    how: 'Darwin\'s QuadSketch: four sketches in one, so you can switch without re-uploading. Where A0 is set when the module powers up decides which one runs, in quarters. After that A0 goes back to being that sketch\'s own control. Here the four are: AC29 attack/decay envelope, AC19 shaped LFO, AC04 drunken note and AC27 101 sequencer.',
    notes: {
      A0:    'At power-up: which sketch, in quarters (envelope, LFO, drunken note, 101). After that: attack time / LFO speed / walk speed / loop start.',
      A1:    'Decay time / LFO warp / step size / loop end.',
      A2k:   'With nothing in A2: attack offset / not used / transpose / manual note. With a cable in, it attenuates the input.',
      A3k:   'With nothing in A3: decay offset / not used / repeats switch / record switch.',
      A2:    'Attack CV / not used / transpose / pitch to record.',
      A3:    'Decay CV / not used / repeats above 2.5V / record above 2.5V.',
      CLK:   'Starts the envelope / not used / steps the walk / records or plays a step.',
      D0:    'High while the envelope runs / trigger at the LFO\'s top / trigger on each step / high while recording.',
      D0led: 'Follows D0.',
      D1:    'High while the envelope rests / trigger at the LFO\'s bottom / not used / trigger on each step.',
      D1led: 'Follows D1.',
      DAC:   'Envelope / LFO / walk note / recorded note.'
    },
    extra: 'Each part behaves as its own sketch does, so see AC29, AC19, AC04 and AC27 for detail. As in CP01, the 101 part saves recordings but doesn\'t reload them after a power cycle.'
  },

  'community/asct/ASCTard013_Midi2gates/': {
    how: 'By Ascetic. A MIDI-to-gates converter: plug MIDI into CLK with a MIDI-to-minijack cable, and eight notes in a row each open one of the eight expander gates. D0 gives a divided MIDI clock and D1 a pulse on start, stop and continue.',
    notes: {
      A0:    'MIDI channel, 1 to 16.',
      A1:    'Length of each D0 clock pulse, up to about 16ms.',
      A2k:   'Lowest note with nothing in A2. With a cable in, it attenuates that CV.',
      A3k:   'Clock divider with nothing in A3. With a cable in, it attenuates that CV.',
      A2:    'Lowest note of the eight, across the whole MIDI range.',
      A3:    'Clock divider: D0 fires every 0 to 255 MIDI clocks. MIDI clock runs at 24 per beat, so 24 is one pulse per quarter note, at about 0.5V or a fifth of the way round.',
      CLK:   'MIDI in, through a MIDI-to-minijack cable.',
      D0:    'Divided MIDI clock.',
      D0led: 'Flashes with the clock.',
      D1:    '1ms pulse on MIDI start, stop and continue.',
      D1led: 'Blinks on start and stop.',
      DAC:   'The eight gates as bits, so the voltage is a mix of whichever notes are held. Really meant for the expander.'
    },
    extra: 'With the output expander, each of the eight jacks is a gate for one note: the lowest note on the first jack, then up a semitone per jack. It only reads note on/off, clock and start/stop/continue; other MIDI messages are ignored.'
  }

};
