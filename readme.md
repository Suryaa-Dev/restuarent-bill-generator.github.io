Anand Fast Food POS 🍽️⚡
> Fast, portion-based POS for restaurants — multi-table totals, realtime sync & PWA support. Built for production use at Anand Fast Food.
![React](https://img.shields.io/badge/Frontend-React-blue)
![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38bdf8)
![Supabase](https://img.shields.io/badge/Backend-Supabase-3fcf8e)
![Postgres](https://img.shields.io/badge/Database-PostgreSQL-336791)
![PWA](https://img.shields.io/badge/Platform-PWA-orange)
![Realtime](https://img.shields.io/badge/Sync-Realtime%20Updates-ff9800)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-In%20Production-success)


A fast, real-time restaurant billing system built for high-pressure kitchens — designed & developed for Anand Fast Food (my dad’s business).

📌 Overview

Anand Fast Food POS is a modern restaurant billing system built to solve real-world challenges of fast-paced eateries.
Unlike traditional billing systems, it prioritizes speed, clarity, and realtime synchronization, making order taking faster even during rush hours.

This POS is actively used in a production environment — Anand Fast Food — to serve customers efficiently with portion-based ordering and multi-table management.

🚀 Key Differentiators (What makes this POS unique)
Feature	Why it matters
🍽️ Portion-based ordering (Half / Full / Small / Large)	Keeps menu clean & speeds up order taking — 1 tap = most common portion
📊 All Tables View with live bill totals	Staff can see every table’s running total at once — helps during peak hours
🔁 Realtime synchronization	Changes made on one device instantly reflect on all screens
📱 PWA support (Install as app)	Works like an app on Android/iOS — offline fallback for temporary network issues
🧾 Fast bill printing	Prints receipts within seconds using thermal printers
📦 Offline queueing	Saves changes locally & syncs automatically when back online
🔥 Optimistic UI updates	Bill updates instantly before server response — zero waiting time
🎯 Why Portions Matter

Instead of listing:

Paneer Fry Half  
Paneer Fry Full  
Paneer Fry Extra


The system keeps one item card, with:

1-tap default portion (most frequently ordered)

extra portion buttons below the card

This makes the menu compact, fast, and intuitive, reducing confusion for staff.

🧠 Core Features

Add items with one tap

Custom portions for each dish

Multi-table billing

Local caching + sync on reconnect

Realtime updates using Supabase

Auto-save bills

Move instantly between Home ↔ All Tables

Category-based filtering

Fast receipt printing

Dark/light background UI contrast for rush hours

💻 Tech Stack
Frontend	Backend / DB	Others
React + Vite	Supabase Realtime	Lucide Icons
Tailwind CSS	Supabase Postgres	PWA + Service Worker
—	—	IndexedDB offline queue
📸 Screenshots (add later)
Feature	Preview
Portion Buttons	(add image)
All Tables View	(add image)
Bill Drawer	(add image)
Printing Receipt	(add image)

I can help you create clean screenshots later — just tell me when.

🏁 Getting Started
git clone https://github.com/your-username/anand-fast-food-pos.git
cd anand-fast-food-pos
npm install
npm run dev


For production build:

npm run build

🔧 Environment Variables

Create .env:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

📲 Install as App (PWA)

Open on mobile browser

Tap "Add to Home Screen"

Launch like a native app

🛠️ Roadmap

Table merge/split

Discounts and GST support

KOT (Kitchen Order Ticket)

Analytics dashboard

Menu editing from app

🙌 Credits

Built for Anand Fast Food — Solapur
by Suraj Sutar (yes, the owner’s son 😉)
