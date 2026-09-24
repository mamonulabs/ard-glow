# ArdCore Sketches

Sketches for the [Snazzy FX ArdCore](http://snazzyfx.com/), the eurorack module with an Arduino Nano inside. They come from Darwin Grosse's original 20 Objects library, from Dan Snazelle and friends at Snazzy FX, and from ArdCore users.

The originals are kept as they were written, bugs included. Where a sketch had a bug worth fixing, there's a copy next to it with `_fixed` on the end, and a comment at the top of that copy says what was wrong and what changed.

## What's where

`official/` is Darwin Grosse's 20 Objects library: AC01 to AC32, the compound sketches CP01 and CP02, and the output expander sketches OX01 to OX04. Source: [darwingrosse/ArdCore-Code](https://github.com/darwingrosse/ArdCore-Code).

`snazzy_fx/` is the Snazzy FX folder from the same repo: Alfonso Alba's FM oscillator and drum player, bytebeats, LFSR noise, delays and a lot of Dan Snazelle's experiments.

`community/asct/` is the set by Ascetic (twhiston): analytic geometry sequencer, CV scaler, gate counter, burst generator, noise, phase patterns, MIDI to gates and more. Source: [twhiston/asct-ardcore](https://github.com/twhiston/asct-ardcore).

`community/user_submitted/` holds sketches sent in by users: AC33 to AC38 and a VC LFO.

`libraries/` is a placeholder with a link to Arduino's guide on installing libraries.

`templates/` has `VCV_PORT_TEMPLATE.ino`, a template for porting VCV Rack modules to the ArdCore, with a checklist.

`scripts/` has the build tooling. `verify-all.sh` compiles every sketch with `arduino-cli`. Sketches listed in `verify-ignore.txt` are skipped.

`docs/` is the website: the panel, the sketch catalog with what every control does, and the history.

## Reading

- [CATALOG.md](CATALOG.md): all 165 sketches, grouped by what they do.
- [TUTORIAL.md](TUTORIAL.md): how to write a sketch. Pins, DAC, clock interrupt, the usual patterns.
- [ardcore_exploration.md](ardcore_exploration.md): the synthesis and DSP tricks used across the repo, with the sketch each one is in.
- [tinydvco_to_ardcore_port.md](tinydvco_to_ardcore_port.md): how the tinydvco wavetable oscillator was moved from an ATtiny85 to the ArdCore. The result is AC33.

## See also

- [thedug/thedug_ardcore](https://github.com/thedug/thedug_ardcore): Douglas Ferguson's sketches, including an arpeggiator.
