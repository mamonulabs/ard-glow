# ArdCore Sketch Catalog

Functional index of all sketches in this repository.
See [TUTORIAL.md](TUTORIAL.md) for development guide,
[ardcore_exploration.md](ardcore_exploration.md) for DSP technique catalog.

> **152 sketches** across 4 directories:
> `official/` (37) · `snazzy_fx/` (92) · `community/asct/` (17) · `community/user_submitted/` (6)

**Compile status:** ✅ = compiles · ⚠️ = fails / skipped (see `scripts/verify-ignore.txt`)

---

## Envelopes

- ✅ **AC25 — VC AR Envelope** — Attack/release with VC timing, EOC trigger on D1
  `official/AC25_VCAREnvelope/`
- ✅ **AC29 — VC AD Loop Envelope** — Attack/decay with loop-on-trigger, gate outputs
  `official/AC29_VCADLoopEnvelope/`
- ✅ **AC32 — Bouncing Ball** — Physics-based bouncing ball envelope, trigger on bounce
  `official/AC32_BouncingBall/`
- ✅ **AC34 — Looping VC Envelope** — Free-running AR envelope with VC timing and EOC *(user port)*
  `community/user_submitted/AC34_LoopingVCEnvelope/`
- ✅ **ADSR_ENV** — Experimental ADSR envelope with controllable stages
  `snazzy_fx/ADSR_envelope/ADSR_ENV/`

## Sequencers

- ✅ **AC07 — Sequencer** — Basic 8-step sequencer with knob-based recording
  `official/AC07_Sequencer/`
- ⚠️ **AC10 — Note Delay** — Delay incoming notes by user-selected time
  `official/AC10_NoteDelay/`
- ✅ **AC14 — Gate Sequence** — Gate sequence output via 8-bit DAC (8 gate channels)
  `official/AC14_GateSequence/`
- ✅ **AC27 — 101 SEQ** — SH-101 style voltage recorder, 64 steps, record/play
  `official/AC27_101SEQ/`
- ✅ **AC30 — Dual Euclidean** — Dual Euclidean rhythm generator
  `official/AC30_DualEuclidean/`
- ✅ **ASCTard001 — Analytic Geometry** — Records/plays CV from 8×8 grid coordinates
  `community/asct/ASCTard001_Analytic_Geometry/`
- ⚠️ **ASCTard009 — Phase Patterns** — Steve Reich-inspired phase pattern sequencer
  `community/asct/ASCTard009_Phase_patterns/`
- ✅ **ACDAN1 — Depth Charge** — Random depth charge pattern generator
  `snazzy_fx/dans_trashy_mods/ACDAN1_DepthCharge/`
- ✅ **mem_check_** — Voltage recorder/sampler with playback
  `snazzy_fx/dans_trashy_mods/mem_check_/`
- ⚠️ **randomRecorder** — Random recorder, samples CV into buffer *(`.pde`)*
  `snazzy_fx/dans_trashy_mods/randomRecorder/`
- ⚠️ **simple_random_gates** — Random gate trigger generator *(`.pde`)*
  `snazzy_fx/CV-LFO_SKETCHES/simple_random_gates.pde`
- ✅ **LFSR_SEQUENCER** — LFSR-based sequencer with noise/pattern output
  `snazzy_fx/LFSR/LFSR_SEQUENCER/`
- ✅ **64-stage Shift Register** — 64-stage shift register with transpose control
  `snazzy_fx/shift_register_64/_64stage_ShiftRegister_more_controls/`

## Oscillators

- ✅ **AC24 — Simple VCO** — Direct pin manipulation VCO with 1V/oct CV input
  `official/AC24_SimpleVCO/`
- ✅ **AC33 — Screecher WT** — 7-waveform wavetable VCO with 1V/oct *(user port)*
  `community/user_submitted/AC33_SSQScreecherWT/`
- ✅ **Auduino v5** — Granular synthesis with dual grain control
  `snazzy_fx/ARDCORE_auduino_v5/ARDCORE_auduino_v5.ino`
