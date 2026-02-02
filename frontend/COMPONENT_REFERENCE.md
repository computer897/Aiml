# Component Reference Guide

## 📁 Project Structure

### Pages (src/pages/)

#### 1. Login.jsx
- **Purpose**: User authentication with role selection
- **Features**: 
  - Role toggle (Student/Teacher)
  - Email & password fields
  - Forgot password link
  - Sign up redirect
- **Route**: `/login`

#### 2. SignUp.jsx
- **Purpose**: New user registration
- **Features**:
  - Role selection
  - Full name field
  - Email & password
  - Confirm password
  - Login redirect
- **Route**: `/signup`

#### 3. StudentDashboard.jsx
- **Purpose**: Student main interface
- **Features**:
  - Join Classroom button
  - Scheduled classes list
  - Teacher notes section
  - Message teacher form
- **Route**: `/student-dashboard`
- **Protected**: Student role only

#### 4. TeacherDashboard.jsx
- **Purpose**: Teacher control panel
- **Features**:
  - Create classroom button
  - Engagement statistics
  - Attendance table
  - Start class button
- **Route**: `/teacher-dashboard`
- **Protected**: Teacher role only

#### 5. Classroom.jsx
- **Purpose**: Virtual classroom interface
- **Features**:
  - Video/Mic controls
  - Chat panel
  - Engagement sidebar
  - Doubts management
  - Role-specific features
- **Route**: `/classroom/:id`
- **Protected**: Authenticated users

---

### Components (src/components/)

#### 1. ClassCard.jsx
- **Purpose**: Display class information
- **Props**: 
  - `classItem` (object): Class details
  - `onJoin` (function): Join handler
- **Used in**: StudentDashboard

#### 2. NoteCard.jsx
- **Purpose**: Display teacher notes
- **Props**:
  - `note` (object): Note details with attachments
- **Used in**: StudentDashboard

#### 3. EngagementStats.jsx
- **Purpose**: Show engagement statistics
- **Props**:
  - `stats` (object): Statistics data
    - averageEngagement
    - presentStudents
    - absentStudents
    - totalStudents
- **Used in**: TeacherDashboard

#### 4. AttendanceTable.jsx
- **Purpose**: Display student attendance
- **Props**:
  - `attendanceData` (array): Student records
- **Features**:
  - Sortable columns
  - Download button
  - Status indicators
- **Used in**: TeacherDashboard

#### 5. CreateClassModal.jsx
- **Purpose**: Create new classroom
- **Props**:
  - `isOpen` (boolean): Modal visibility
  - `onClose` (function): Close handler
  - `onCreate` (function): Submit handler
- **Features**:
  - Form validation
  - Date/time picker
  - File upload UI
- **Used in**: TeacherDashboard

#### 6. ChatPanel.jsx
- **Purpose**: Chat interface
- **Props**:
  - `messages` (array): Chat messages
  - `onSendMessage` (function): Send handler
  - `currentUser` (object): Current user info
- **Used in**: Classroom

#### 7. EngagementList.jsx
- **Purpose**: Real-time engagement tracking
- **Props**:
  - `students` (array): Student engagement data
  - `onSelectStudent` (function): Select handler
- **Features**:
  - Color-coded status
  - Engagement percentages
  - Sort by engagement
- **Used in**: Classroom

#### 8. DoubtsPanel.jsx
- **Purpose**: Manage student doubts
- **Props**:
  - `doubts` (array): Doubts list
  - `onResolve` (function): Resolve handler
  - `onDismiss` (function): Dismiss handler
- **Used in**: Classroom (Teacher only)

#### 9. VideoPlayer.jsx
- **Purpose**: Video display component
- **Props**:
  - `user` (object): User information
  - `videoOn` (boolean): Video status
- **Used in**: Classroom

---

### Layouts (src/layouts/)

#### DashboardLayout.jsx
- **Purpose**: Reusable dashboard wrapper
- **Props**:
  - `children` (ReactNode): Content
  - `user` (object): User info
  - `onLogout` (function): Logout handler
  - `title` (string): Page title
- **Features**:
  - Sticky header
  - User profile
  - Notifications
  - Settings icon

---

### Data (src/data/)

#### mockData.js
**Exports:**

1. **scheduledClasses** (array)
   - Class schedule data
   - Fields: id, subject, teacher, time, date, topic, duration

