// ====== STUDENT DASHBOARD DATA ======

// Upcoming classes for students
export const scheduledClasses = [
  {
    id: 'class-1',
    subject: 'Advanced Mathematics',
    teacher: 'Dr. Sarah Johnson',
    time: '10:00 AM',
    date: '2026-02-11',
    topic: 'Calculus - Integration Techniques',
    duration: '60 min',
    status: 'upcoming',
    studentCount: 28,
    color: 'primary',
  },
  {
    id: 'class-2',
    subject: 'Computer Science',
    teacher: 'Prof. Michael Chen',
    time: '2:00 PM',
    date: '2026-02-11',
    topic: 'Data Structures - Binary Trees',
    duration: '90 min',
    status: 'upcoming',
    studentCount: 32,
    color: 'purple',
  },
  {
    id: 'class-3',
    subject: 'Physics',
    teacher: 'Dr. Emily Parker',
    time: '11:00 AM',
    date: '2026-02-12',
    topic: 'Quantum Mechanics - Wave Functions',
    duration: '75 min',
    status: 'upcoming',
    studentCount: 25,
    color: 'cyan',
  },
  {
    id: 'class-4',
    subject: 'English Literature',
    teacher: 'Prof. James Wilson',
    time: '3:30 PM',
    date: '2026-02-12',
    topic: 'Shakespeare - Hamlet Analysis',
    duration: '60 min',
    status: 'upcoming',
    studentCount: 30,
    color: 'amber',
  },
]

// Weekly schedule / timetable
export const weeklySchedule = [
  { day: 'Mon', slots: [
    { time: '9:00 AM', subject: 'Mathematics', teacher: 'Dr. Sarah Johnson', color: 'primary' },
    { time: '11:00 AM', subject: 'Physics', teacher: 'Dr. Emily Parker', color: 'cyan' },
    { time: '2:00 PM', subject: 'Computer Science', teacher: 'Prof. Michael Chen', color: 'purple' },
  ]},
  { day: 'Tue', slots: [
    { time: '10:00 AM', subject: 'English Literature', teacher: 'Prof. James Wilson', color: 'amber' },
    { time: '1:00 PM', subject: 'Mathematics', teacher: 'Dr. Sarah Johnson', color: 'primary' },
  ]},
  { day: 'Wed', slots: [
    { time: '9:00 AM', subject: 'Physics', teacher: 'Dr. Emily Parker', color: 'cyan' },
    { time: '11:00 AM', subject: 'Computer Science', teacher: 'Prof. Michael Chen', color: 'purple' },
    { time: '3:00 PM', subject: 'English Literature', teacher: 'Prof. James Wilson', color: 'amber' },
  ]},
  { day: 'Thu', slots: [
    { time: '10:00 AM', subject: 'Mathematics', teacher: 'Dr. Sarah Johnson', color: 'primary' },
    { time: '2:00 PM', subject: 'Physics', teacher: 'Dr. Emily Parker', color: 'cyan' },
  ]},
  { day: 'Fri', slots: [
    { time: '9:00 AM', subject: 'Computer Science', teacher: 'Prof. Michael Chen', color: 'purple' },
    { time: '11:00 AM', subject: 'English Literature', teacher: 'Prof. James Wilson', color: 'amber' },
    { time: '1:00 PM', subject: 'Mathematics', teacher: 'Dr. Sarah Johnson', color: 'primary' },
  ]},
]

// Teacher notes and topics
export const teacherNotes = [
  {
    id: 'note-1',
    classId: 'class-1',
    subject: 'Advanced Mathematics',
    teacher: 'Dr. Sarah Johnson',
    title: 'Integration by Parts Formula',
    topic: 'Integration Techniques',
    content: 'Please review the integration by parts formula before class.',
    attachments: ['integration_formula.pdf', 'practice_problems.pdf'],
    date: '2026-02-08',
    isImportant: true,
    color: 'primary',
  },
  {
    id: 'note-2',
    classId: 'class-2',
    subject: 'Computer Science',
    title: 'Binary Tree Implementation',
    topic: 'Data Structures',
    teacher: 'Prof. Michael Chen',
    content: 'Prepare your IDE. We will implement binary tree traversal algorithms.',
    attachments: ['tree_template.zip'],
    date: '2026-02-08',
    isImportant: false,
    color: 'purple',
  },
  {
    id: 'note-3',
    classId: 'class-3',
    subject: 'Physics',
    title: 'Prerequisite Reading',
    topic: 'Quantum Mechanics',
    teacher: 'Dr. Emily Parker',
    content: 'Read Chapter 7: Introduction to Quantum Mechanics.',
    attachments: [],
    date: '2026-02-07',
    isImportant: false,
    color: 'cyan',
  },
  {
    id: 'note-4',
    classId: 'class-4',
    subject: 'English Literature',
    title: 'Hamlet Act 3 Summary',
    topic: 'Shakespeare',
    teacher: 'Prof. James Wilson',
    content: 'Review the summary of Act 3 before the discussion.',
    attachments: ['hamlet_act3_notes.pdf'],
    date: '2026-02-07',
    isImportant: false,
    color: 'amber',
  },
]

