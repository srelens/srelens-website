---
name: srelens
description: Enterprise operations brief for the local-first Kubernetes control room
colors:
  control-violet: "#6d44c5"
  control-violet-deep: "#5834a9"
  success: "#137a56"
  paper: "#f7f5fa"
  paper-raised: "#ffffff"
  paper-inset: "#f1edf6"
  ink: "#21192c"
  ink-secondary: "#554a61"
  ink-muted: "#786c82"
  night: "#0d0b14"
  night-raised: "#17131f"
  warning: "#a86108"
  critical: "#b43d35"
typography:
  display:
    fontFamily: "Archivo, Arial Narrow, ui-sans-serif, sans-serif"
    fontSize: "clamp(48px, 7.2vw, 86px)"
    fontWeight: 650
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Archivo, Arial Narrow, ui-sans-serif, sans-serif"
    fontSize: "clamp(34px, 4.7vw, 58px)"
    fontWeight: 650
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.58
  data:
    fontFamily: "JetBrains Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  control: "3px"
  surface: "5px"
  large-surface: "8px"
spacing:
  control-x: "17px"
  control-y: "10px"
  section-min: "64px"
  section-max: "104px"
components:
  button-primary:
    backgroundColor: "{colors.control-violet}"
    textColor: "{colors.paper-raised}"
    rounded: "{rounded.control}"
    padding: "{spacing.control-y} {spacing.control-x}"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "{spacing.control-y} {spacing.control-x}"
    height: "44px"
---

# Design System: srelens

## Overview

**Creative North Star: "The Operations Brief"**

srelens uses the language of mature infrastructure operations: change-control
records, status boards, incident packets, and precise product evidence. It is
quiet, information-dense, and direct. The website avoids theatrical tech
effects and lets the real application carry the product story.

The logo-derived violet system is light-dominant but maintains a fully considered dark mode for
engineers working in low-light environments. Hierarchy comes from type scale,
drafting lines, spacing, and state color rather than decoration.

**Key Characteristics:**

- Real product captures are the primary visual evidence.
- Compact technical panels keep repeated content dense and scannable.
- Blueprint geometry appears as restrained structural annotation, never texture.
- Violet communicates brand and primary action; green is reserved for success.
- Dense technical content remains calm through strong alignment and whitespace.
- Motion is reserved for the initial reveal of the product evidence.

## Colors

The palette pairs cool violet-tinted paper with plum ink and a restrained
logo-derived violet. Green, amber, and red remain semantic and scarce.

### Primary

- **Control Violet:** Primary actions, active comparison emphasis,
  and the homepage status rail.
- **Deep Control Violet:** Primary-button hover and high-contrast active state.
- **Success Green:** Ready, healthy, or completed states only.

### Neutral

- **Operational Paper / Raised Paper / Inset Paper:** Page, evidence, and
  grouped-content surfaces in light mode.
- **Operational Ink / Secondary Ink / Muted Ink:** Headings, body copy, and
  data annotations.
- **Night / Night Raised:** Low-light page and elevated surfaces.

### Named Rules

**The Status Color Rule.** Green, amber, and red describe state. Violet carries
brand and primary action. None becomes ambient decoration.

**The Paper and Ink Rule.** Large regions are neutral. Color earns attention
through operational meaning.

## Typography

**Display Font:** Archivo
**Body Font:** Source Sans 3
**Data Font:** JetBrains Mono

**Character:** Archivo gives headings an authoritative, engineered width
without becoming corporate-neutral. Source Sans 3 keeps long technical copy
open and readable. JetBrains Mono appears only where text represents data,
commands, versions, paths, or measured state.

### Hierarchy

- **Display:** Homepage thesis only, compressed line-height and restrained
  negative tracking.
- **Headline:** Page and section headings.
- **Title:** Feature, comparison, and capability names.
- **Body:** Technical explanation with a target measure of 65–75 characters.
- **Data:** Status labels, platform details, versions, and code.

### Named Rules

**The Instrument Type Rule.** Monospace describes a machine-readable value.
It is never used merely to make an element feel technical.

## Layout

The maximum content width is 1240px with fluid 20–48px side padding. Sections
are separated by full-width rules and use a responsive 64–104px vertical
interval. The homepage opens as a two-column operational brief: thesis and
actions on the left, an interactive incident drill on the right.

Feature explanations use a four-to-eight-column editorial split with sticky
copy and large product evidence. Capability, download, workflow, and comparison
groups use compact, evenly spaced panels. At 920px these simplify to two columns; at 720px
they become single-column flows with navigation links collapsed.

## Elevation & Depth

The system is flat by default. Borders and tonal changes establish grouping.
Only real product screenshots receive a soft, offset shadow to separate the
captured application from the page. No colored glows or glass effects are part
of the system.

**The Evidence Elevation Rule.** Shadows are reserved for actual captured
product surfaces. Marketing containers remain flat.

## Shapes

Controls use tight 3px corners. Screenshot and code surfaces use 4–5px corners.
Large grouped surfaces never exceed 8px. Repeated content uses shallow,
bordered panels with drafting marks rather than oversized empty cells.

## Components

### Buttons

- **Shape:** Compact rectangular control with 3px corners and a 44px minimum
  height.
- **Primary:** Solid control violet with light text.
- **Hover / Focus:** Darker violet on hover; a two-pixel visible focus outline.
- **Secondary:** Transparent with a structural border and tonal hover.

### Cards / Containers

- **Corner Style:** Tight 6px corners on repeated technical panels.
- **Background:** Raised paper or night-raised surface.
- **Shadow Strategy:** None.
- **Border:** One-pixel structural outline with stronger hover contrast.
- **Internal Padding:** 22–26px depending on density.

### Navigation

Navigation is a 70px sticky bar with a structural lower rule. Links are compact,
sentence case, and use a tonal rectangle for hover and active state. GitHub is
a bordered utility action rather than the primary conversion.

### Incident Drill

The homepage incident drill is the signature component. It lets an operator
move through signal, diagnosis, and guarded action using accessible tabs. Each
step shows only the state needed for the next decision.

## Do's and Don'ts

### Do:

- **Do** lead with real application captures and specific workflow copy.
- **Do** use compact bordered panels to organize repeated information.
- **Do** use blueprint geometry sparingly to reinforce engineered precision.
- **Do** keep technical labels compact and meaningful.
- **Do** preserve semantic status colors and visible focus.
- **Do** maintain equal hierarchy quality in light and dark themes.

### Don't:

- **Don't** use gradient text, colored glows, aurora backgrounds, or decorative
  glass.
- **Don't** inflate feature or comparison panels with decorative empty space.
- **Don't** add customer proof, benchmarks, or enterprise claims without real
  evidence.
- **Don't** use monospace, pills, or uppercase labels as generic technical
  decoration.
- **Don't** introduce animated entrances throughout the page; one evidence
  reveal is the motion system.
