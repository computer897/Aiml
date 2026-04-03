# 🎨 Component Showcase - Virtual Classroom SaaS UI

This file showcases all components and pages with visual examples and descriptions.

---

## 📊 Dashboard Cards

### Example Implementation

```jsx
import { DashboardCard } from '@/components/SaaS';
import { Users, BarChart3, Calendar, TrendingUp } from 'lucide-react';

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <DashboardCard
    icon={Users}
    title="Total Students"
    value="156"
    unit="students"
    trend={12}
    trendUp={true}
  />
  <DashboardCard
    icon={BarChart3}
    title="Avg Attendance"
    value="92.5"
    unit="%"
    trend={5}
    trendUp={true}
  />
  <DashboardCard
    icon={Calendar}
    title="Active Classes"
    value="5"
    unit="classes"
  />
  <DashboardCard
    icon={TrendingUp}
    title="Avg Performance"
    value="8.4"
    unit="/10"
    trend={3}
    trendUp={true}
  />
</div>
```

### Visual Result
```
┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│        👥           │        📊           │        📅           │        📈           │
│  Total Students     │  Avg Attendance     │  Active Classes     │  Avg Performance    │
│       156           │       92.5%         │         5           │       8.4/10        │
│    students ↑ 12%   │     % ↑ 5%         │                     │      /10 ↑ 3%       │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

---

## 🎓 Classroom Cards

### Example: Class Grid

```jsx
import { ClassroomCard } from '@/components/SaaS';

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <ClassroomCard
    title="Introduction to React"
    instructor="Dr. Sarah Wilson"
    progress={65}
    status="ongoing"
    students={32}
    image="https://..."
  />
  <ClassroomCard
    title="Advanced JavaScript"
    instructor="Dr. Sarah Wilson"
    progress={45}
    status="ongoing"
    students={28}
    image="https://..."
  />
</div>
```

### Visual Result
```
┌──────────────────────────────┬──────────────────────────────┐
│  [Image Preview]             │  [Image Preview]             │
│  🎬                          │  🎬                          │
│  [ONGOING]                   │  [ONGOING]                   │
├──────────────────────────────┼──────────────────────────────┤
│ Introduction to React        │ Advanced JavaScript          │
│ Dr. Sarah Wilson             │ Dr. Sarah Wilson             │
│ 👥 32 students               │ 👥 28 students               │
│ Progress: ████████░░ 65%     │ Progress: █████░░░░░ 45%     │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 📢 Announcement Cards

### Example: Feed

```jsx
import { AnnouncementCard } from '@/components/SaaS';

<AnnouncementCard
  author="Dr. Sarah Wilson"
  avatar="https://..."
  role="Professor"
  title="Class Schedule Update"
  description="Next class rescheduled to Thursday at 3 PM..."
  timestamp="2 hours ago"
  image="https://..."
  likes={12}
  comments={3}
  shares={1}
/>
```

### Visual Result
```
┌─────────────────────────────────────────────────────────────┐
│ [Avatar] Dr. Sarah Wilson                        [⋮]       │
│          Professor                                           │
│ 2 hours ago                                                  │
├─────────────────────────────────────────────────────────────┤
│ Class Schedule Update                                       │
│ Next class rescheduled to Thursday at 3 PM.                 │
│ [Image Preview]                                             │
├─────────────────────────────────────────────────────────────┤
│ ❤️ 12    💬 3    🔗 1                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Monitoring Widget

### Example: Real-time Status

```jsx
import { AIMonitoringWidget } from '@/components/SaaS';

<AIMonitoringWidget
  isActive={true}
  faceDetected={true}
  focusScore={85}
  engagementLevel="High"
  alerts={['Student not detected']}
/>
```

### Visual Result
```
┌─────────────────────────────────────────────┐
│ AI Monitoring                    🟢 Active  │
├─────────────────────────────────────────────┤
│ 📷 Face Detection                           │
│ ✅ Detected                                 │
├─────────────────────────────────────────────┤
│ Focus Score         85%                      │
│ ████████████████░░                          │
├─────────────────────────────────────────────┤
│ Engagement          High                     │
│ ✅ HIGH                                     │
├─────────────────────────────────────────────┤
│ Active Alerts                               │
│ ⚠️ Student not detected                    │
├─────────────────────────────────────────────┤
│ 💡 Insight: Keep current pace               │
└─────────────────────────────────────────────┘
```

---

## 📋 Attendance Panel

### Example: Student List

```jsx
import { AttendancePanel } from '@/components/SaaS';

