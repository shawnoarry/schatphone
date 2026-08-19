# Built-in ringtone sources

All call-ringtone files in this directory are rendered in-repo by `scripts/build-ringtones.mjs` (pure Node synthesis, no external audio sources):

- `gran-vals.wav`: an original plucked rendering of a public-domain excerpt from Francisco Tárrega's *Gran Vals* (composition in the public domain; the performer is this script's Karplus-Strong synthesis). It deliberately does not reuse any vendor's copyrighted recording of this melody.
- `morning-marimba.wav`: original marimba melody composed for this project.
- `soft-piano.wav`: original piano arpeggio composed for this project.
- `classic-bell.wav`: original synthesis of an electromechanical telephone bell cadence.
- `digital-early.wav`: original square-wave melody in an early feature-phone style.
- `gentle-chime.wav`: original glockenspiel chime sequence.

Rebuild with `node scripts/build-ringtones.mjs`. These files contain no third-party audio; no attribution is required.
