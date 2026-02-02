# Quick Start Guide

## Getting Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open Browser
Navigate to: http://localhost:5173/

---

## Test Accounts

### Student Login
- **Role**: Select "Student"
- **Email**: student@example.com (any email works)
- **Password**: password (any password works)

### Teacher Login
- **Role**: Select "Teacher"
- **Email**: teacher@example.com (any email works)
- **Password**: password (any password works)

---

## Quick Navigation

### Student Flow
1. Login as Student
2. View scheduled classes on dashboard
3. Click "Join Classroom" to enter virtual class
4. Use "Raise Doubt" button to ask questions
5. Chat with teacher and classmates
6. Message teachers from dashboard

### Teacher Flow
1. Login as Teacher
2. Click "Create Classroom" to schedule new class
3. View engagement statistics
4. Monitor attendance table
5. Click "Start Class" to enter classroom
6. View real-time student engagement
7. Manage student doubts from classroom
8. Download attendance reports

---

## Key Features to Test

✅ **Authentication**
- Login/Signup with role selection
- Persistent login state
- Logout functionality

✅ **Student Dashboard**
- Scheduled classes list
- Teacher notes section
- Message teacher form
- Join classroom button

✅ **Teacher Dashboard**
- Create classroom modal
- Engagement statistics (3 cards)
- Complete attendance table
- Download report button

✅ **Classroom Interface**
- Mic ON/OFF toggle
- Video ON/OFF toggle
- Chat panel with messages
- Student: Raise doubt button
- Teacher: View doubts panel
- Left panel: Student engagement list
- Leave classroom button

---

## Responsive Testing

Test on different screen sizes:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

All layouts are fully responsive!

---

## Build for Production

```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

---

## Tech Stack
- ⚛️ React 18.2
- ⚡ Vite 5.1
- 🎨 Tailwind CSS 3.4
- 🧭 React Router v6
- 🎯 Lucide React Icons

---

## Project Structure
```
src/
├── pages/           # Main page components
├── components/      # Reusable UI components
├── layouts/         # Layout wrappers
├── data/           # Mock data
├── App.jsx         # Routing configuration
└── main.jsx        # Entry point
```

---

## Need Help?

Refer to README.md for complete documentation.

**Happy coding! 🚀**
