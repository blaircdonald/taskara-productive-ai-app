# Taskara Cozy UI Theme

## Product Feel

Taskara should feel like a calm creative workspace: clean enough for daily task management, warm enough for writing and thinking, and flexible enough for visual whiteboard workflows. The interface should avoid heavy decoration, dark corporate surfaces, and loud gradients. Use subtle warmth, soft depth, colorful icons, and clear hierarchy.

## Color Palette

- App surface: `#f7f0e6`, a warm paper background for full-page layouts.
- Primary text: `hsl(24 22% 12%)`, near-black with a warm undertone.
- Secondary text: `hsl(25 11% 41%)`, readable muted brown-gray.
- Cards and panels: `hsl(36 45% 98%)` or translucent white over the app surface.
- Borders: `hsl(31 25% 83%)`, soft and low contrast.
- Primary action: `#a54f36`, a warm clay/terracotta with white text; hover with `#91432e`.
- Accent: `hsl(42 88% 62%)`, used for highlights, focus, and AI warmth.
- Supporting icon accents: amber, violet, teal, blue, pink, green, orange, and slate.

## Typography

- Use system sans fonts by default: Inter when available, then platform UI fonts.
- Page titles should be confident but not oversized in app views.
- Compact surfaces like sidebars, cards, toolbars, and dashboards should use small, crisp labels.
- Keep letter spacing neutral. Do not rely on compressed tracking for polish.
- Prefer short, direct labels over explanatory interface copy.

## Layout And Spacing

- Sidebar expanded width: about `280px`; collapsed width: about `84px`.
- Use 8px rhythm for spacing. Common values: `8`, `12`, `16`, `20`, `24`, `32`.
- Use cards only for discrete repeated objects, panels, modals, and framed tools.
- Do not nest cards inside cards.
- Dashboard content should be dense enough for scanning but leave breathing room around major sections.

## Shape And Depth

- Default radius: `12px`.
- Larger dashboard panels may use `16px`.
- Icon containers and controls should stay compact and predictable.
- Use soft, warm shadows sparingly: enough to separate surfaces, not enough to feel decorative.

## Sidebar Guidelines

- Header contains the Taskara logo mark and app name in expanded mode.
- Collapsed mode shows icons only and preserves accessible labels through `aria-label` and `title`.
- Group navigation under short labels such as Workspace, Create, and System.
- Menu icons must use Lucide React icons and each major section should have a distinct color.
- Active navigation should be obvious through background, text contrast, and icon treatment.
- Footer should remain useful in both expanded and collapsed states.

## Interaction Guidelines

- Controls should have clear hover and focus states.
- Use icon buttons for compact actions and text buttons for primary commands.
- Avoid shifting layout when labels hide, panels resize, or hover states appear.
- Keep mobile and narrow viewport behavior readable with no overlapping text or controls.
