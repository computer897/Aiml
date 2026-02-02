# Virtual Classroom - Real-Time Student Engagement Monitoring

A production-ready frontend application for real-time student engagement monitoring in virtual classrooms, built with React, Vite, Tailwind CSS, and React Router v6.

## 🚀 Features

### Authentication
- **Login & Sign Up** pages with role selection (Student/Teacher)
- Email and password authentication (mock implementation)
- Persistent login state using localStorage
- Clean, professional UI with gradient designs

### Student Dashboard
- **Join Classroom** - Quick access button to enter virtual classroom
- **Scheduled Classes** - View upcoming classes with subject, teacher, topic, date, and time
- **Notes & Topics** - Access teacher-shared notes and important materials
- **Message Teacher** - Direct communication channel for doubts and questions
- Fully responsive card-based layout
- Real-time updates and notifications

### Teacher Dashboard
- **Create Classroom** - Modal form to schedule new classes with:
  - Class title and topic
  - Date and time selection
  - Notes attachment (UI)
  - Duration selection
- **Engagement Statistics Panel**:
  - Average engagement percentage
  - Present students count
  - Absent students count
  - Visual indicators with color-coded metrics
- **Attendance Table**:
  - Complete student roster
  - Real-time attendance status
  - Individual engagement scores
  - Join/Leave time tracking
  - Download Excel report functionality (UI)
- Quick actions for starting live classes

### Classroom (Google Meet-like UI)
#### Shared Features (Student & Teacher)
- **Video Controls**:
  - Microphone ON/OFF toggle
  - Video Camera ON/OFF toggle
  - Real-time status indicators
- **Chat Panel**:
  - Send and receive messages
  - Timestamps for all messages
  - Role-based message styling (teacher/student)
- **Main Presenter Screen**:
  - Large center video area
  - Screen sharing indicators
  - User avatar display when camera is off

#### Student-Specific Features
- **Doubt Button**: Raise questions directly to the teacher
- Instant doubt submission with notifications

#### Teacher-Specific Features
- **Doubts Panel**: View and manage student questions
  - Pending doubts counter
  - Mark doubts as resolved
  - Dismiss doubts
  - Real-time notifications
- **Engagement List**: 
  - Real-time student engagement tracking
  - Color-coded engagement levels (Active/Distracted/Absent)
  - Individual engagement percentages
  - Visual alerts for distracted students

## 🛠️ Tech Stack

- **React 18.2** - UI library
- **Vite 5.1** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Lucide React** - Modern icon library
- **JavaScript** - Programming language

## 📁 Project Structure

```
src/
├── pages/
│   ├── Login.jsx              # Login page with role selection
│   ├── SignUp.jsx             # Registration page
│   ├── StudentDashboard.jsx   # Student main dashboard
│   ├── TeacherDashboard.jsx   # Teacher main dashboard
│   └── Classroom.jsx          # Virtual classroom interface
├── components/
│   ├── ClassCard.jsx          # Class information card
│   ├── NoteCard.jsx           # Teacher notes display
│   ├── EngagementStats.jsx    # Statistics panel
│   ├── AttendanceTable.jsx    # Student attendance table
│   ├── CreateClassModal.jsx   # Class creation modal
│   ├── ChatPanel.jsx          # Chat interface
│   ├── EngagementList.jsx     # Student engagement list
│   └── DoubtsPanel.jsx        # Doubts management panel
├── layouts/
│   └── DashboardLayout.jsx    # Reusable layout wrapper
├── data/
│   └── mockData.js            # Mock data for testing
├── App.jsx                    # Main app with routing
├── main.jsx                   # App entry point
└── index.css                  # Global styles and Tailwind

```

## 🚦 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
cd "d:\Gilbert\NEW PROJECT\AlML"
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:5173/
```

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## 👤 User Roles & Access

### Student Access
- Login with role: **Student**
- Access to:
  - Student Dashboard
  - Join Classroom
  - View scheduled classes
  - Access teacher notes
  - Message teachers
  - Raise doubts in classroom

### Teacher Access
- Login with role: **Teacher**
- Access to:
  - Teacher Dashboard
  - Create new classrooms
  - View engagement statistics
  - Monitor attendance
  - Download reports
  - Manage student doubts
  - View real-time engagement

## 🎨 Design Features

- **Modern UI**: Clean, professional design inspired by Google Meet/Microsoft Teams
- **Responsive Design**: Fully responsive for mobile, tablet, and desktop
- **Color Palette**: Gradient blues and purples with intuitive status colors
- **Smooth Animations**: Hover effects and transitions
- **Icon Library**: Lucide React icons throughout
- **Accessibility**: Semantic HTML and ARIA labels

## 📊 Mock Data

The application uses mock data located in `src/data/mockData.js`:
- Scheduled classes
- Teacher notes
- Student roster
- Attendance records
- Chat messages
- Student doubts
- Engagement statistics

## 🔧 Configuration Files

- **vite.config.js** - Vite configuration
- **tailwind.config.js** - Tailwind CSS configuration
- **postcss.config.js** - PostCSS configuration
- **package.json** - Dependencies and scripts

## 🌐 Routing Structure

```
/                       → Redirects to appropriate dashboard
/login                  → Login page
/signup                 → Sign up page
/student-dashboard      → Student dashboard (protected)
/teacher-dashboard      → Teacher dashboard (protected)
/classroom/:id          → Virtual classroom (protected)
```

## 🔐 Authentication

The application uses mock authentication with localStorage for state persistence:
- User data stored in localStorage
- Role-based route protection
- Automatic redirect on login/logout
- Protected routes for authenticated users only

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## 🎯 Key Components

### Navigation & Layout
- Sticky headers with user profile
- Logout functionality
- Settings and notifications icons
- Role-based navigation

### Dashboard Cards
- Hover effects and shadows
- Click-to-join functionality
- Status indicators
- Timestamp displays

### Real-time Features
- Engagement tracking display
- Live chat interface
- Doubt management system
- Attendance monitoring

## 📄 License

This project is created for educational purposes.

## 👨‍💻 Development

- **Code Style**: Clean, readable, and well-commented
- **Component Structure**: Reusable and modular
- **State Management**: React hooks (useState, useEffect)
- **Routing**: React Router v6 with protected routes

## 🚀 Future Enhancements (Backend Integration)

When connecting to a real backend:
- Replace mock authentication with JWT tokens
- Connect to WebSocket for real-time features
- Integrate video conferencing API (WebRTC)
- Add AI-based engagement detection
- Implement file upload functionality
- Add database for persistent storage

## 📞 Support

For issues or questions, please refer to the mock data and component structure documented in the code.

---

**Built with ❤️ using React, Vite, and Tailwind CSS**
