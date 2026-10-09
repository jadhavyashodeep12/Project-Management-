# Project Management System - User Credentials & System RBAC Roles

This document lists all system users, their roles, login credentials, and permission capabilities.

---

## 🔑 System User Credentials

### 1. 🛡️ ADMIN (System Administrator)
* **Role**: `Admin` (`admin`, Role ID: 1)
* **Full Name**: Yashodeep Jadhav
* **Email**: `admin@pms.com`
* **Password**: `AdminPassword123!`
* **Capabilities**:
  - Create & Delete projects (`+ New Project` button).
  - Assign & Replace Project Managers for projects.
  - View all projects, Kanban boards, teams, and members.
  - *Note*: Admin manages high-level projects and managers. Admin cannot create/delete teams, add/remove team members, or create/delete/update tasks.

---

### 2. 👔 PROJECT MANAGERS (3 Users)
* **Role**: `Project Manager` (`project_manager`, Role ID: 2)
* **Capabilities**:
  - Manage assigned projects.
  - Create and delete teams for assigned projects.
  - Add and remove project and team members.
  - Create tasks (`+ Create Task`), assign tasks to team members, delete tasks, and update task progress.

#### User Roster:
| Full Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Aarav Patil** | Project Manager | `pm.aarav@pms.com` | `PMPassword123!` |
| **Tanvi Deshmukh** | Project Manager | `pm.tanvi@pms.com` | `PMPassword123!` |
| **Yash Jadhav** | Project Manager | `pm.yash@pms.com` | `PMPassword123!` |

---

### 3. 💻 TEAM MEMBERS (4 Users)
* **Role**: `Team Member` (`team_member`, Role ID: 3)
* **Capabilities**:
  - View assigned workspace projects and team boards.
  - Execute assigned tasks and update task status/progress on the Kanban board.

#### User Roster:
| Full Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Rohan Kulkarni** | Team Member | `dev.rohan@pms.com` | `MemberPassword123!` |
| **Sneha Joshi** | Team Member | `dev.sneha@pms.com` | `MemberPassword123!` |
| **Aniket Shinde** | Team Member | `qa.aniket@pms.com` | `MemberPassword123!` |
| **Aditya Pawar** | Team Member | `designer.aditya@pms.com` | `MemberPassword123!` |

---

## 📌 RBAC Summary Matrix

| Role | Create/Delete Project | Assign PM | Create/Delete Team | Add/Remove Members | Create/Delete Tasks | Update Task Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Project Manager** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Team Member** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