- ✅ **Auduino MOD1** — Auduino granular synth, grain pitch and decay control
  `snazzy_fx/ARDCORE_auduino_v5/ARDCORE_AUDUINO_MODS/ARDCORE_AUDUINO_MOD1/`
- ✅ **Auduino v5a** — Auduino variant with grain pitch/decay modulation
  `snazzy_fx/ARDCORE_auduino_v5/Auduino_SYNTH_ARDCORE_MODS/ARDCORE_auduino_v5a/`
- ✅ **Auduino v5ab** — Basic Auduino granular port
  `snazzy_fx/ARDCORE_auduino_v5/Auduino_SYNTH_ARDCORE_MODS/ARDCORE_auduino_v5ab/`
- ✅ **ARDCORE_TRIANGLE** — Triangle wave VCO with CV control
  `snazzy_fx/EXPERIMENTAL_AUDIO/ARDCORE_TRIANGLE/`
- ⚠️ **AC_Sinetests** — DDS sine generator with timer interrupt *(`.pde`)*
  `snazzy_fx/dans_trashy_mods/AC_Sinetests_pde/`
- ✅ **SIMPLEST_SAWTOOTH** — Basic sawtooth wave generator
  `snazzy_fx/dans_trashy_mods/SIMPLEST_SAWTOOTH/`
- ✅ **SIMPLEST_SAWTOOTH_mod** — Simple sawtooth oscillator, modified
  `snazzy_fx/dans_trashy_mods/SIMPLEST_SAWTOOTH_mod/`
- ✅ **sine** — Sine wave generator using lookup table
  `snazzy_fx/EXPERIMENTAL_AUDIO/sine/`
- ⚠️ **freqout_ardcore** — Frequency generator tone synthesis
  `snazzy_fx/EXPERIMENTAL_AUDIO/FREQUOT/freqout_ardcore.ino`
- ⚠️ **frequot** — Square wave tone generator with lookup table *(`.pde`)*
  `snazzy_fx/EXPERIMENTAL_AUDIO/FREQUOT/frequot/`
- ✅ **frequot2** — Modified frequency generator
  `snazzy_fx/EXPERIMENTAL_AUDIO/FREQUOT/frequot2/`
- ⚠️ **fac_fm_osc** — FM synthesizer with modulator/carrier *(`.pde`)*
  `snazzy_fx/fac_fm_osc/`
- ⚠️ **ARDCORE_twotone_mod** — Two-tone drone synthesizer
  `snazzy_fx/FRAKTAL_SYNTH_PORTS/ARDCORE_twotone_mod/`
- ⚠️ **chiptune** — Chiptune melody player/sequencer *(`.pde`)*
  `snazzy_fx/EXPERIMENTAL_AUDIO/chiptune.pde`
- ✅ **noiseBrother** — Sawtooth oscillator generator
  `snazzy_fx/EXPERIMENTAL_AUDIO/noiseBrother/`

## LFOs

- ✅ **AC19 — Shaped LFO** — Wave-shaped LFO with speed and warp controls
  `official/AC19_ShapedLFO/`
- ✅ **VC_LFO** — Triangle-wave LFO with waveshaping *(user submitted)*
  `community/user_submitted/VC_LFO/`
- ⚠️ **ASCTard005 — LFO** — Experimental LFO with selectable waveforms
  `community/asct/ASCTard005_LFO/`
- ✅ **ARD_SINE_LFO** — Sine wave LFO with speed control
  `snazzy_fx/CV-LFO_SKETCHES/ARD_SINE_LFO/`
- ✅ **ARD_SINE_LFO_smoother_rng** — Sine LFO with smoothing and range control
  `snazzy_fx/CV-LFO_SKETCHES/ARD_SINE_LFO_smoother_rng/`
- ✅ **LFO_w_slow_CPU** — Triangle LFO, optimized for low CPU usage
  `snazzy_fx/CV-LFO_SKETCHES/LFO_w_slow_CPU/`
- ⚠️ **fac_triple_lfo** — Three independent LFOs with reset *(`.pde`)*
  `snazzy_fx/fac_triple_lfo.pde/`

## Chaos / Generative

