# ArdCore Sketches

A unified collection of Arduino sketches for the [SnazzyFX ArdCore](http://snazzyfx.com/) eurorack module.

## Directory Structure

### `official/`
The original 20 Objects sketch library by Darwin Grosse. Includes core modules (AC01-AC32), compound sketches (CP01-CP02), and expander sketches (OX01-OX04).

Source: [darwingrosse/ArdCore-Code](https://github.com/darwingrosse/ArdCore-Code)

### `snazzy_fx/`
Sketches from Snazzy FX and collaborators, including FAC drum machines, FM oscillators, bytebeat generators, LFSRs, and various experimental audio sketches.

Source: [darwingrosse/ArdCore-Code](https://github.com/darwingrosse/ArdCore-Code) (Snazzy_FX directory)

### `community/asct/`
Sketches by Ascetic (twhiston): analytic geometry sequencer, CV scaler, gate counter, burst generator, noise generators, phase patterns, MIDI-to-gates, and more.

Source: [twhiston/asct-ardcore](https://github.com/twhiston/asct-ardcore)

### `community/user_submitted/`
User-contributed sketches.

### `libraries/`
Shared Arduino libraries for ArdCore development.

### `templates/`
VCV Rack → ArdCore porting template with structured checklist and boilerplate.

### `scripts/`
Build/verify tooling. `verify-all.sh` compiles all sketches via `arduino-cli`.

## Documentation

- **[CATALOG.md](CATALOG.md)** — Functional index of all 152 sketches, grouped by category
- **[TUTORIAL.md](TUTORIAL.md)** — ArdCore development guide (hardware, pin mapping, DAC, ISR)
- **[ardcore_exploration.md](ardcore_exploration.md)** — DSP technique catalog for the platform
- **[tinydvco_to_ardcore_port.md](tinydvco_to_ardcore_port.md)** — ATtiny85 → ArdCore porting guide

## See Also

- [thedug/thedug_ardcore](https://github.com/thedug/thedug_ardcore) - Douglas Ferguson's sketches (arpeggiator, etc.)
