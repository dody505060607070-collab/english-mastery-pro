# Responsive Design Optimization Plan

Improve the responsiveness of Blue Language Academy across all screen sizes (mobile, tablet, desktop) ensuring a seamless user experience without text overlap or button alignment issues.

## User Review Required

> [!IMPORTANT]
> The current layout uses a lot of absolute positioning and fixed heights for 3D effects which might cause issues on specific small-screen devices. I will be standardizing these using responsive Tailwind classes.

## Proposed Changes

### UI & UX Enhancements

#### 1. Global Navigation & Layout
- Implement a mobile-responsive navigation menu (Drawer or Hamburger) for the header.
- Adjust container padding and margins for better spacing on mobile.
- Update `src/routes/index.tsx` to handle small screen logo sizes more gracefully.

#### 2. Hero Section Refinement
- Adjust text sizes (`text-5xl` to `text-3xl` or `text-4xl` on mobile) to prevent line breaks that overlap other elements.
- Scale 3D floating icons based on viewport width.
- Fix button stacking on small screens to ensure they are accessible and centered.

#### 3. Course Catalog & Cards
- Update grid layouts in `src/routes/courses.tsx` and `src/routes/index.tsx` to use `grid-cols-1` for mobile and `grid-cols-2` for tablets.
- Ensure card content (title, description, price) scales correctly without overflowing.

#### 4. Practice & Dashboard
- Optimize interactive 3D cards in `src/routes/_authenticated/practice/free.tsx` for touch devices.
- Refine the Dashboard layout to ensure statistics and course lists don't feel cramped on mobile.

## Technical Details

- **Tailwind Breakpoints**: Use `sm:`, `md:`, `lg:` prefixes consistently.
- **Dynamic Sizing**: Replace fixed `h-64` / `h-96` on important elements with responsive classes (e.g., `h-48 md:h-64 lg:h-96`).
- **Typography**: Utilize responsive font sizes (e.g., `text-2xl md:text-3xl lg:text-5xl`).
- **Overflow Management**: Ensure `overflow-hidden` is used correctly on containers with floating 3D assets to prevent unwanted horizontal scrolling.
- **Component Audit**: 
  - `src/routes/index.tsx`: Fix Hero and Footer layouts.
  - `src/routes/courses.tsx`: Fix grid and filters.
  - `src/components/ThreeDEffects.tsx`: Add responsive scaling to 3D animations.
  - `src/routes/auth.tsx`: Ensure the login card is fully centered and padded on mobile.

## Security Considerations

- No new database schemas or RLS changes required.
- All changes are frontend/presentation layer only.
