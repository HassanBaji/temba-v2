# Series badge geometry

Extracted from `series-flow.source.html` line 83 (the live badge of screen 1b), so nobody has to read a 6,000-character line. This is the source for `packages/design-tokens/src/series.ts` (spec section 9, ADR-0106).

One `viewBox="0 0 120 120"`. Draw order: the hexagon, the emblem's shadow, the emblem.

## Tones

Every element paints one of four tones, as a Mark coin does:

| Tone    | Paints                                   | Value                         |
| ------- | ---------------------------------------- | ----------------------------- |
| `disc`  | the hexagon (fill and stroke)            | the colour's first value      |
| `shade` | the emblem's shadow                      | the colour's second value     |
| `paper` | the emblem's body (`#FFF` in the source) | `colors.paper`, both schemes  |
| `ink`   | the emblem's accents (`#000`)            | `colors.ink`, both schemes    |

## Colours

| Key      | Name   | `disc`    | `shade`   |
| -------- | ------ | --------- | --------- |
| `gold`   | Gold   | `#FFC233` | `#C98F0A` |
| `red`    | Red    | `#FF4D3D` | `#A8261A` |
| `blue`   | Blue   | `#3B6CFF` | `#1F42B8` |
| `green`  | Green  | `#34D17A` | `#178F4D` |
| `purple` | Purple | `#8B5CFF` | `#5A33C2` |
| `teal`   | Teal   | `#22C3B5` | `#137F75` |

Order is the picker's order. Gold is the default.

## Hexagon

```svg
<polygon points="60,8 105,34 105,86 60,112 15,86 15,34"
         fill="disc" stroke="disc" stroke-width="10" stroke-linejoin="round"/>
```

The stroke in the fill colour is what rounds the six corners.

## Emblems

Order is the picker's order. Cup is the default. In each block the `<g transform="translate(4 5)">` group is the shadow (`shade`); what follows is the emblem (`paper`, with `ink` accents).

### `cup` (Cup)

```svg
<g transform="translate(4 5)">
  <path d="M41 32 H79 V52 C79 66 71 75 60 75 C49 75 41 66 41 52 Z" fill="shade"/>
  <path d="M41 39 C27 39 28 58 43 60" fill="none" stroke="shade" stroke-width="6" stroke-linecap="round"/>
  <path d="M79 39 C93 39 92 58 77 60" fill="none" stroke="shade" stroke-width="6" stroke-linecap="round"/>
  <rect x="55" y="73" width="10" height="12" fill="shade"/>
  <rect x="43" y="83" width="34" height="9" rx="2" fill="shade"/>
</g>
<path d="M41 32 H79 V52 C79 66 71 75 60 75 C49 75 41 66 41 52 Z" fill="paper"/>
<path d="M41 39 C27 39 28 58 43 60" fill="none" stroke="paper" stroke-width="6" stroke-linecap="round"/>
<path d="M79 39 C93 39 92 58 77 60" fill="none" stroke="paper" stroke-width="6" stroke-linecap="round"/>
<rect x="55" y="73" width="10" height="12" fill="paper"/>
<rect x="43" y="83" width="34" height="9" rx="2" fill="ink"/>
```

### `crown` (Crown)

```svg
<g transform="translate(4 5)">
  <g transform="translate(60 62) scale(0.86) translate(-60 -60)">
    <path d="M30 78 L26 42 L45 57 L60 30 L75 57 L94 42 L90 78 Z" fill="shade" stroke="shade" stroke-width="3" stroke-linejoin="round"/>
    <rect x="29" y="78" width="62" height="12" rx="2" fill="shade"/>
    <circle cx="26" cy="41" r="5" fill="shade"/>
    <circle cx="60" cy="29" r="6" fill="shade"/>
    <circle cx="94" cy="41" r="5" fill="shade"/>
  </g>
</g>
<g transform="translate(60 62) scale(0.86) translate(-60 -60)">
  <path d="M30 78 L26 42 L45 57 L60 30 L75 57 L94 42 L90 78 Z" fill="paper" stroke="paper" stroke-width="3" stroke-linejoin="round"/>
  <rect x="29" y="78" width="62" height="12" rx="2" fill="ink"/>
  <circle cx="26" cy="41" r="5" fill="ink"/>
  <circle cx="60" cy="29" r="6" fill="ink"/>
  <circle cx="94" cy="41" r="5" fill="ink"/>
</g>
```