- ✅ **AC03 — Drunken Walk** — Random walk at full 8-bit resolution
  `official/AC03_DrunkenWalk/`
- ✅ **AC04 — Drunken Note** — Random walk quantized to note resolution
  `official/AC04_DrunkenNote/`
- ✅ **AC18 — Variation Generator** — Step through 2D variation pattern
  `official/AC18_VariationGenerator/`
- ✅ **AC20 — Depth Random** — Random output limited to user-selected bit depth
  `official/AC20_DepthRandom/`
- ✅ **AC21 — Shift Register** — Record 8 values, shift register with offset/transpose
  `official/AC21_ShiftRegister/`
- ✅ **AC35 — SquidAxon** — NLC SquidAxon port: 4-stage chaotic shift register *(user port)*
  `community/user_submitted/AC35_SquidAxon/`
- ✅ **AC36 — Genie** — NLC Genie port: 3-neuron ring oscillator *(user port)*
  `community/user_submitted/AC36_Genie/`
- ✅ **AC37 — Rungler** — HetrickCV Rungler port: 8-bit boolean shift register *(user port)*
  `community/user_submitted/AC37_Rungler/`
- ✅ **ASCTard008 — Changnesia** — Outputs trigger on CV input changes
  `community/asct/ASCTard008_Changnesia/`
- ✅ **LFSR** — Galois LFSR for noise/CV pattern generation
  `snazzy_fx/LFSR/LFSR/`
- ✅ **LFSR2** — LFSR variant for pattern generation
  `snazzy_fx/LFSR/LFSR2/`
- ✅ **LFSR32** — 32-bit LFSR pattern generator
  `snazzy_fx/LFSR/LFSR32/`
- ⚠️ **AC24_SimpleVCOchaos** — Simple VCO with chaotic modulation *(`.pde`)*
  `snazzy_fx/dans_trashy_mods/AC24_SimpleVCOchaos/`
- ⚠️ **CHAOTIC_VCO2** — Chaotic voltage-controlled oscillator *(`.pde`)*
  `snazzy_fx/dans_trashy_mods/CHAOTIC_VCO2/`
- ⚠️ **really_messed_up_oscillator** — Chaotic PWM oscillator with CV *(`.pde`)*
  `snazzy_fx/EXPERIMENTAL_AUDIO/really_messed_up_oscillator.pde`
- ✅ **CELLULAR_AUTOMATA_SYNTH** — 1D cellular automata rule-based synth
  `snazzy_fx/FRAKTAL_SYNTH_PORTS/CELLULAR_AUTOMATA_SYNTH/CELLULAR_AUTOMATA_SYNTH/`
- ✅ **fraktal_synth** — Fractal algorithm synthesizer, two modes
  `snazzy_fx/FRAKTAL_SYNTH_PORTS/fraktal_synth/`

## Clock / Logic

- ✅ **AC05 — Clock Divide** — Divide incoming clock to two independent outputs
  `official/AC05_ClockDivide/`
- ✅ **AC12 — Comparator** — Fire triggers on value crossing threshold
  `official/AC12_Comparator/`
- ✅ **AC13 — Slope Detector** — Fire triggers on slope direction change
  `official/AC13_SlopeDetector/`
- ✅ **AC16 — Trig Multiplier** — Multiply incoming clock triggers
  `official/AC16_TrigMultiplier/`
- ✅ **AC17 — Logic Module** — AND, OR, XOR logic on two inputs
  `official/AC17_LogicModule/`
- ✅ **OX01 — Master Clock** — Master clock with variable division and trigger time
  `official/OX01_MasterClock/`
- ⚠️ **OX04 — 8-Way Divider** — Divide clock 1 through 8 ways simultaneously
  `official/OX04_8WayDivider/`
- ✅ **ASCTard004 — Gate Counter** — Counts clock pulses, creates toggles
  `community/asct/ASCTard004_Gate_Counter/`
- ✅ **ASCTard006 — Burst Generator** — Generates bursts of clock pulses
  `community/asct/ASCTard006_Burst_gen_ino/`
