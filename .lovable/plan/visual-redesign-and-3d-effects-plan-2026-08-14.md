# Visual Redesign and 3D Effects Plan

The goal is to transform the academy into a high-end, modern platform with 3D-like visuals, comprehensive content for all categories, and a professional user experience matching the best academy sites.

## Core Objectives

-   **3D Visual Direction**: Implement "glassmorphism", deep shadows, and floating animations using Framer Motion and modern CSS to simulate a 3D interface.
-   **Content Depth**: Add rich descriptions and images for all course categories and ensure lessons are fully accessible from within each section.
-   **Authentication Enhancement**: Ensure the phone-based login/signup is prominent and works flawlessly.
-   **Academy Experience**: Add missing sections like "Success Stories", "Learning Path", and "Expert Instructors".

## Technical Details

### 1. 3D & Modern UI Implementation
-   **Glassmorphism**: Use `backdrop-blur` with semi-transparent backgrounds for cards and navigation.
-   **Floating Effects**: Implement `framer-motion` for subtle hover elevations and entry animations.
-   **Deep Shadows**: Use custom shadow utility classes to create layers.
-   **Visual Assets**: Integrate high-quality icons and abstract 3D-style patterns/blobs in the background.

### 2. Page & Routing Updates
-   **Index Page (`src/routes/index.tsx`)**:
    -   Redesign Hero section with a 3D-feeling layout.
    -   Expand "Course Categories" to be more interactive.
    -   Add "Why Choose Us" with 3D icons.
    -   Ensure all courses are listed with prices and levels.
-   **Course Detail (`src/routes/_authenticated/course/$courseId.tsx`)**:
    -   Enhance the player interface.
    -   Show a clear roadmap of lessons.
-   **Auth Page (`src/routes/auth.tsx`)**:
    -   Make the login/signup card more professional with 3D depth.

### 3. Database & Content
-   Update `courses` and `lessons` to include more realistic placeholder content if needed.
-   Ensure `course_categories` have proper visual representations.

## Task Breakdown

### Step 1: Visual Foundation (CSS & Components)
-   Update `src/styles.css` with 3D utility classes (shadows, animations).
-   Create a `GlassCard` wrapper component for reuse.

### Step 2: Homepage Redesign
-   Rewrite `src/routes/index.tsx` to use the new visual language.
-   Add 3D-inspired hero and section dividers.

### Step 3: Auth & Onboarding
-   Refine the Phone Auth UI in `src/routes/auth.tsx`.

### Step 4: Course Exploration
-   Add a dedicated "All Courses" section or page if the homepage gets too crowded.
-   Ensure category clicks filter courses correctly.

### Step 5: Final Polish
-   Verify RTL alignment and "Cairo" font consistency.
-   Add loading states with 3D skeletons.
