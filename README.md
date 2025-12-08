# Life

Personal habit tracking for Japanese learning, nutrition, sport, and weight.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-green?logo=supabase)
![PWA](https://img.shields.io/badge/PWA-enabled-purple)

## About

Life is a personal tracking web application for monitoring daily habits across four domains. The app prioritizes fast data input and insightful statistics visualization with an offline-first architecture.

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