- ✅ **ASCTard010 — Tapped Out** — Pattern/clock module with presets
  `community/asct/ASCTard010_Tapped_Out/`

## CV Utilities

- ✅ **AC02 — Quantizer** — Quantize voltage to 5V range of chromatic notes
  `official/AC02_Quantizer/`
- ✅ **AC06 — Trig To Gate** — Convert triggers to two user-adjustable gates
  `official/AC06_TrigToGate/`
- ✅ **AC08 — Gate Delay** — Delay incoming gates by user-set amount
  `official/AC08_GateDelay/`
- ✅ **AC09 — Trigger Delay** — Delay trigger outputs by user-set amount
  `official/AC09_TriggerDelay/`
- ✅ **AC11 — Glissando** — Stepped glissando generator with destination trigger
  `official/AC11_Glissando/`
- ✅ **AC15 — Auto Switch** — Switch analog inputs to output based on clock
  `official/AC15_AutoSwitch/`
- ✅ **AC22 — Standards** — Produce 1V/oct and stepped reference outputs
  `official/AC22_Standards/`
- ✅ **AC23 — Voltage Recorder** — Record and playback loop of CV values
  `official/AC23_VoltageRecorder/`
- ✅ **ASCTard002 — CV Scaler** — Scales CV between min/max set by knobs
  `community/asct/ASCTard002_CV_Scaler/`
- ✅ **ASCTard007 — Rat S&H** — Sample-and-hold with ratchet patterns
  `community/asct/ASCTard007_Rat_s_h___t/`
- ✅ **AUTOMATIC_VOLTAGE_METER** — Reads CV and displays voltage values
  `snazzy_fx/AUTOMATIC_VOLTAGE_METER_MODIFIED_FOR_ARDCORE_A2/`
- ⚠️ **harmonize** — Note harmonizer, transforms CV to harmonic output
  `snazzy_fx/CV-LFO_SKETCHES/harmonize_NOTES_CV/`
- ⚠️ **nscale_CV_best** — Note scale quantizer with transpose and timing
  `snazzy_fx/CV-LFO_SKETCHES/nscale_CV_best/nscale_CV_best.ino`
- ⚠️ **nscale_CV_strict** — Strict note scale quantizer
  `snazzy_fx/CV-LFO_SKETCHES/nscale_CV_best/nscale_CV_strict.ino`
- ⚠️ **nscale_CV** — Music scale note quantizer
  `snazzy_fx/CV-LFO_SKETCHES/nscale_CV_best/nscale_CV.ino`
- ⚠️ **uffq_quantizer** — Voltage-to-note quantizer
  `snazzy_fx/CV-LFO_SKETCHES/uffq_quantizer/`
- ⚠️ **arbitray_quantizer_FASTNOTES** — Fast quantizer *(`.pde`)*
  `snazzy_fx/CV-LFO_SKETCHES/arbitray_quantizer_FASTNOTES.pde`
- ⚠️ **spaceshipquantizer** — Spaceship quantizer *(`.pde`)*
  `snazzy_fx/CV-LFO_SKETCHES/spaceshipquantizer_pde.pde`
- ✅ **THERMOMETER** — On-chip temperature sensor readout
  `snazzy_fx/THERMOMETER/`

## Audio Effects

- ✅ **AC28 — Rectified Ring Mod** — Ring modulation of half-rectified waveforms
  `official/AC28_RectifiedRingMod/`