<AttendancePanel students={[
  { name: 'Alice Johnson', rollNo: 'S001', status: 'present', avatar: '...' },
  { name: 'Bob Smith', rollNo: 'S002', status: 'late', avatar: '...' },
  { name: 'Carol White', rollNo: 'S003', status: 'absent', avatar: '...' },
]} />
```

### Visual Result
```
┌──────────────────────────────────────────────────┐
│ Attendance Summary            Present: 94%       │
├──────────────────────────────────────────────────┤
│ ✅ Present  30  ⏱️ Late  2  ❌ Absent  3         │
├──────────────────────────────────────────────────┤
│ [👤] Alice Johnson      S001    ✅ Present      │
│ [👤] Bob Smith          S002    ⏱️ Late         │
│ [👤] Carol White        S003    ❌ Absent       │
└──────────────────────────────────────────────────┘
```

---

## 👤 Profile Card

### Example: User Profile

```jsx
import { ProfileCard } from '@/components/SaaS';

<ProfileCard
  name="Alex Johnson"
  role="Student"
  avatar="https://..."
  bio="Passionate about web development"
  email="alex@university.edu"
  phone="+1 555-1234"
  location="San Francisco, CA"
  stats={[
    { label: 'Courses', value: '8' },
    { label: 'GPA', value: '3.8' },
    { label: 'Attendance', value: '94%' },
  ]}
/>
```

### Visual Result
```
┌──────────────────────────────────────────┐
│ [BLUE GRADIENT HEADER]                   │
│                                          │
│          [Large Avatar]                  │
│      Alex Johnson              [Edit]    │
│      Student                            │
│                                          │
│  Passionate about web development       │
├──────────────────────────────────────────┤
│ ✉️  alex@university.edu                 │
│ 📱 +1 555-1234                          │
│ 📍 San Francisco, CA                    │
├──────────────────────────────────────────┤
│     8          3.8         94%           │
│  Courses       GPA      Attendance       │
└──────────────────────────────────────────┘
```

---

## 🎥 Video Class Interface

### Example: Live Class

```jsx
import { VideoClassUI } from '@/components/SaaS';

<VideoClassUI
  isVideoOn={true}
  isAudioOn={true}
  isScreenSharing={false}
  onToggleVideo={() => {}}
  onToggleAudio={() => {}}
  onToggleScreenShare={() => {}}
  onEndCall={() => {}}
  onChat={() => {}}
/>
```

### Visual Result
```
┌──────────────────────────────────────────────────────────┐
│ Classroom Session                🔴 Recording  32 👥    │
│ AI Monitoring Active                          ✓ Detected │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                  [VIDEO FEED]                            │
│                                                          │
│                                                          │
│             [Participant Grid (Bottom Left)]             │
├──────────────────────────────────────────────────────────┤
│            🎤  📹  📺  💬    [☎️]  ⋮               │
│           Contols at Bottom                             │
└──────────────────────────────────────────────────────────┘
```

---

## ⚙️ Settings Panel

### Example: Settings Configuration

```jsx
import { SettingsPanel } from '@/components/SaaS';

<SettingsPanel
  onSettingsChange={(settings) => console.log(settings)}
/>
```

### Visual Result
```
┌──────────────────────────────────────────────────────┐
│ Settings                                             │
├──────────────────────────────────────────────────────┤
│ 🔔 Notifications                                     │
│  • Push Notifications              [Toggle ON]      │
│  • Email Digest                    [Toggle ON]      │
│  • Sound Alerts                    [Toggle OFF]     │
├──────────────────────────────────────────────────────┤
│ 🔒 Privacy & Security                                │
│  • Share Activity                  [Toggle ON]      │
│  • Two-Factor Authentication       [Toggle OFF]     │
├──────────────────────────────────────────────────────┤
│ 🌙 Appearance                                        │
│  • Dark Mode                       [Toggle OFF]     │
└──────────────────────────────────────────────────────┘
```

---

## 🧭 Sidebar Navigation

### Example: Navigation Menu

```jsx
import { SidebarNav } from '@/components/SaaS';

<SidebarNav
  items={[
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'classes', label: 'My Classes', icon: Users, badge: '5' },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'announcements', label: 'Announcements', icon: Bell },
  ]}
  activeItem="dashboard"
  userProfile={{
    name: 'Dr. Sarah Wilson',
    role: 'Professor',
    avatar: 'https://...'
  }}
/>
```

### Visual Result
```
┌───────────────────────────────┐
│  C  ClassRoom                 │
├───────────────────────────────┤
│                               │
│ 📊 Dashboard                  │ ← Active
│ 👥 My Classes          [5]    │
│ 📅 Attendance                 │
│ 🔔 Announcements              │
│ ⚙️ Settings                   │
│                               │
├───────────────────────────────┤
│ [Avatar] Dr. Sarah Wilson     │
│          Professor            │
│                               │
│ 🚪 Logout                     │
└───────────────────────────────┘
```

---

## 🔘 Button Component

### Example: Button Variants

```jsx
import { Button } from '@/components/SaaS';
import { ArrowRight, Trash2 } from 'lucide-react';