### `star` (Star)

```svg
<g transform="translate(4 5)">
  <polygon points="60.0,29.0 68.2,50.7 91.4,51.8 73.3,66.3 79.4,88.7 60.0,76.0 40.6,88.7 46.7,66.3 28.6,51.8 51.8,50.7" fill="shade" stroke="shade" stroke-width="4" stroke-linejoin="round"/>
</g>
<polygon points="60.0,29.0 68.2,50.7 91.4,51.8 73.3,66.3 79.4,88.7 60.0,76.0 40.6,88.7 46.7,66.3 28.6,51.8 51.8,50.7" fill="paper" stroke="paper" stroke-width="4" stroke-linejoin="round"/>
```

### `bolt` (Bolt)

```svg
<g transform="translate(4 5)">
  <polygon points="67,26 38,66 56,66 51,96 83,53 64,53" fill="shade" stroke="shade" stroke-width="4" stroke-linejoin="round"/>
</g>
<polygon points="67,26 38,66 56,66 51,96 83,53 64,53" fill="paper" stroke="paper" stroke-width="4" stroke-linejoin="round"/>
```

### `flame` (Flame)

```svg
<g transform="translate(4 5)">
  <path d="M61 26 C66 42 82 50 82 69 C82 84 72 94 60 94 C48 94 38 84 38 69 C38 59 44 52 49 44 C51 52 55 55 58 55 C56 45 58 34 61 26 Z" fill="shade"/>
</g>
<path d="M61 26 C66 42 82 50 82 69 C82 84 72 94 60 94 C48 94 38 84 38 69 C38 59 44 52 49 44 C51 52 55 55 58 55 C56 45 58 34 61 26 Z" fill="paper"/>
<path d="M60 68 C65 73 68 78 68 83 C68 88 64 91 60 91 C56 91 52 88 52 83 C52 78 56 74 60 68 Z" fill="ink"/>
```

### `moon` (Moon)

```svg
<g transform="translate(4 5)">
  <path d="M70 28 A33 33 0 1 0 92 76 A27 27 0 1 1 70 28 Z" fill="shade"/>
</g>
<path d="M70 28 A33 33 0 1 0 92 76 A27 27 0 1 1 70 28 Z" fill="paper"/>
<polygon points="79.0,35.0 81.4,40.8 87.6,41.2 82.8,45.2 84.3,51.3 79.0,48.0 73.7,51.3 75.2,45.2 70.4,41.2 76.6,40.8" fill="ink"/>
```

### `ball` (Ball)

```svg
<g transform="translate(4 5)">
  <circle cx="60" cy="61" r="30" fill="shade"/>
</g>
<circle cx="60" cy="61" r="30" fill="paper"/>
<path d="M31,61 C39,40 81,40 89,61" fill="none" stroke="ink" stroke-width="5"/>
```

## Sizes the design draws

| Token     | px  | Where                                                              |
| --------- | --- | ------------------------------------------------------------------ |
| `line`    | 22  | the series line on a Game's lifted card, the winner's table row    |
| `row`     | 28  | the picker's emblem chips                                          |
| `latest`  | 38  | the Latest row, the "how it sits on a profile" preview             |
| `list`    | 44  | the Group's Series tab, the Create picker, the "Part of" card      |
| `card`    | 60  | the profile's Series card                                          |
| `page`    | 76  | the Series page header                                             |
| `sheet`   | 84  | the winners card, the profile sheet                                |
| `preview` | 116 | the New series preview                                             |

The design also draws 34 and 40; they round to `latest` and `list`.

## Count pill

The win count on a profile badge (4a, 4b, 4c) sits on the badge's bottom trailing corner: `min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px; font-size: 11px; weight 600`, offset 6px outside the trailing edge and 2px below the bottom edge, with a 2px ring in the colour of the surface it sits on. Light: black pill, white digits. Dark: light pill, dark digits. In roles: fill `ink`, digits `paper`, ring the surface's own role. On the mobile App's focused surface, still inverted in light (ADR-0084), the pill takes the ink tone's roles: fill `onFocus`, digits and ring `focus`.