- ✅ **ANOTHER_DELAY** — Feedback delay with knob control
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/ANOTHER_DELAY/`
- ✅ **ANOTHER_DELAY_mod** — Delay with modulation control
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/ANOTHER_DELAY_mod/`
- ✅ **BLOG_DELAY_BEST** — Optimized delay with feedback and modulation
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/BLOG_DELAY_BEST/`
- ✅ **DELAY_ONLY** — Simple delay effect
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/DELAY_ONLY/`
- ✅ **DELAY_SMOOTH** — Smooth delay with bitcrush
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/DELAY_SMOOTH/DELAY_SMOOTH/`
- ✅ **Long_DELAY_BEST** — Extended delay for long decay times
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/Long_DELAY_BEST/Long_DELAY_BEST/`
- ✅ **reverb_prttygood** — Reverb effect with time-based modulation
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/reverb_prttygood/reverb_prttygood.ino`
- ✅ **reverb_prttygood (v2)** — Reverb with multi-buffer approach
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/reverb_prttygood/reverb_prttygood/`
- ✅ **SWIRLY_DELAY** — Delay with swirling modulation
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/SWIRLY_DELAY/SWIRLY_DELAY/`
- ✅ **weird_delay** — Noisy experimental delay
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/weird_delay/`
- ✅ **weird_modulator** — Time-based audio modulator
  `snazzy_fx/EXPERIMENTAL_AUDIO/DELAY_SKETCHES/weird_modulator/weird_modulator/`
- ✅ **DISTORTION** — Bit-crushing distortion effect
  `snazzy_fx/EXPERIMENTAL_AUDIO/DISTORTION/`
- ⚠️ **fucked_square** — Waveshaped square with trigger outputs *(`.pde`)*
  `snazzy_fx/dans_trashy_mods/fucked_square/`
- ⚠️ **fucked_squareB** — Distorted square wave generator *(`.pde`)*
  `snazzy_fx/EXPERIMENTAL_AUDIO/fucked_squareB/`
- ✅ **waveshpr1** — Waveshaper with crush and offset control
  `snazzy_fx/EXPERIMENTAL_AUDIO/waveshapers/waveshpr1/`
- ✅ **waveshpr2** — Waveshaper effect processor
  `snazzy_fx/EXPERIMENTAL_AUDIO/waveshapers/waveshpr2/`
- ✅ **waveshpr3** — Waveshaper distortion effect
  `snazzy_fx/EXPERIMENTAL_AUDIO/waveshapers/waveshpr3/`
- ✅ **WORKING_CRUSHER** — Bit crusher with clock-based processing
  `snazzy_fx/EXPERIMENTAL_AUDIO/WORKING_CRUSHER/`

## Bytebeat

All in `snazzy_fx/BYTEBEAT_CV_and_AUDIO/`:

- ✅ **accorian** — Bytebeat algorithmic audio synthesis
- ✅ **drumsandmelody** — Bytebeat drums and melody pattern
- ✅ **drumsandmelody_2** — Bytebeat drums and melody, variant 2
- ✅ **french_friesWcv** — Bytebeat with CV pattern control
- ✅ **fucking_techno** — Bytebeat algorithmic techno
- ✅ **mvValues_musc** — Bytebeat music pattern
- ✅ **pretty1** — Bytebeat pattern generator
- ✅ **pretty1_pot** — Bytebeat with potentiometer control
- ✅ **pretty1a_pot** — Bytebeat with knob modulation
- ✅ **shortArduino_DANT** — Bytebeat short-form synthesizer
- ✅ **shortArduino_DANT_melody** — Bytebeat short melody generator
- ✅ **shortArduino1** — Bytebeat algorithmic synthesis
- ✅ **shortArduino1_2** — Bytebeat code variation
- ✅ **sloe_dub** — Bytebeat dub-style audio
- ✅ **stairstep_pot** — Bytebeat step pattern with knob control
- ✅ **two_controls_machine** — Bytebeat dual-control machine
- ✅ **delay_byte1** — Bytebeat delay/feedback experiment
- ⚠️ **CROWD_Make_compatible** — TVout video bytebeat *(requires TVout library)*

## Noise Generators

- ✅ **DeadCityRadio (LFO rate)** — White noise at LFO rates
  `community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_LFOrate/`
- ✅ **DeadCityRadio (audio rate)** — White noise at audio rates
  `community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_AudioRate/`
- ✅ **DeadCityRadio (clocked)** — Clock-timed white noise
  `community/asct/ASCTard011_DeadCityRadio/DeadCityRadio_Clocked/`
- ✅ **ARDCORE_NOISEMAKER** — Simple noise generator, multiplies knobs
  `snazzy_fx/EXPERIMENTAL_AUDIO/ARDCORE_NOISEMAKER/`
