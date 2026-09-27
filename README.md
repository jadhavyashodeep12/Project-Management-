# 🚀 Modern Project Management System

A full-stack, enterprise-grade Project Management application featuring a high-performance **Python/Flask RESTful API backend** and a modern **React + TypeScript + Vite frontend** with dynamic Kanban boards, task tracking, team management, and role-based authorization.

---

## 📂 Project Architecture & Directory Structure

Below is a detailed overview of what each directory and file in this repository includes:

```text
Project Management/
├── 📁 Agent/
│   └── IMPLEMENTATION_PLAN.md    # System architecture plan, design patterns, & implementation roadmap
│
├── 📁 backend/                    # Python / Flask RESTful API Service
│   ├── 📁 app/
│   │   ├── 📁 controllers/        # HTTP API route handlers (Auth, Users, Projects, Tasks, Boards, Teams)
│   │   ├── 📁 middleware/         # JWT authentication & role-based access control middleware
│   │   ├── 📁 models/             # SQLAlchemy ORM database models (User, Team, Project, Task, AuditLog)
│   │   ├── 📁 repositories/       # Data Access Layer / Repository pattern implementations
│   │   ├── 📁 schemas/            # Request validation & response serialization schemas
│   │   ├── 📁 services/           # Core business logic processing engine
│   │   ├── 📁 utils/              # Helper utilities (JWT tokens, password hashing, security)
│   │   ├── config.py              # Application environment & database configurations
│   │   └── extensions.py          # Flask extension initializations (SQLAlchemy, Migrate, CORS)
│   ├── Dockerfile.dev             # Containerization config for development backend
│   ├── requirements.txt           # Python package dependencies
│   └── wsgi.py                    # Server entry point for WSGI runners
│
├── 📁 frontend/                   # React + TypeScript + Vite Web Application
│   ├── 📁 public/                 # Static web assets & icons
│   ├── 📁 src/
│   │   ├── 📁 assets/             # Images, SVGs, and brand styling assets
│   │   ├── 📁 components/         # Reusable UI components (Kanban Board, Cards, Modals, Navbar, Sidebar)
│   │   ├── 📁 lib/                # Shared utilities & Axios client configurations
│   │   ├── 📁 pages/              # Main page views (Dashboard, Projects, Tasks, Teams, Login, Settings)
│   │   ├── 📁 services/           # API integration services (projects.ts, tasks.ts, teams.ts, auth.ts)
│   │   ├── 📁 stores/             # Global state management stores (Auth, Board, Theme)
│   │   ├── 📁 types/              # TypeScript type definitions & interfaces
│   │   ├── App.tsx                # Main React Application Router & Layout
│   │   ├── index.css              # Global CSS styles & design system tokens
│   │   └── main.tsx               # DOM React mount entry point
│   ├── Dockerfile.dev             # Containerization config for frontend Vite server
│   ├── package.json               # Node.js dependencies & npm scripts
│   └── vite.config.ts             # Vite build & development proxy settings
│
├── .gitignore                     # Excludes node_modules, venvs, build artifacts, .env, and *.db
├── docker-compose.yml             # Orchestrates Frontend, Backend, & Database containers
└── nginx.conf                     # Nginx reverse proxy configuration for routing traffic
```

---

## 🛠️ Technology Stack

### **Backend**
- **Language**: Python 3.11+
- **Framework**: Flask / RESTful API
- **Database**: SQLite / PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Containerization**: Docker & Docker Compose

### **Frontend**
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Modern CSS, Tailwind CSS / Shadcn UI components
- **State Management**: Zustand / React Context
- **HTTP Client**: Axios with API intercepters

---

## ⚡ Quick Start Guide

### Option 1: Running with Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/jadhavyashodeep12/Project-Management-.git
cd Project-Management-

# Spin up all services (Backend, Frontend, Nginx)
docker-compose up --build
```

Access the frontend at `http://localhost:3000` or via Nginx proxy at `http://localhost`.

---

### Option 2: Running Locally

#### **1. Backend Setup**
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python wsgi.py
```
The API server will run at `http://localhost:5000`.

#### **2. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```
The web application will be accessible at `http://localhost:5173`.

---

## 📄 License
This project is licensed under the MIT License.
