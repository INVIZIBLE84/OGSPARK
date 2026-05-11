
# CampusConnect Project Blueprint

## 1. Project Overview

**CampusConnect** is a modern, responsive web application designed to serve as a comprehensive portal for students, faculty, and administrators in an educational institution. It provides role-based access to various modules, including attendance tracking, fee management, document workflows, and user profile management.

This project is currently a **frontend-only application**. All backend logic and mock data have been stripped out, providing a clean and organized starting point for implementing a custom backend.

## 2. Technology Stack

- **Framework**: **Next.js 15** (with App Router)
- **Language**: **TypeScript**
- **UI Library**: **React**
- **Component Library**: **ShadCN/UI** - A collection of beautifully designed, accessible, and customizable components.
- **Styling**: **Tailwind CSS** - For utility-first styling and rapid UI development.
- **Icons**: **Lucide React** - A simple and beautiful icon set.
- **Animation**: **Framer Motion** - For smooth animations and transitions.

## 3. Project Structure

The project follows a standard Next.js App Router structure.

```
.
├── public/
│   ├── pogo-animation.mp4
│   └── sogo.png
├── src/
│   ├── app/
│   │   ├── admin/              # Pages accessible only to 'admin' role
│   │   │   ├── backups/
│   │   │   ├── broadcasts/
│   │   │   ├── logs/
│   │   │   ├── roles/
│   │   │   └── users/
│   │   ├── dashboard/          # Role-specific dashboard pages
│   │   │   ├── faculty/
│   │   │   ├── hod/
│   │   │   └── student/
│   │   ├── attendance/
│   │   ├── clearance/
│   │   ├── documents/
│ │   ├── fees/
│   │   ├── login/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── register/
│   │   ├── settings/
│   │   └── syllabus/
│   │   ├── globals.css         # Global styles and Tailwind directives
│   │   ├── layout.tsx          # Root layout of the application
│   │   └── page.tsx            # The main launch/redirect page
│   ├── components/
│   │   ├── layout/             # Main layout components (Header, Sidebar)
│   │   └── ui/                 # Reusable ShadCN UI components
│   ├── hooks/
│   │   └── use-toast.ts        # Custom hook for toast notifications
│   ├── lib/
│   │   └── utils.ts            # Utility functions (e.g., cn for classnames)
│   ├── services/               # Backend service definitions (currently placeholders)
│   │   ├── admin.ts
│   │   ├── attendance.ts
│   │   ├── auth.ts
│   │   ├── clearance.ts
│   │   ├── documents.ts
│   │   ├── fee-management.ts
│   │   └── notifications.ts
│   └── types/
│       └── user.ts             # Core user and role type definitions
├── tailwind.config.ts          # Tailwind CSS configuration
└── next.config.ts              # Next.js configuration
```

## 4. Core Pages and Features

The application is divided into several modules, each with its own page.

- **Authentication (`/login`, `/register`)**: User login and student self-registration pages. The admin panel also includes a page for admins to register any type of user.
- **Dashboards (`/dashboard/*`)**: Separate, tailored dashboards for Students, Faculty, and HODs, providing a quick overview of relevant information.
- **Admin Panel (`/admin/*`)**: A secure section for administrators with modules for:
    - **User Management**: View, edit, and manage all users.
    - **Roles & Permissions**: Define and assign permissions to roles.
    - **Audit Logs**: View a trail of system activities.
    - **Backups**: Manage system data backups.
    - **Broadcasts**: Send announcements to different user groups.
- **Attendance (`/attendance`)**: A role-based module for viewing and managing student attendance.
- **Fees (`/fees`)**: A module for students to track their fee status and for the accounts department to manage records.
- **Clearance (`/clearance`)**: A workflow for students to get clearance from various departments.
- **Documents (`/documents`)**: A system for uploading, managing, and requesting prints of documents.
- **Profile & Settings (`/profile`, `/settings`)**: Pages for users to view their profile and manage application settings.

## 5. UI and Styling

- **Theming**: The application's color scheme is defined using CSS variables in `src/app/globals.css`. It supports both light and dark themes out-of-the-box, managed by `next-themes`.
- **Components**: The UI is built with components from the **ShadCN/UI** library, located in `src/components/ui`. These components are designed to be accessible and easily customizable.
- **Layout**: The main application layout consists of a collapsible sidebar and a header, managed by components in `src/components/layout`. The layout is not applied to the login and registration pages.

## 6. Backend Implementation (Next Steps)

All backend functionality has been decoupled. The `src/services/` directory contains placeholder functions that clearly define the API the frontend expects.

To implement a backend:
1.  Choose a backend technology (e.g., Node.js with Express, Python with Django/FastAPI, or a serverless solution).
2.  Implement the API endpoints that match the function signatures in the `src/services/` files.
3.  Replace the placeholder logic inside the service functions with actual `fetch` calls to your new backend API.
4.  Implement a database (e.g., PostgreSQL, MongoDB, Firestore) and connect it to your backend.
5.  Set up a real authentication system (e.g., using JWTs, OAuth) and update the `src/services/auth.ts` and `src/types/user.ts` files to reflect your authentication strategy.

This blueprint provides a clear path for development and ensures a clean separation between the frontend and any future backend.

