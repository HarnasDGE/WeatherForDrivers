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

## Tabs

Drive, When, Sun & wind, Forecast, plus the theme switch: five items in the bottom bar.
- **When:** a bar per departure (now plus the next 24 full hours). Height is calmness, scaled between the best and worst departure. Colour is the worst condition, and a two-tone strip shows the dark share. The best one is outlined and preselected, with the recommendation card above.
- **Sun & wind:** a strip map with two lanes (sun in your eyes, crosswind) over the trip length, using the same road band and dashed centre line, then a list of stretches with time, km range and one practical tip per kind.

## Planner extras

Empty planner field shows a Recent list (history icon, same rows as place suggestions, plain Clear text button). The trip header has a share icon next to save and refresh; without Web Share it copies the link and says "Link copied".

## Map and timeline linked

- Tapping a checkpoint row (the whole row is a button) pans and zooms the map so the checkpoint sits in the free area between the trip bar and the sheet, and gives its sign an accent ring and a larger plate, even when zoom-based culling would hide it. A full sheet drops to half so the map is visible.
- Tapping a sign on the map (signs are focusable buttons) opens a peeking sheet to half, scrolls the timeline to that row and flashes it; the row stays outlined in the accent colour while it is focused. Tapping the map, another route or a new route clears the focus. Reduced motion: no smooth scroll, no pan animation, no flash.

## Rain radar

A white pill with the `radar` icon, labelled "Radar", floats under the trip bar on phones (right-aligned, clear of the sheet) and in the top-right corner of the map on desktop. Off by default; the choice is remembered. When on, it turns accent blue and reads "Radar 14:20" (frame time); the icon pulses while the first frame loads, and a failed load shows a notification. The tiles sit at 65% opacity above the basemap and below the routes, signs and place names; the credit "Weather data by RainViewer" is part of the map's attribution line.

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
