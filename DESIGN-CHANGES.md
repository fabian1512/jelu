# UI Design Changes - Jelu Book Management App

## 2025-XX-XX - Block Layout Fix

### Changes
- **BookDetail.vue**: Removed grid layout - all fields now stack vertically (not side-by-side)
- **BookDetail.vue**: Added min-height to title (`min-h-[2.5rem]`) for consistent vertical alignment
- **BookDetail.vue**: Added min-height to info fields (`min-h-[1.5rem]`) for consistent row heights

### Rationale
User requested:
1. All fields stacked vertically (not side-by-side)
2. Title min-height for consistent start position
3. Info fields min-height for consistent row heights

---

## Previous Changes (Timeline)

### 2025-XX-XX - Timeline Layout
- Mobile layout like Mealie (icon left, card right with date inside)
- Desktop alternating layout
- Card text centered on desktop, left-aligned on mobile
- Edit button at right edge (ml-auto)

### 2025-XX-XX - Book Metadata
- All fields always visible (Author, Publisher, ISBN13, Pages, Date, Summary)
- "-" as placeholder for empty fields
- Removed Original Title and ISBN10
- "All Reviews" link only visible when totalReviews > 0

### 2025-XX-XX - BookReviews Layout
- Same layout as BookDetail with all metadata