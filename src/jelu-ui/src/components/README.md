# Component Organization

This directory contains all Vue components, organized by domain.

## Directory Structure

### Layout Components (`Layout/`)
- `DefaultLayout.vue` - Main app layout with navbar, search, and user menu
- `AuthLayout.vue` - Centered layout for login/welcome pages
- `AdminLayout.vue` - Simplified layout for admin/profile pages
- `BlankLayout.vue` - Minimal layout for public views

### Global Components (`Global/`)
Reusable base components used across multiple domains:
- `BookCard.vue` - Book thumbnail card
- `BookQuoteCard.vue` - Quote display card
- `ReviewCard.vue` - Review display card
- `ReviewBookCard.vue` - Review book association card
- `BulkEditModal.vue` - Bulk edit modal dialog
- `ClosableBadge.vue` - Dismissible badge/tag
- `FormField.vue` - Form field wrapper
- `FilePickerElement.vue` - File picker component
- `SortFilterBar.vue` - Sorting and filtering bar

### Domain Directories
Each domain contains components specific to that feature area:

| Directory | Purpose |
|-----------|---------|
| `Book/` | Book management (detail, list, add, edit, scan, quotes, reviews) |
| `Author/` | Author management (list, detail, admin, edit) |
| `Review/` | Review management (list, detail, modal) |
| `Series/` | Series management (books, admin, modal, complete input) |
| `Tag/` | Tag management (books, admin) |
| `User/` | User management (detail, settings, messages, stats, shelves, modal) |
| `Admin/` | Admin features (imports, API tokens, profile, data admin) |
| `List/` | Custom lists (list detail, manage lists) |
| `Search/` | Search functionality |
| `Metadata/` | Metadata plugins and details |
| `Quotes/` | Quote display components |
| `Misc/` | Miscellaneous pages (login, welcome, history, random, to-read) |

## Naming Conventions

- **Modal dialogs**: `*Modal.vue` (e.g., `EditBookModal.vue`, `ReviewModal.vue`)
- **List views**: `*List.vue` (e.g., `BookList.vue`, `ReviewList.vue`)
- **Detail views**: `*Detail.vue` (e.g., `BookDetail.vue`, `UserDetail.vue`)
- **Admin views**: `*Admin.vue` (e.g., `AdminAuthors.vue`, `TagsAdmin.vue`)
- **Cards**: `*Card.vue` (e.g., `BookCard.vue`, `ReviewCard.vue`)

## Import Guidelines

When importing components:
- **Same domain**: Use relative path `./ComponentName.vue`
- **Different domain**: Use `../Domain/ComponentName.vue`
- **Global components**: Use `../Global/ComponentName.vue`
- **Shared resources** (store, models, services): Use `../../store`, `../../model/*`, `../../services/*`

## Adding New Components

1. Determine the appropriate domain directory
2. Follow the naming conventions above
3. Use `<script setup lang="ts">` syntax
4. Import i18n with `useI18n({ inheritLocale: true, useScope: 'global' })`
5. Use Tailwind CSS + DaisyUI classes for styling
6. Test on both mobile and desktop viewports
