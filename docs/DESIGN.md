# DESIGN.md: Galmee Hotel

Change this file first, then the code.

## Brief

- **Subject:** the front desk of a small guesthouse in Shashamane. A rack of room keys on brass hooks, a paper register, a receptionist answering the phone while a guest waits.
- **Audience:** receptionist (checks guests in and out, one thumb, all day) and owner (checks occupancy and the money at night).
- **Primary job:** see which rooms are free in two seconds, and never sell the same room twice.

## Colour

| Token | Hex | Role |
| --- | --- | --- |
| `--night` | `#232C5E` | Dominant. The night-porter blue: header bar, primary action, occupied rooms. White on it is 11.9:1. |
| `--sheet` | `#F5F6F9` | Page background, cool white of a clean bed sheet. |
| `--ink` | `#171C33` | Text. |
| `--rule` | `#D9DDE8` | Grid lines and borders. |
| `--brass` | `#8A5A0B` | Accent, the key-hook brass. Reserved rooms. 5.6:1 on white. |
| `--owed` | `#B42318` | Money owed, errors, rooms out of service. 6.6:1 on white. |

Room status is never colour alone: occupied bars carry the guest's name, reserved bars add a clock icon and a hatched left edge, due-out bars add a door icon, out-of-service rooms show a wrench and stripes.

## Type

- **Lexend** (English and Afaan Oromo): wide, open letterforms that hold up at small sizes on a cheap screen. Numbers are set with tabular figures (`.num`).
- **Noto Sans Ethiopic** for Amharic, 400/600.
- Self-hosted with `next/font/local`; both work offline.
- Scale: 14 / 16 / 20 / 24. Room numbers on the board are 16 semibold.

## Layout (360 px first)

```
+----------------------------+
| Hotel name       [lang][x] |  night header
+----------------------------+
| Tir 28 2019  [<] [today][>]|
| In-house 12  Arrive 3 Free 5|
+----+---+---+---+---+---+---+
| 101|Abebe.......|   | Sara |  key-tag column stays pinned,
| 102|   |▨Chaltu.... |      |  days scroll sideways inside
| 103|###### wrench ######## |  the board, never the page
+----+---+---+---+---+---+---+
|         [ New stay ]       |  sticky above tab bar
+----------------------------+
|  Rooms Stays Guests Req Rep|
+----------------------------+
```

Desktop: sidebar left, the board shows all 14 days without scrolling.

## The one bold thing

The room board itself: a pinned column of key tags (room number with a brass hole) against full-width night-blue stay bars. Everything else stays quiet: flat cards, hairline rules, no shadows beyond the header.

## Reviewed against generic defaults

Not cream and terracotta, no gradient washes, no ALL-CAPS eyebrow labels, no identical rounded cards with soft shadows. Radius stays small (6 px) so the board reads like a printed register.
