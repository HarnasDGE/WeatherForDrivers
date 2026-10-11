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

## Tokens

| Token        | Light     | Dark      | Use                                                                 |
| ------------ | --------- | --------- | ------------------------------------------------------------------- |
| `--asphalt`  | `#262B33` | `#E9ECEF` | ink, the road band, primary text                                    |
| `--kerb`     | `#646C78` | `#9BA3AE` | secondary text                                                      |
| `--verge`    | `#EDF0F3` | `#262C34` | muted surfaces, inputs                                              |
| `--surface`  | `#FFFFFF` | `#1A1F25` | sheet, bars                                                         |
| `--marking`  | `#F4C20D` | `#F4C20D` | lane-marking yellow: primary action, "caution"                      |
| `--hazard`   | `#D23C2F` | `#FF6B5E` | "danger" conditions                                                 |
| `--clear`    | `#1D8A6B` | `#4CC9A4` | "good" conditions                                                   |

Dark mode follows the system setting (night driving). Its background is a blue-grey asphalt, not black.

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
- Corner radius follows hierarchy: the sheet is 22px, the trip card 16px, chips are fully rounded, list rows have no radius.

## Motion

- Only one moment runs without user input: while a route is loading, the centre line of the road strip scrolls, as if driving. It is disabled when `prefers-reduced-motion` is set.
- The sheet snaps between peek, half and full. Everything else is instant.

## Copy

- Plain verbs, sentence case. Say what a button does: "Check route", "Save route".
- Conditions are named from the driver's point of view: "Wet road", "Ice risk", "Low visibility", rather than meteorological terms.

## Rejected defaults

- Identical rounded cards for each route option. Route options are list rows; the selected row gets the marking-yellow edge.
- A gradient hero and a photo background (both were in the old app). The map is the hero.
- A near-black background with a single acid accent. The dark mode uses blue-grey asphalt, and three condition colours carry the meaning.