- ⚠️ **AC66_NOISE_BOMB** — Noise bomb with triggered playback *(`.pde`)*
  `snazzy_fx/dans_trashy_mods/AC66_NOISE_BOMB/`
- ✅ **SDIY_ARDCORE_NOISE** — White noise generator
  `snazzy_fx/WHITE_NOISE/SDIY_ARDCORE_NOISE/`

## Drums / Percussion

- ⚠️ **fac_drums** — Lo-fi drum sample player with 8 sounds *(`.pde`)*
  `snazzy_fx/fac_drums/`
- ⚠️ **stereo_beat_gen** — Stereo drum pattern generator
  `snazzy_fx/EXPERIMENTAL_AUDIO/stereo_beat_gen_pde/`

## Expander (Output Expander Required)

- ✅ **OX02 — Step Variation** — Step through 2D pattern for 8 gate outputs
  `official/OX02_StepVariation/`
- ✅ **OX03 — Analog Tracker** — Follow analog input with 8 gate outputs
  `official/OX03_AnalogTracker/`

## Compound (Multi-Sketch Selectors)

- ✅ **CP01 — Compound 01** — QuadSketch: VCADLoopEnv, Quantizer, DrunkenNote, SH101
  `official/CP01_Compound01/`
- ✅ **CP02 — Compound 02** — QuadSketch: VCADLoopEnv, ShapedLFO, DrunkenNote, SH101
  `official/CP02_Compound02/`

## MIDI

- ✅ **ASCTard013 — Midi2gates** — MIDI note-to-gates converter with divider
  `community/asct/ASCTard013_Midi2gates/`

## Experimental / Uncategorized

- ⚠️ **eq_freakoutCV_aduo** — Experimental noise/CV output modulator
  `snazzy_fx/CV-LFO_SKETCHES/Dans_freakoutCV_/`
- ✅ **TRAIN_ROBBER_NOISER** — Wild audio/CV output modulator
  `snazzy_fx/dans_trashy_mods/TRAIN_ROBBER_NOISER/`

## Templates / Tutorials

- ✅ **AC01 — Template** — Test fixture for module tuning and I/O verification
  `official/AC01_Template/`
- ✅ **SACS Standard** — Simplified serial communication protocol for ArdCore
  `official/SACS_Standard/`
- ✅ **ASCTard012 — BetaMax** — Max/MSP serial communication template
  `community/asct/ASCTard012_BetaMax/`
- ✅ **Tutorial: Port Manipulation** — Direct port register technique example
  `community/asct/ASCTard000_tutorials/Port_manipulation_tutorial/`
- ✅ **Tutorial: Expander** — Output expander feature demonstrations
  `community/asct/ASCTard000_tutorials/Ardcore_expander_tutorial/`
- ✅ **Tutorial: No Analog Read** — Fast direct ADC reading technique
  `community/asct/ASCTard000_tutorials/No_analog_read/`
- ✅ **INPUT_OUTPUT_TUTORIAL** — Basic I/O routing tutorial sketch
  `snazzy_fx/INPUT_OUTPUT_TUTORIAL/`
- ✅ **simple_template** — Template for bytebeat pattern experiments
  `snazzy_fx/BYTEBEAT_CV_and_AUDIO/simple_template/`
- **VCV_PORT_TEMPLATE** — VCV Rack → ArdCore porting template with checklist
  `templates/VCV_PORT_TEMPLATE.ino`

---

## Notes

- Sketches marked ⚠️ are in `scripts/verify-ignore.txt` — they fail to compile
  due to pre-1.0 `.pde` format, missing libraries, or API issues.
- Sketches marked *(`.pde`)* use the pre-Arduino 1.0 file extension.
  Rename to `.ino` and fix any `WProgram.h` → `Arduino.h` includes to convert.
- Sketches marked *(user port)* in `community/user_submitted/` are VCV Rack
  module ports. See source comments for original module credits and algorithm
  explanations.
- For compile verification of all sketches, see `scripts/verify-all.sh`.
- For porting new VCV modules, see `templates/VCV_PORT_TEMPLATE.ino`.
