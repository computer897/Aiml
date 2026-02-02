// Mock scheduled classes
export const scheduledClasses = [
  {
    id: 'class-1',
    subject: 'Advanced Mathematics',
    teacher: 'Dr. Sarah Johnson',
    time: '10:00 AM',
    date: '2026-02-05',
    topic: 'Calculus - Integration Techniques',
    duration: '60 min',
    status: 'upcoming',
    studentCount: 28
  },
  {
    id: 'class-2',
    subject: 'Computer Science',
    teacher: 'Prof. Michael Chen',
    time: '2:00 PM',
    date: '2026-02-05',
    topic: 'Data Structures - Binary Trees',
    duration: '90 min',
    status: 'upcoming',
    studentCount: 32
  },
  {
    id: 'class-3',
    subject: 'Physics',
    teacher: 'Dr. Emily Parker',
    time: '11:00 AM',
    date: '2026-02-06',
    topic: 'Quantum Mechanics - Wave Functions',
    duration: '75 min',
    status: 'upcoming',
    studentCount: 25
  },
  {
    id: 'class-4',
    subject: 'English Literature',
    teacher: 'Prof. James Wilson',
    time: '3:30 PM',
    date: '2026-02-06',
    topic: 'Shakespeare - Hamlet Analysis',
    duration: '60 min',
    status: 'upcoming',
    studentCount: 30
  }
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
    content: 'Please review the integration by parts formula before class. We will be solving complex problems.',
    attachments: ['integration_formula.pdf', 'practice_problems.pdf'],
    date: '2026-02-02',
    isImportant: true
  },
  {
    id: 'note-2',
    classId: 'class-2',
    subject: 'Computer Science',
    title: 'Binary Tree Implementation',
    topic: 'Data Structures',
    teacher: 'Prof. Michael Chen',
    content: 'Prepare your IDE with Java/Python. We will implement binary tree traversal algorithms.',
    attachments: ['tree_template.zip'],
    date: '2026-02-02',
    isImportant: false
  },
  {
    id: 'note-3',
    classId: 'class-3',
    subject: 'Physics',
    title: 'Prerequisite Reading',
    topic: 'Quantum Mechanics',
    teacher: 'Dr. Emily Parker',
    content: 'Read Chapter 7: Introduction to Quantum Mechanics from the textbook.',
    attachments: [],
    date: '2026-02-01',
    isImportant: false
  }
]

// For backwards compatibility
export const notesAndTopics = teacherNotes

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
  { id: 12, name: 'Leo Garcia', email: 'leo@email.com', engagement: 91, status: 'active', avatar: 'LG' }
]

// For backwards compatibility
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
  { id: 12, name: 'Leo Garcia', email: 'leo@email.com', status: 'present', joinTime: '10:01 AM', engagementScore: 91 }
]

// For backwards compatibility
export const attendanceData = mockAttendance

// Mock chat messages
export const mockMessages = [
  { id: 1, sender: 'Alice Johnson', message: 'Great explanation!', time: '10:15 AM', role: 'student' },
  { id: 2, sender: 'Dr. Sarah Johnson', message: 'Thank you! Any questions?', time: '10:16 AM', role: 'teacher' },
  { id: 3, sender: 'Bob Smith', message: 'Yes, can you explain step 3 again?', time: '10:17 AM', role: 'student' },
  { id: 4, sender: 'Dr. Sarah Johnson', message: 'Sure, let me go over it once more', time: '10:18 AM', role: 'teacher' }
]

// Mock student doubts/questions
export const mockDoubts = [
  { id: 1, studentName: 'Carol Williams', question: 'Can you explain the integration formula again?', time: '10:15 AM', status: 'pending' },
  { id: 2, studentName: 'Frank Miller', question: 'I am having trouble understanding the concept', time: '10:18 AM', status: 'pending' },
  { id: 3, studentName: 'Kate Martinez', question: 'Could you provide more examples?', time: '10:22 AM', status: 'resolved' }
]

// For backwards compatibility
export const studentDoubts = mockDoubts

// Engagement statistics
export const engagementStats = {
  averageEngagement: 73,
  presentStudents: 11,
  absentStudents: 1,
  totalStudents: 12,
  highEngagement: 7,
  lowEngagement: 4
}
