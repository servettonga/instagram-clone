# SCSS Guide

## Available Design Tokens

### Colors

```scss
$ig-blue: #0095f6;
$ig-blue-hover: #1877f2;
$ig-background: #fafafa;
$ig-border: #dbdbdb;
$ig-text-primary: #262626;
$ig-text-secondary: #8e8e8e;
$ig-error: #ed4956;
$ig-success: #00c853;
```

### Spacing (8px grid system)

```scss
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
```

### Typography

```scss
$font-light: 300;
$font-regular: 400;
$font-medium: 500;
$font-bold: 700;

$font-xs: 12px;
$font-sm: 14px;
$font-md: 16px;
$font-lg: 18px;
```

---

## Useful Mixins

### Layout

```scss
// Flexbox shortcuts
@include flex-center;        // display: flex + center everything
@include flex-between;       // display: flex + space-between
@include flex-column;        // display: flex + flex-direction: column

// Responsive breakpoints
@include mobile { ... }      // max-width: 639px
@include tablet { ... }      // min-width: 768px
@include desktop { ... }     // min-width: 1024px
```

### Instagram Components

```scss
// Buttons
@include button-primary;     // Blue Instagram button
@include button-secondary;   // Gray outlined button

// Cards
@include card;               // Basic white card with border
@include post-card;          // Instagram post card (with mobile tweaks)

// Avatars
@include avatar(32px);       // Circular avatar with size
@include avatar-border;      // Gradient border for stories
```

### Effects

```scss
@include hover-scale(1.05);  // Scale on hover
@include hover-opacity(0.7); // Fade on hover
@include skeleton;           // Loading skeleton animation
```

### Utilities

```scss
@include text-ellipsis;      // Truncate with ...
@include line-clamp(2);      // Show only N lines
@include custom-scrollbar;   // Instagram-style scrollbar
```

---

## Best Practices

### 1. Use SCSS index at the top

```scss
@use '@/styles/index.scss' as *;
```

### 2. Use nesting wisely (max 3 levels)

```scss
.card {
  .header {
    .title {
      // OK - 3 levels
    }
  }
}
```

### 3. Prefer mixins over repeating code

```scss
// ❌ Bad
.button1 {
  display: flex;
  align-items: center;
  justify-content: center;
}
.button2 {
  display: flex;
  align-items: center;
  justify-content: center;
}

// ✅ Good
.button1, .button2 {
  @include flex-center;
}
```

### 4. Use variables for all hardcoded values

```scss
// ❌ Bad
padding: 16px;
color: #262626;

// ✅ Good
padding: $spacing-md;
color: $ig-text-primary;
```

### 5. Mobile-first responsive design

```scss
.container {
  padding: $spacing-sm; // Mobile default

  @include tablet {
    padding: $spacing-md; // Tablet override
  }

  @include desktop {
    padding: $spacing-lg; // Desktop override
  }
}
```

---

## Advanced SCSS Features

### Variables with calculations

```scss
$header-height: 60px;
$content-height: calc(100vh - #{$header-height});

.main {
  height: $content-height;
}
```

### Parent selector (&)

```scss
.button {
  color: $ig-blue;

  &:hover {
    color: $ig-blue-hover;
  }

  &.disabled {
    opacity: 0.3;
  }

  &Primary {
    // Creates .buttonPrimary
    background: $ig-blue;
  }
}
```

### Functions

```scss
@function spacing($multiplier) {
  @return $spacing-sm * $multiplier;
}

.box {
  padding: spacing(2); // 16px
}
```

### Maps

```scss
$social-colors: (
  facebook: #1877f2,
  instagram: #e4405f,
  twitter: #1da1f2,
);

.facebook-btn {
  background: map-get($social-colors, facebook);
}
```
