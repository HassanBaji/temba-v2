// Every cue in seconds. The composition (main.js) and the music bed
// (music/score.py) both read this block, so a change here moves picture
// and sound together. The block between the braces must stay valid JSON.
window.TIMING = {
  "fps": 30,
  "duration": 20,
  "bpm": 120,

  "introFirstWord": 0.5,
  "introWordStep": 0.25,
  "irisStart": 2.5,
  "irisEnd": 3.0,

  "cardBuild": 3.0,
  "coinEnter": 4.0,
  "coinLand": 5.0,
  "headline": 5.5,
  "subline": 5.75,
  "pushOut": 6.75,

  "montageStart": 7.0,
  "montageStep": 1.0,
  "montageLand": [0.25, 0.3, 0.35, 0.25, 0.3, 0.55],

  "cabinetStart": 13.0,
  "dropFirst": 13.25,
  "dropStep": 0.25,
  "cabinetSilence": 15.875,

  "outroStart": 16.0,
  "outroStep": 0.5,

  "endStart": 18.0
};
