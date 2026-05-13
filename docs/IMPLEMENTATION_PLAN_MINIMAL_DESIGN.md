# Minimal-Design Implementation Plan

## Overview

Dieser Plan beschreibt die Implementierung eines umschaltbaren Design-Modus ("Voll" / "Minimal") für Jelu.

## Ziel

- **Full-Mode**: Bestehendes Design mit EditBookModal, Sidebar-Navigation, allen Features
- **Minimal-Mode**: Vereinfacht - keine Extra-Navigation, Buch-Detailseite mit Inline-Editing

## Einstellungen

- **Speicherort**: localStorage (vorerst)
- **Setting**: `jelu_design_mode` = 'full' | 'minimal'
- **Default**: 'full'

---

## Phase 1: Design-Mode Infrastructure (~15 Commits)

### 1.1 Setting hinzufügen (UserSettings.vue)
- Neuer Select nach Theme-Selektor
- Optionen: "Voll (Full)", "Minimal (Minimal)"
- Speichert in localStorage als `jelu_design_mode`

### 1.2 useDesignMode Composable
- **Datei**: `src/composables/useDesignMode.ts`
- Exportiert:
  - `designMode` - computed ('full' | 'minimal')
  - `setDesignMode(mode)` - Funktion zum Setzen
  - `isFullMode` - computed boolean
  - `isMinimalMode` - computed boolean

### 1.3 Sidebar anpassen (AppSidebar.vue)
- `mainLinks` computed property filtern:
  - **Full-Mode**: Alle Links (books, to-read, random, history, reviews, authors, imports, stats)
  - **Minimal-Mode**: Nur /books, /reviews, /profile/*
- Import von `useDesignMode` Composable

### 1.4 CSS-Variablen
- **Datei**: `src/assets/style.css`
- CSS-Variablen basierend auf Design-Mode:
  ```css
  [data-design-mode="minimal"] {
    --sidebar-extended-links: 0;
  }
  [data-design-mode="full"] {
    --sidebar-extended-links: 1;
  }
  ```
- Diese können in der Sidebar verwendet werden um Elemente ein-/auszublenden

---

## Phase 2: Navigation anpassen (~10 Commits)

### 2.1 Buch-Klick-Verhalten (BookCard.vue, BookList.vue)
- **Full-Mode**: Klick auf Buch öffnet EditBookModal
- **Minimal-Mode**: Klick auf Buch navigiert zu `/book/{id}`
- Import von `useDesignMode`, Conditional für Klick-Handler

### 2.2 BookDetail erweitern (BookDetail.vue)
- Im Minimal-Mode: "Bearbeiten" Button hinzufügen
- Toggle-Button: "Lesen" / "Bearbeiten"
- "Bearbeiten" aktiviert Edit-Modus

### 2.3 Routing prüfen
- Sicherstellen dass `/book/{id}` Route funktioniert
- Keine unerwarteten Weiterleitungen

---

## Phase 3: BookFormFields auslagern + Edit-Mode (~20 Commits)

### 3.1 Neue Komponente erstellen
- **Datei**: `src/components/Book/BookFormFields.vue`
- Enthält alle Input-Felder:
  - Titel, Untertitel
  - Autor(en), Übersetzer, Erzähler
  - ISBN, ISBN-10
  - Verlag, Veröffentlichungsdatum
  - Seiten, Sprache
  - Beschreibung/Summary
  - Serie, Band-Nummer
  - Tags
  - Bild-URL
- Props:
  - `book`: Book | UserBook (die Daten)
  - `mode`: 'read' | 'edit'
  - `errors`: Record<string, string> (für Validierung)
- Emits:
  - `update:book`
  - `save`
  - `cancel`

### 3.2 EditBookModal refaktorieren
- Importiert und nutzt `<BookFormFields>`
- Entfernt duplizierte Feld-Logik
- Behält Modal-spezifische Funktionalität (schließen, speichern, löschen)

### 3.3 BookDetail (Minimal-Mode) erweitern
- Nutzt `<BookFormFields>` im Edit-Modus
- Zeigt `<BookFormFields v-if="isEditMode" :book="..." mode="edit" />`
- Zeigt normale Anzeige im Read-Modus

### 3.4 Save/Cancel Buttons
- In BookDetail:
  - "Speichern" Button - speichert Änderungen
  - "Abbrechen" Button - verwirft Änderungen, zurück zum Read-Modus
- Nutzt bestehende BookService API

### 3.5 Status-Change-Events
- Auch auf Detailseite verfügbar:
  - Status ändern (Leseliste, Besitz, Geliehen)
  - Lesefortschritt
  - Rezension schreiben

### 3.6 Validierung
- Bestehende Validierung aus EditBookModal wiederverwenden
- Error-Messages anzeigen

---

## Phase 4: UI-Polierung (~5 Commits)

### 4.1 Mobile-Optimierung
- Edit-Modus auf kleinen Bildschirmen
- Tastatur-Verhalten
- Touch-Targets

### 4.2 Übersetzungen
- Neue i18n Keys hinzufügen:
  - `settings.design_mode`
  - `settings.design_full`
  - `settings.design_minimal`
  - `book.edit_mode`
  - `book.read_mode`
- Aktualisieren: en.json, de.json

### 4.3 CSS-Fixes
- Layout-Brüche beheben
- Konflikte mit DaisyUI Theming lösen

---

## Geschätzter Umfang

| Phase | Commits |
|-------|---------|
| Phase 1 | ~15 |
| Phase 2 | ~10 |
| Phase 3 | ~20 |
| Phase 4 | ~5 |
| **Gesamt** | **~50** |

---

## Abhängigkeiten

- EditBookModal.vue - muss refaktoriert werden für Fields-Wiederverwendung
- BookService - muss funktionieren (bestehend)
- localStorage - für Settings-Speicherung (bestehend)
- vue-i18n - für Übersetzungen (bestehend)

---

## Testing

### Manuelle Tests nach Phase

| Phase | Testfall |
|-------|----------|
| 1 | Setting-Änderung in UserSettings → localStorage aktualisiert, CSS-Variablen gesetzt |
| 1 | Sidebar zeigt nur reduzierte Links im Minimal-Mode |
| 2 | Buch-Klick im Minimal-Mode navigiert zu /book/{id} |
| 2 | "Bearbeiten" Button erscheint in BookDetail (Minimal-Mode) |
| 3 | Fields ausgelagert und wiederverwendbar |
| 3 | Save/Cancel funktioniert in BookDetail |
| 4 | Responsive auf Mobile |

---

## Notizen

- EditBookModal bleibt vollständig erhalten für Full-Mode
- BookFormFields ist wiederverwendbar zwischen Modal und Detailseite
- Design-Mode ist global (für alle Bücher identisch) - User-Einstellung