export const notesAndTopics = teacherNotes

// Recorded sessions for students
export const recordedSessions = [
  {
    id: 'rec-1',
    className: 'Advanced Mathematics',
    subject: 'Calculus',
    date: '2026-02-07',
    duration: '58 min',
    teacher: 'Dr. Sarah Johnson',
    thumbnail: null,
    color: 'primary',
  },
  {
    id: 'rec-2',
    className: 'Computer Science',
    subject: 'Data Structures',
    date: '2026-02-06',
    duration: '1h 25 min',
    teacher: 'Prof. Michael Chen',
    thumbnail: null,
    color: 'purple',
  },
  {
    id: 'rec-3',
    className: 'Physics',
    subject: 'Quantum Mechanics',
    date: '2026-02-05',
    duration: '1h 12 min',
    teacher: 'Dr. Emily Parker',
    thumbnail: null,
    color: 'cyan',
  },
]

// Notifications / announcements for students
export const studentNotifications = [
  {
    id: 'notif-1',
    type: 'announcement',
    title: 'Mid-Term Exam Schedule Released',
    message: 'The mid-term examination schedule has been published. Check your calendar.',
    time: '2 hours ago',
    isRead: false,
  },
  {
    id: 'notif-2',
    type: 'reminder',
    title: 'Assignment Due Tomorrow',
    message: 'Mathematics Assignment #4 is due by 11:59 PM tomorrow.',
    time: '5 hours ago',
    isRead: false,
  },
  {
    id: 'notif-3',
    type: 'info',
    title: 'New Notes Uploaded',
    message: 'Dr. Emily Parker uploaded notes for Quantum Mechanics - Wave Functions.',
    time: '1 day ago',
    isRead: true,
  },
  {
    id: 'notif-4',
    type: 'announcement',
    title: 'Campus Holiday Notice',
    message: 'Classes suspended on Feb 15 for annual day celebrations.',
    time: '2 days ago',
    isRead: true,
  },
]

// ====== TEACHER DASHBOARD DATA ======

// Today's classes for teachers
export const todayClasses = [
  {
    id: 'tc-1',
    className: 'Advanced Mathematics',
    batch: 'Batch A - Section 1',
    time: '10:00 AM - 11:00 AM',
    studentCount: 28,
    status: 'upcoming',
    color: 'primary',
  },
  {
    id: 'tc-2',
    className: 'Calculus for Engineers',
    batch: 'Batch B - Section 2',
    time: '2:00 PM - 3:30 PM',
    studentCount: 35,
    status: 'upcoming',
    color: 'purple',
  },
  {
    id: 'tc-3',
    className: 'Linear Algebra',
    batch: 'Batch A - Section 3',
    time: '4:00 PM - 5:00 PM',
    studentCount: 22,
    status: 'completed',
    color: 'cyan',
  },
]

// Teacher announcements
export const teacherAnnouncements = [
  {
    id: 'ta-1',
    title: 'Assignment Submission Deadline Extended',
    message: 'Assignment #4 deadline extended to Feb 15. Please submit via the portal.',
    date: '2026-02-10',
    priority: 'high',
  },
  {
    id: 'ta-2',
    title: 'Lab Session Rescheduled',
    message: 'The Computer Science lab session on Feb 12 is rescheduled to Feb 13.',
    date: '2026-02-09',
    priority: 'medium',
  },
  {
    id: 'ta-3',
    title: 'Guest Lecture Tomorrow',
    message: 'Prof. Alan Turing will deliver a guest lecture on AI Ethics at 11 AM.',
    date: '2026-02-08',
    priority: 'normal',
  },
]

// ====== SHARED / ENGAGEMENT DATA ======

