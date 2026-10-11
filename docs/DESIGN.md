# Design notes

Written with the `frontend-design` skill (`.claude/skills/frontend-design`). Update this file when the visual system changes.

## Brief

- **Subject:** weather along a driving route, plus a forecast for a single place.
- **Audience:** drivers planning a trip on a phone, often a quick look before leaving, sometimes at night.
- **Primary job:** answer "is the drive OK, and where does it get bad?" in one glance.

## Direction: road furniture

The visual language comes from the road itself: asphalt, lane markings and highway signage.

- The **road strip** is the one memorable element. The route is drawn as a road both on the map (dark casing, dashed centre line) and in the timeline (a vertical asphalt band with a dashed centre line). Checkpoints sit on that road. Where conditions get worse, the band's edge line turns amber or red.
- Everything around it stays quiet: white surfaces, plain lists, very few borders.

## Themes and tokens

Two themes, light and dark, switched in the bottom nav (Auto follows the system). `<html data-theme>` selects
the token set; an inline script in `BaseLayout.astro` sets it before first paint. All tokens live in
`src/styles/tokens.css`.

| Token            | Light     | Dark      | Use                                                     |
| ---------------- | --------- | --------- | ------------------------------------------------------- |
| `--asphalt`      | `#1F242C` | `#E8EBF0` | ink, primary text                                       |
| `--kerb`         | `#5F6875` | `#9AA3B0` | secondary text                                          |
| `--verge`        | `#EEF1F5` | `#232A33` | muted surfaces, inputs                                  |
| `--surface`      | `#FFFFFF` | `#181D24` | sheet, bars                                             |
| `--accent`       | `#2457D6` | `#7AA2FF` | motorway-sign blue: selection, focus, links, active tab |
| `--marking`      | `#F5C211` | `#F5C211` | lane-marking yellow: primary action, "caution"          |
| `--hazard`       | `#D23C2F` | `#FF6B5E` | "danger" conditions                                     |
| `--clear`        | `#12805F` | `#45C79F` | "good" conditions                                       |
| `--road`         | `#3A414B` | `#4A535F` | the road by day                                         |
| `--night`        | `#2F2A78` | `#4A43B8` | the road in the dark, night plates, the dark share      |
| `--daylight`     | `#F8DF8B` | `#A8913D` | the daylight share                                      |

- **Elevation:** layered soft shadows `--shadow-sm/md/lg/sheet`. Dark mode adds a hairline ring instead of relying on shadow alone.
- **Shapes:** sheet 28px, cards and groups 20px, fields 14px, chips and the active-tab pill fully rounded.

## Day and night

Driving in the dark is marked the same way everywhere:
- on the map, the main route turns indigo, and checkpoints reached at night get indigo plates;
- in the timeline, night rows have an indigo road and a moon by the time. A "Sunset" or "Sunrise" row sits where the light changes, and the band fades between the two colours;
- under the verdict, a bar shows the daylight vs dark share of the drive, plus one sentence on when it gets dark.

## Type

- **Overpass**, a typeface derived from Highway Gothic (US road signs). One family only.
  - Headings and big numbers: weight 800, tight tracking.
  - Body text: weight 400 or 600.
  - Times, temperatures and distances use `font-variant-numeric: tabular-nums`, so columns line up.
- Scale: 13 / 15 / 17 / 22 / 34 / 56 px.
- No all-caps labels, no monospace, no eyebrows above headings.

## Layout

```
Mobile (default)                 >= 900px
┌───────────────────┐            ┌────────┬──────────────────┐
│ ┌───────────────┐ │            │ trip   │                  │
│ │ ● From        │ │  trip card │ card   │                  │
│ │ ■ Where to?   │ │            │────────│       MAP        │
│ └───────────────┘ │            │ panel  │                  │
│        MAP        │            │ (sheet │                  │
│                   │            │ content│                  │
├───────────────────┤ bottom     │  )     │                  │
│ ───               │ sheet      │        │                  │
│ route options     │ (peek /    ├────────┤                  │
│ road timeline     │  half /    │ nav    │                  │
├───────────────────┤  full)     └────────┴──────────────────┘
│  Drive  Forecast  │ bottom nav
└───────────────────┘
```

- Content is left-aligned. Numbers in the timeline are right-aligned against the road band.
- Corner radius follows hierarchy (see Themes and tokens). Route options form one rounded group with hairline dividers.

## Motion

- Only one moment runs without user input: while a route is loading, the centre line of the road strip scrolls, as if driving. It is disabled when `prefers-reduced-motion` is set.
- The Forecast screen has a live sky behind its content (`WeatherBackdrop`, canvas): rain or snow falling with the wind, drifting clouds or fog, lightning in storms, stars at night, a soft sun on clear days. It follows the current hour, pauses while the tab is hidden, and is a still frame with reduced motion.
- The sheet snaps between peek, half and full. Everything else is instant.
- The document never scrolls (the body is fixed). Only inner panels scroll, so mobile browsers cannot slide the trip bar, the search or the bottom nav away.

## Copy

- Plain verbs, sentence case. Say what a button does: "Check route", "Save route".
- Conditions are named from the driver's point of view: "Wet road", "Ice risk", "Low visibility", rather than meteorological terms.

## Rejected defaults

- Identical rounded cards for each route option. Route options are rows in one group; the selected row gets an accent tint and edge.
- A gradient hero and a photo background (both were in the old app). The map is the hero.
- A near-black background with a single acid accent. The dark mode uses blue-grey asphalt, and three condition colours carry the meaning.
