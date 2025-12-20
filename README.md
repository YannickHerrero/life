# Life

Personal habit tracking for Japanese learning, nutrition, and sport.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-green?logo=supabase)
![PWA](https://img.shields.io/badge/PWA-enabled-purple)

## About

Life is a personal tracking web application for monitoring daily habits across four domains. The app prioritizes fast data input and insightful statistics visualization with an offline-first architecture.

## Performance Optimizations

This app is designed for perceived instant response times, especially on mobile PWA.

### Local-First Architecture
All data is stored in IndexedDB (via Dexie.js) and accessed locally first. Network sync happens in the background, so the UI never waits for server responses.

### Optimistic Updates
When adding or modifying data, the UI updates immediately via Zustand store before the database write completes. Users see instant feedback.

### Cache-First Service Worker
Navigation requests use a `CacheFirst` strategy - the PWA loads instantly from cache without waiting for the network. Users can manually refresh via Settings when updates are available.

### Debounced Background Sync
Data changes trigger a sync to Supabase with a 2-second debounce, batching rapid inputs and preventing excessive network requests.

### Press-on-Down Interactions
Critical buttons use `onPointerDown` instead of `onClick`, eliminating the ~100ms delay on mobile touch events for instant tactile feedback.

### Reduced Animation Durations
UI animations (sheets, dialogs) use shortened durations to minimize perceived latency while maintaining visual polish.

## Features

### Japanese Learning
Track flashcard sessions, reading, watching, and listening activities. View progress through heatmaps, streaks, and time statistics.

### Nutrition
Manage a personal food database with macro tracking (calories, protein, carbs, fat). Log meals by type and quantity with daily and weekly summaries.

### Sport
Log running, street workout, and biking sessions. Visualize activity through heatmaps and weekly distance graphs. Track duration, distance, and training types.

### Weight
Record daily weight measurements with trend visualization over time.

### Offline-First
All data is stored locally using IndexedDB for instant access. Syncs automatically with Supabase when online.

### PWA
Installable on mobile devices. Works offline after initial load.

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) with [Catppuccin](https://catppuccin.com/) theme
- [shadcn/ui](https://ui.shadcn.com/)
- [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- [Supabase](https://supabase.com/) (Authentication + Cloud Sync)
- [Recharts](https://recharts.org/) (Data visualization)
- [Serwist](https://serwist.pages.dev/) (PWA / Service Worker)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (or Node.js)
- [Supabase](https://supabase.com/) account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YannickHerrero/life.git
   cd life
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Create `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   bun dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
bun run build
```

## Project Structure

```
├── app/
│   ├── (auth)/          # Login and signup pages
│   ├── (main)/          # Dashboard, stats, history, settings
│   └── layout.tsx
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── charts/          # Heatmaps, line charts, bar charts
│   ├── forms/           # Input forms for each domain
│   └── history/         # History view components
├── hooks/               # Custom hooks for each domain
├── lib/                 # Database, sync, utilities
└── types/               # TypeScript type definitions
```

## License

MIT
