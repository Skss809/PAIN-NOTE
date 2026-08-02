---
name: Midnight Executive
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#20201f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#f0ecec'
  on-tertiary: '#313030'
  tertiary-container: '#d3d0cf'
  on-tertiary-container: '#5a5959'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c9c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  section-gap: 48px
---

## Brand & Style
The design system embodies the "Midnight Executive" aesthetic—a high-performance, professional environment that feels both exclusive and technologically advanced. It is tailored for business leaders and power users who require a focused, distraction-free interface that exudes authority and precision.

The style is a hybrid of **Minimalism** and **Glassmorphism**. It utilizes an "Obsidian" foundation—deep black surfaces that provide infinite depth—contrasted with razor-sharp white typography. Translucent layers and microscopic borders create a sense of physical hardware, mimicking high-end glass and carbon-fiber executive tools. The emotional response is one of calm control, premium quality, and cutting-edge reliability.

## Colors
This design system utilizes a high-contrast, dark-first palette to maximize legibility and visual impact.

- **Surface Primary (#000000):** The absolute base layer. Used for the main background to create an "infinite" depth effect.
- **Surface Secondary (#0A0A0A):** The primary container color. Used for cards and navigation panels to subtly distinguish them from the void.
- **Action Primary (#00E5FF):** An electric, neon cyan used sparingly for critical calls to action, active states, and data highlights.
- **Text Primary (#FFFFFF):** Pure white for maximum readability against the obsidian backdrop.
- **Text Secondary (#A1A1AA):** A muted zinc for metadata and deactivated states.
- **Border Subtle (#262626):** A low-opacity grey used for the "glass" hairline strokes.

## Typography
The typography strategy prioritizes clarity and a "tech-forward" feel. 

- **Headlines:** Uses **Hanken Grotesk**. Its sharp, contemporary geometry feels architectural and professional.
- **Body:** Uses **Inter**. Chosen for its exceptional legibility in data-dense business environments and its neutral, systematic tone.
- **Data & Labels:** Uses **JetBrains Mono**. This monospaced font is used for numerical data, status labels, and IDs to evoke a sense of precision and "under-the-hood" technical power.

## Layout & Spacing
The design system employs a **Fixed Grid** philosophy for desktop to maintain an organized, dashboard-like structure, transitioning to a **Fluid Grid** for mobile devices.

- **Desktop:** 12-column grid with a max-width of 1440px. Gutters are kept tight (16px) to maintain a dense, professional information density.
- **Margins:** Large outer margins (24px to 48px) create a "framed" look, making the content feel like a high-end display.
- **Rhythm:** An 8px linear scale is used for all internal component spacing, ensuring consistent vertical rhythm across data tables and forms.

## Elevation & Depth
In this design system, depth is communicated through **translucency and borders** rather than traditional shadows.

1.  **Level 0 (Base):** Pure #000000.
2.  **Level 1 (Cards/Panels):** #0A0A0A with a 1px solid border of #262626.
3.  **Level 2 (Overlays/Modals):** A semi-transparent background (RGBA 10, 10, 10, 0.8) with a 20px Backdrop Blur (Glassmorphism). 
4.  **Accents:** A subtle "inner glow" using a 1px top-border of higher opacity (#404040) is used to simulate light catching the edge of a glass pane. Shadows are strictly limited to a very soft, large-radius black glow (0px 20px 40px rgba(0,0,0,0.5)) to separate floating elements from the background.

## Shapes
The shape language is disciplined and geometric. 

- **Components:** Standard buttons, input fields, and chips use a **0.5rem (8px)** corner radius. This offers a "soft-tech" feel that is professional but not aggressive.
- **Containers:** Large layout containers and cards also follow the **8px** rule to maintain a uniform structural grid.
- **Interactive States:** On hover, borders may transition from #262626 to the Primary Action color (#00E5FF) to provide crisp, high-contrast feedback.

## Components
- **Buttons:** Primary buttons are solid #FFFFFF with #000000 text for maximum contrast. Secondary buttons are outlined with #262626. The "Action" button variant uses the Electric Blue (#00E5FF) background.
- **Input Fields:** Dark #0A0A0A backgrounds with a 1px border. On focus, the border glows with the Primary Action color. Labels use the monospaced font for a "systemized" look.
- **Cards:** Glassmorphic containers with 1px borders. Content is grouped with generous internal padding (24px).
- **Chips/Badges:** Small, pill-shaped elements using the monospaced label font. Used for status indicators (e.g., "ACTIVE", "PENDING").
- **Data Tables:** High-density layouts with no vertical dividers; only subtle horizontal rules in #1A1A1A. Hover states on rows should slightly brighten the background to #111111.
- **Navigation:** A collapsed sidebar or top bar using a high-blur glass effect to keep the focus on the primary workspace data.