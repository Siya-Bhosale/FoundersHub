# FoundersHub — Delivery is the Currency 🚀

> **Team**: Tech Alchemist (`KH095`)  
> **Platform**: FoundersHub — A three-sided startup platform connecting Founders, Developers, and Investors with proof-of-work execution sprints.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Quick Start & Setup](#quick-start--setup)
- [Environment Configuration](#environment-configuration)
- [Deployment (Vercel)](#deployment-vercel)
- [Documentation & Diagrams](#documentation--diagrams)

---

## 🌟 Overview

**FoundersHub** replaces speculative pitch decks with an execution engine built on verifiable delivery:
1. **Founders**: Validate venture concepts through the 3-Point Readiness Gate, orchestrate time-bound execution sprints across 8 modular departments, manage developer team rosters, and pitch media assets.
2. **Developers**: Claim backlog tasks on Kanban boards, ship verified commits, build a comprehensive builder profile with verified badges, and earn dynamically vested startup equity.
3. **Investors**: Syndicate capital into ventures that have proven traction, verifiable milestones, audited execution scores, and 1% transparent platform fee accounting.

---

## 📁 Repository Structure

Organized according to the standard project submission specification:

```
KH095-Tech Alchemist/
│
├── README.md                          # Master project documentation
├── LICENSE                            # MIT License
│
├── src/                               # Project source code
│   ├── client/                        # React + Vite frontend SPA
│   │   ├── src/                       # Components, pages, context, and styles
│   │   ├── public/                    # Static branding and SVG icons
│   │   ├── vercel.json                # Vercel SPA client rewrite routing
│   │   └── package.json
│   └── server/                        # Express.js + Mongoose backend API
│       ├── controllers/               # Route controllers (startups, auth, tasks, AI, finance, investors)
│       ├── models/                    # MongoDB schemas
│       ├── routes/                    # Express REST endpoints (/api/*)
│       ├── services/                  # AI Copilot, mentor, risk & scoring services
│       └── server.js                  # Express application entry
│
├── docs/                              # Project documentation & architecture
│   ├── project-documentation.pdf      # Detailed design specification
│   ├── architecture.png               # System architecture diagram
│   └── other-diagrams/                # Workflows & data models
│
├── screenshots/                       # Product visual screenshots
│   ├── screenshot-1.png               # Landing & hero showcase
│   └── screenshot-2.png               # Founder & Developer dashboards
│
├── data/                              # Seed data and database schemas
│   └── README.md                      # Data model documentation
│
├── package.json                       # Root workspace manifest & run scripts
└── .gitignore                         # Standard git ignore specification
```

---

## ⚙️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Recharts, React Router v7
- **Backend**: Node.js, Express 5, Mongoose (MongoDB Atlas), JSONWebToken, Multer
- **AI Engine**: Google Gemini API (`@google/genai`) for Startup Idea Analyzer, Founder Copilot, and AI Mentor
- **Hosting**: Vercel (Frontend SPA) + Render/Railway/Vercel (Backend API)

---

## 🚀 Quick Start & Setup

### Prerequisites
- Node.js 18+ or 20+
- MongoDB connection string (`MONGODB_URI`)
- Google Gemini API Key (`GEMINI_API_KEY`)

### Installation

```bash
# Clone the repository
git clone https://github.com/Siya-Bhosale/FoundersHub.git
cd FoundersHub

# Install frontend dependencies
cd src/client && npm install

# Install backend dependencies
cd ../server && npm install
```

### Running Locally

```bash
# Terminal 1 - Backend API (Port 5000)
cd src/server
node server.js

# Terminal 2 - Frontend Client (Port 3000 / 5173)
cd src/client
npm run dev
```

---

## 🔑 Environment Configuration

### Frontend (`src/client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

### Backend (`src/server/.env`)
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

---

## 🌐 Deployment (Frontend on Vercel)

1. Import the repository into **Vercel**.
2. Set **Root Directory** to `src/client`.
3. Framework preset: **Vite**.
4. Configure Environment Variable:
   - `VITE_API_URL`: Your deployed backend API URL (e.g. `https://your-api.onrender.com/api`).
5. Deploy!