<div className="space-y-4">
  {/* Primary Button */}
  <Button variant="primary" size="lg" fullWidth icon={ArrowRight}>
    Sign In
  </Button>

  {/* Secondary Button */}
  <Button variant="secondary" size="md">
    Cancel
  </Button>

  {/* Outline Button */}
  <Button variant="outline" fullWidth>
    Edit Profile
  </Button>

  {/* Ghost Button */}
  <Button variant="ghost">
    Learn More
  </Button>

  {/* Danger Button */}
  <Button variant="danger" icon={Trash2}>
    Delete
  </Button>

  {/* Loading State */}
  <Button isLoading fullWidth>
    Processing...
  </Button>
</div>
```

### Visual Result
```
┌─────────────────────────────────────┐
│  [→] Sign In                        │  ← Primary (Blue)
├─────────────────────────────────────┤
│  Cancel                             │  ← Secondary (Gray)
├─────────────────────────────────────┤
│  Edit Profile                       │  ← Outline
├─────────────────────────────────────┤
│  Learn More                         │  ← Ghost
├─────────────────────────────────────┤
│  [🗑] Delete                         │  ← Danger (Red)
├─────────────────────────────────────┤
│  ⟳ Processing...                    │  ← Loading
└─────────────────────────────────────┘
```

---

## 📄 Complete Page Example: Teacher Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│ Welcome back, Dr. Wilson!                       [+ New Class]      │
│ Here's what's happening in your classroom today.                  │
├─────────────────────────────────────────────────────────────────────┤
│
│  ┌──────────────────────────────────────────────────────────────┐
│  │  👥 156         📊 92.5%      📅 5         📈 8.4/10         │
│  │  Total Students   Avg Attend   Active      Avg Perf ↑3%      │
│  └──────────────────────────────────────────────────────────────┘
│
│  ┌─────────────────────────────────────┐  ┌───────────────────┐
│  │ My Active Classes                   │  │ 🤖 AI Monitoring  │
│  │                                     │  │ 🟢 Active        │
│  │ [Card 1] [Card 2]                   │  │ ✅ Face Detected  │
│  │                                     │  │ Focus: 85%        │
│  │ Recent Announcements                │  │ Engagement: High  │
│  │                                     │  │                   │
│  │ [Announcement 1]                    │  ├───────────────────┤
│  │                                     │  │ Quick Stats       │
│  │ [Announcement 2]                    │  │ Classes: 3        │
│  │                                     │  │ Online: 42        │
│  │                                     │  │ Pending: 7        │
│  └─────────────────────────────────────┘  └───────────────────┘
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Layout Patterns

### Full Page with Sidebar

```jsx
<div className="flex h-screen bg-gray-50">
  <SidebarNav items={navItems} userProfile={userProfile} />
  
  <div className="flex-1 overflow-auto">
    <div className="p-8 space-y-8">
      {/* Page content */}
    </div>
  </div>
</div>
```

### Centered Content (Auth Pages)

```jsx
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
  <div className="w-full max-w-md">
    {/* Content centered */}
  </div>
</div>
```

### Two-Column Layout

```jsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">
    {/* Main content (2/3 width) */}
  </div>
  <div>
    {/* Sidebar (1/3 width) */}
  </div>
</div>
```

---

## 🎨 Color Usage

```jsx
// Primary Blue
className="text-primary-600 bg-primary-50 border-primary-200"

// Status Colors
className="bg-green-100 text-green-700"  // Success
className="bg-yellow-100 text-yellow-700" // Warning
className="bg-red-100 text-red-700"       // Error

// Gradients
className="bg-gradient-to-r from-blue-500 to-indigo-600"
className="bg-gradient-to-br from-green-50 to-green-100"

// Neutral
className="bg-white border-gray-100"
className="text-gray-600"
className="hover:bg-gray-50"
```

---

## 📱 Responsive Breakdowns

```
Mobile (< 768px):
- Single column layouts
- Full-width cards
- Stacked sidebars
- Touch-friendly sizing

Tablet (768px - 1024px):
- 2-column grids
- Side sidebars collapse
- Medium cards

Desktop (> 1024px):
- 3-4 column grids
- Fixed sidebars
- Full layouts
- Multiple cards side-by-side
```

---

✨ **All components are production-ready and fully documented!**

For detailed implementation guides, see:
- [SAAS_UI_DESIGN_SYSTEM.md](./SAAS_UI_DESIGN_SYSTEM.md) - Complete design system
- [SAAS_QUICK_START.md](./SAAS_QUICK_START.md) - Integration guide