2. **teacherNotes** (array)
   - Notes from teachers
   - Fields: id, title, content, attachments, date, isImportant

3. **mockStudents** (array)
   - Student roster
   - Fields: id, name, email, engagement, status, avatar

4. **mockAttendance** (array)
   - Attendance records
   - Fields: id, name, status, joinTime, engagementScore

5. **mockMessages** (array)
   - Chat messages
   - Fields: id, sender, message, time, role

6. **mockDoubts** (array)
   - Student doubts
   - Fields: id, studentName, question, time, status

7. **engagementStats** (object)
   - Statistics data
   - Fields: averageEngagement, presentStudents, absentStudents, totalStudents

---

## 🎨 Color Coding

### Status Colors
- **Active/Present**: Green (bg-green-100, text-green-700)
- **Distracted**: Yellow (bg-yellow-100, text-yellow-700)
- **Absent**: Red (bg-red-100, text-red-700)
- **Info**: Blue (bg-blue-100, text-blue-700)
- **Teacher**: Purple (bg-purple-600)

### Engagement Levels
- **High (80%+)**: Green
- **Medium (50-79%)**: Yellow
- **Low (<50%)**: Red

---

## 🔄 State Management

### App.jsx
- `user`: Current user object
- Manages: Authentication state

### StudentDashboard.jsx
- `messageText`: Message input
- `selectedTeacher`: Teacher selection

### TeacherDashboard.jsx
- `isModalOpen`: Modal visibility

### Classroom.jsx
- `micOn`: Microphone status
- `videoOn`: Video status
- `showChat`: Chat panel visibility
- `showEngagement`: Engagement panel visibility
- `showDoubts`: Doubts panel visibility
- `messages`: Chat messages array
- `doubts`: Doubts array

---

## 🛣️ Routing

```
/                      → Redirects based on auth
/login                 → Login page
/signup                → Sign up page
/student-dashboard     → Student dashboard (protected)
/teacher-dashboard     → Teacher dashboard (protected)
/classroom/:id         → Classroom (protected)
```

---

## 🎯 Props Flow

### Authentication Flow
```
App → Login/SignUp → setUser → App state → Dashboard
```

### Student Flow
```
StudentDashboard → ClassCard → Classroom
StudentDashboard → NoteCard (display)
StudentDashboard → Message Form (submit)
```

### Teacher Flow
```
TeacherDashboard → CreateClassModal → onCreate
TeacherDashboard → EngagementStats (display)
TeacherDashboard → AttendanceTable (display)
TeacherDashboard → Classroom
```

### Classroom Flow
```
Classroom → EngagementList (student tracking)
Classroom → ChatPanel (messaging)
Classroom → DoubtsPanel (teacher only)
Classroom → VideoPlayer (display)
```

---

## 📦 Import Patterns

### Common Imports
```jsx
// React
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Icons
import { Icon1, Icon2 } from 'lucide-react'

// Components
import Component from '../components/Component'

// Data
import { dataName } from '../data/mockData'
```

---

## 🎨 Styling Patterns

### Card Pattern
```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  {/* Content */}
</div>
```

### Button Pattern (Primary)
```jsx
<button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg">
  Button Text
</button>
```

### Input Pattern
```jsx
<input
  type="text"
  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
/>
```

---

## 🔧 Utility Functions

### Mock Authentication
```javascript
const mockUser = {
  id: Math.random().toString(36).substr(2, 9),
  email,
  role,
  name
}
```

### Navigation
```javascript
navigate('/path')
navigate(-1) // Go back
```

### LocalStorage
```javascript
localStorage.setItem('user', JSON.stringify(user))
localStorage.getItem('user')
localStorage.removeItem('user')
```

---

## 📱 Responsive Breakpoints

```
sm: 640px   // Small devices
md: 768px   // Medium devices
lg: 1024px  // Large devices
xl: 1280px  // Extra large devices
```

### Usage
```jsx
<div className="hidden sm:block">Desktop only</div>
<div className="block sm:hidden">Mobile only</div>
<div className="grid grid-cols-1 lg:grid-cols-3">Responsive grid</div>
```

---

**Reference this guide when:**
- Adding new components
- Understanding data flow
- Implementing new features
- Debugging issues
- Onboarding new developers
