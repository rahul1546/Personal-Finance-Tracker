# Personal-Finance-Tracker
A responsive finance application built with React, Tailwind CSS, and Firebase, enabling secure transaction management, budgets, savings goals, real-time updates, and detailed analytics with charts and filters.

## Features

- **Auth**: Email/Password + Google (Firebase Auth)
- **Transactions**: add/edit/delete, income vs expense, optional **recurring** (auto-seeded monthly)
- **Filters**: by type, tag, date range, and text search
- **Budgets**: per-category limits with progress bars and hover-delete (confirm modal)
- **Savings Goals**: create/update/delete; progress bar
- **Analytics**: “Expenses by Category” bar chart
- **CSV**: export & import transactions
- **Dark Mode** toggle
- **Responsive** layout

---

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Firebase (Auth + Firestore)
- **Optional hosting:** Firebase Hosting / Vercel

---

## Project Structure

src/
├─ components/ # Reusable UI (Header, Modal, etc.)
├─ pages/
│ ├─ HomePage.jsx
│ ├─ LoginPage.jsx
│ ├─ SignupPage.jsx
│ ├─ Dashboard.jsx # Main tracker UI (transactions, budgets, goals, charts)
│ └─ TourPage.jsx
├─ firebase.js # Firebase init (Auth + Firestore)
├─ App.jsx # Simple state-based router
└─ index.css # Tailwind base & globals
