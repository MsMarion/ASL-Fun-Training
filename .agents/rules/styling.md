# ASL-Fun-Training Styling Rules

## 1. Virtual 1080p Canvas Scaling

The application uses a fixed **1920x1080 Virtual Canvas**. This ensures that all UI elements, layout spacing, fonts, and assets scale proportionally on devices of _any size_ (mobile, 1080p, 1440p, 4k).

### Rules for Adding New Elements:

- Everything exists inside the `<ScaledContainer>` component which wraps the RootLayout.
- You must design and style your components as if the screen is **strictly 1920x1080**.
- Do **not** use `w-screen` or `h-screen`, as the browser's physical "screen" size no longer matches the Virtual Canvas coordinate plane.
- Instead, use `w-full`, `h-full`, `min-h-full`, or absolute pixel metrics assuming a 1080p container.

## 2. Global Aesthetics

- Maintain the synthwave/neon grid aesthetic (vibrant magenta `#d946ef`, cyan `#2de2e6`, deep purple `#0d0221` backgrounds).
- Use `font-[family-name:var(--font-anta)]` for standard app fonts, and `font-mono` where digits, debug logs, or timestamps are shown.
- Ensure glows use Tailwind Drop Shadows or pure CSS box/text shadows for the neon effects.