// Mock students with engagement data
export const mockStudents = [
  { id: 1, name: 'Alice Johnson', email: 'alice@email.com', engagement: 92, status: 'active', avatar: 'AJ' },
  { id: 2, name: 'Bob Smith', email: 'bob@email.com', engagement: 78, status: 'active', avatar: 'BS' },
  { id: 3, name: 'Carol Williams', email: 'carol@email.com', engagement: 45, status: 'distracted', avatar: 'CW' },
  { id: 4, name: 'David Brown', email: 'david@email.com', engagement: 88, status: 'active', avatar: 'DB' },
  { id: 5, name: 'Emma Davis', email: 'emma@email.com', engagement: 95, status: 'active', avatar: 'ED' },
  { id: 6, name: 'Frank Miller', email: 'frank@email.com', engagement: 35, status: 'distracted', avatar: 'FM' },
  { id: 7, name: 'Grace Wilson', email: 'grace@email.com', engagement: 82, status: 'active', avatar: 'GW' },
  { id: 8, name: 'Henry Taylor', email: 'henry@email.com', engagement: 71, status: 'active', avatar: 'HT' },
  { id: 9, name: 'Ivy Anderson', email: 'ivy@email.com', engagement: 0, status: 'absent', avatar: 'IA' },
  { id: 10, name: 'Jack Thomas', email: 'jack@email.com', engagement: 89, status: 'active', avatar: 'JT' },
  { id: 11, name: 'Kate Martinez', email: 'kate@email.com', engagement: 52, status: 'distracted', avatar: 'KM' },
  { id: 12, name: 'Leo Garcia', email: 'leo@email.com', engagement: 91, status: 'active', avatar: 'LG' },
]

export const studentsEngagement = mockStudents

// Mock attendance data
export const mockAttendance = [
  { id: 1, name: 'Alice Johnson', email: 'alice@email.com', status: 'present', joinTime: '10:02 AM', engagementScore: 92 },
  { id: 2, name: 'Bob Smith', email: 'bob@email.com', status: 'present', joinTime: '10:01 AM', engagementScore: 78 },
  { id: 3, name: 'Carol Williams', email: 'carol@email.com', status: 'present', joinTime: '10:05 AM', engagementScore: 45 },
  { id: 4, name: 'David Brown', email: 'david@email.com', status: 'present', joinTime: '10:00 AM', engagementScore: 88 },
  { id: 5, name: 'Emma Davis', email: 'emma@email.com', status: 'present', joinTime: '10:01 AM', engagementScore: 95 },
  { id: 6, name: 'Frank Miller', email: 'frank@email.com', status: 'present', joinTime: '10:08 AM', engagementScore: 35 },
  { id: 7, name: 'Grace Wilson', email: 'grace@email.com', status: 'present', joinTime: '10:03 AM', engagementScore: 82 },
  { id: 8, name: 'Henry Taylor', email: 'henry@email.com', status: 'present', joinTime: '10:04 AM', engagementScore: 71 },
  { id: 9, name: 'Ivy Anderson', email: 'ivy@email.com', status: 'absent', joinTime: '-', engagementScore: 0 },
  { id: 10, name: 'Jack Thomas', email: 'jack@email.com', status: 'present', joinTime: '10:02 AM', engagementScore: 89 },
  { id: 11, name: 'Kate Martinez', email: 'kate@email.com', status: 'present', joinTime: '10:07 AM', engagementScore: 52 },
  { id: 12, name: 'Leo Garcia', email: 'leo@email.com', status: 'present', joinTime: '10:01 AM', engagementScore: 91 },
]

export const attendanceData = mockAttendance

// Mock chat messages
export const mockMessages = [
  { id: 1, sender: 'Alice Johnson', message: 'Great explanation!', time: '10:15 AM', role: 'student' },
  { id: 2, sender: 'Dr. Sarah Johnson', message: 'Thank you! Any questions?', time: '10:16 AM', role: 'teacher' },
  { id: 3, sender: 'Bob Smith', message: 'Yes, can you explain step 3 again?', time: '10:17 AM', role: 'student' },
  { id: 4, sender: 'Dr. Sarah Johnson', message: 'Sure, let me go over it once more', time: '10:18 AM', role: 'teacher' },
]

// Mock student doubts/questions
export const mockDoubts = [
  { id: 1, studentName: 'Carol Williams', question: 'Can you explain the integration formula again?', time: '10:15 AM', status: 'pending' },
  { id: 2, studentName: 'Frank Miller', question: 'I am having trouble understanding the concept', time: '10:18 AM', status: 'pending' },
  { id: 3, studentName: 'Kate Martinez', question: 'Could you provide more examples?', time: '10:22 AM', status: 'resolved' },
]

export const studentDoubts = mockDoubts

// Engagement statistics
export const engagementStats = {
  averageEngagement: 100,
  presentStudents: 11,
  absentStudents: 1,
  totalStudents: 12,
  highEngagement: 7,
  lowEngagement: 4,
}
