# Design System Documentation: The Living Kitchen

## 1. Overview & Creative North Star
### Creative North Star: "The Curated Greenhouse"
This design system moves beyond the utility of a standard tracker to create an experience that feels like a premium digital wellness journal. We are rejecting the "clinical" look of traditional health apps in favor of a **High-End Editorial** aesthetic. 

The "Curated Greenhouse" philosophy focuses on breathing room, organic depth, and intentional asymmetry. We break the rigid, boxed-in grid by using overlapping elements and shifting tonal planes. The goal is to make food management feel like an act of self-care, not a data-entry chore. We achieve this through "The Layering Principle"—where hierarchy is defined by light and material rather than lines and boxes.

---

## 2. Colors
Our palette is rooted in vitality. We use `primary` (#006e1c) and `primary_container` (#4caf50) not just as accents, but as environmental markers.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts. Use `surface_container_low` sections sitting on a `surface` background to define regions. 

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine vellum paper. 
- **Base Layer:** `surface` (#f8f9fa)
- **Secondary Regions:** `surface_container_low` (#f3f4f5)
- **Actionable Cards:** `surface_container_lowest` (#ffffff)
- **Interactive Overlays:** `surface_bright` with Glassmorphism.

### The "Glass & Gradient" Rule
To escape the "flat" look, use Glassmorphism for floating elements (like meal-log drawers or navigation bars) by applying `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur. 
**Signature Texture:** Use a subtle linear gradient from `primary` to `primary_container` (at a 135-degree angle) for high-impact CTAs to provide a lush, professional "soul."

---

## 3. Typography
We utilize a dual-typeface system to balance editorial authority with functional clarity.

*   **Display & Headline (Plus Jakarta Sans):** These are our "Voice" tokens. Use `display-lg` and `headline-md` with tight tracking (-0.02em) to create a sophisticated, high-end magazine feel.
*   **Body & Labels (Inter):** Our "Utility" tokens. Inter provides maximum legibility for nutritional data. 

**Hierarchy as Identity:** 
Always pair a large `headline-lg` (e.g., a daily calorie count) with a much smaller, uppercase `label-md` (e.g., "REMAINING CALORIES"). This high-contrast scale creates a premium rhythmic flow that guides the eye naturally through complex data.

---

## 4. Elevation & Depth
In this system, depth is a result of **Tonal Layering**, not structural scaffolding.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. This creates a "soft lift." 
*   **Ambient Shadows:** For floating elements (Modals, Popovers), use a shadow color tinted with `on_surface` (191c1d) at 5% opacity, with a 32px blur and 16px Y-offset. It should feel like a cloud, not a drop-shadow.
*   **The "Ghost Border" Fallback:** If a container requires more definition (e.g., in high-glare environments), use the `outline_variant` token at 15% opacity. Never use 100% opaque borders.
*   **Glassmorphism:** Use semi-transparent `surface_variant` for inactive floating states to allow the vibrant food photography or data viz to bleed through, softening the layout's edges.

---

## 5. Components

### Cards & Lists
*   **Forbid Divider Lines:** Use vertical white space (1.5rem or 2rem) or a shift from `surface_container` to `surface_container_high` to separate list items.
*   **Cards:** Use `rounded-xl` (1.5rem) for main meal cards. Content should have generous internal padding (2rem) to feel premium.

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. `rounded-full` for a friendly, organic feel. 
*   **Secondary:** `secondary_container` background with `on_secondary_container` text. No border.
*   **Tertiary:** Text-only using `primary` color, with a `surface_variant` hover state.

### Food Tracking Inputs
*   **Ghost Fields:** Input fields should not have a bottom line or full box. Use `surface_container_high` as a solid background fill with a `rounded-md` corner. On focus, transition the background to `surface_container_lowest` with a subtle `primary` ghost-border (20% opacity).

### Data Visualization (The "Vibrant Progress" Component)
*   Instead of thin lines, use thick, `rounded-full` bars for macro-nutrients. Use `primary` for protein, `secondary` for carbs, and `tertiary` for fats. Ensure the "track" of the bar uses `surface_container_highest` to maintain the layered look.

---

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place a large headline on the left and a small action chip offset to the right.
*   **Embrace Whitespace:** If you think there's enough space, add 8px more. Modern premium UI breathes.
*   **Use Tonal Shifts:** Use `surface_container_lowest` for the "active" meal of the day and `surface_container_low` for the rest of the week.

### Don't:
*   **Don't use #000000 shadows:** Shadows must be soft and tinted.
*   **Don't use 1px dividers:** They clutter the "Greenhouse" aesthetic. Use space or color.
*   **Don't use sharp corners:** Nothing in this system should be sharper than `rounded-sm`. We are "friendly" and "organic."
*   **Don't crowd data:** If tracking 10 nutrients, use a "Show More" progressive disclosure rather than a dense table.

---

## 7. Token Reference Summary
| Role | Token | Value |
| :--- | :--- | :--- |
| **Primary Base** | `primary` | #006e1c |
| **Surface Base** | `surface` | #f8f9fa |
| **High Elevation** | `surface_container_lowest` | #ffffff |
| **Heading Font** | `display-lg` | Plus Jakarta Sans / 3.5rem |
| **Body Font** | `body-md` | Inter / 0.875rem |
| **Radius - Card** | `xl` | 1.5rem |
| **Radius - Button** | `full` | 9999px |