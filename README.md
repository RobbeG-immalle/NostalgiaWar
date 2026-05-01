# NostalgiaWar 🕹️

A nostalgia-voting web app where users pick the most nostalgic video from head-to-head matchups across categories like video games, cartoons, movies, and music.

Built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A [Supabase](https://supabase.com/) project (free tier is sufficient)

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/RobbeG-immalle/NostalgiaWar.git
   cd NostalgiaWar
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example env file and fill in your Supabase credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Open `.env.local` and set the values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   You can find these values in your Supabase project under **Settings → API**.

4. **Set up the database**

   In your Supabase project, open the **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates the required tables (`items`, `votes`), indexes, and seeds sample data.

---

## Running the App

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production build

```bash
npm run build
npm run start
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create an optimised production build |
| `npm run start` | Start the production server (requires a build) |
| `npm run lint` | Run ESLint |
