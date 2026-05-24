# filedeadrop — Design

## Fonts
- Inter for all text (Google Fonts)
- JetBrains Mono for labels, codes, region selectors, step numbers

## Colors
- Background:       #F3F3F1
- Text:             #111111
- Secondary text:   #666666
- Muted text:       #BABAB4
- Border:           #DDDDD8
- Surface (cards):  #FAFAF8
- Dark surface:     #111111
- Accent:           #111111

## Base
- Font size:        16px
- Line height:      1.65
- Content width:    720px centered
- Side padding:     48px (24px mobile)

## Rules
- CSS Modules only, no component libraries, no Tailwind
- No gradients, shadows (except upload container: 0 1px 3px rgba(0,0,0,0.05)), or animations
- No centered body text
- Spacing in multiples of 8px only
- Borders: 1px solid #DDDDD8 only