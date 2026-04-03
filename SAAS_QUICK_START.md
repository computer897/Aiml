# 🎯 SAAS Platform - Quick Start Guide

## Installation & Setup

### 1. Dependencies Required
All components use:
- **React 18+** - UI framework
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icon library

```bash
npm install lucide-react
```

### 2. Tailwind Configuration
Ensure your `tailwind.config.js` includes the extended colors:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#eef4fb',
        100: '#d8e7f5',
        200: '#b5d1ed',
        300: '#85b5e2',
        400: '#5695d3',
        500: '#3578c0',
        600: '#285fa3',
        700: '#234d85',
        800: '#1e3a5f',
        900: '#1a3250',
        950: '#122236',
      },
      accent: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
      },
    },
  },
}
```

---

## 📦 Component Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── SaaS/
│   │   │   ├── DashboardCard.jsx
│   │   │   ├── ClassroomCard.jsx
│   │   │   ├── AnnouncementCard.jsx
│   │   │   ├── AIMonitoringWidget.jsx
│   │   │   ├── AttendancePanel.jsx
│   │   │   ├── ProfileCard.jsx
│   │   │   ├── VideoClassUI.jsx
│   │   │   ├── SettingsPanel.jsx
│   │   │   ├── SidebarNav.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   └── index.js (exports all)
│   │   └── (existing components)
│   ├── pages/
│   │   ├── SaaS/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── TeacherDashboard.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── ClassroomPage.jsx
│   │   │   ├── AttendancePage.jsx
│   │   │   ├── AnnouncementFeed.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── index.js (exports all)
│   │   └── (existing pages)
│   └── SaaSRouter.jsx (routing example)
└── ...
```

---

## 🚀 How to Use

### Option 1: Import Individual Components

```jsx
import { DashboardCard, Button } from '@/components/SaaS';
import { TrendingUp, Users } from 'lucide-react';

function MyComponent() {
  return (
    <DashboardCard
      icon={Users}
      title="Total Students"
      value="156"
      trend={12}
      trendUp={true}
    />
  );
}
```

### Option 2: Import Entire Pages

```jsx
import { TeacherDashboard } from '@/pages/SaaS';

function App() {
  return <TeacherDashboard />;
}
```

### Option 3: Use SaaSRouter

```jsx
import SaaSRouter from '@/SaaSRouter';

function App() {
  return <SaaSRouter />;
}
```

---

## 📱 Component Props Reference

### DashboardCard
```jsx
<DashboardCard
  icon={UsersIcon}                    // Lucide icon
  title="Total Students"              // string
  value="156"                          // string/number
  unit="students"                      // string (optional)
  trend={12}                           // number (optional)
  trendUp={true}                       // boolean (default: true)
  bgColor="bg-white"                  // Tailwind class
  accentColor="text-primary-600"      // Tailwind class
  className=""                         // Additional classes
  onClick={() => {}}                   // callback
/>
```

### ClassroomCard
```jsx
<ClassroomCard
  id={1}                               // string/number
  title="Introduction to React"        // string
  instructor="Dr. Sarah Wilson"        // string
  image="https://..."                  // URL
  progress={65}                        // 0-100
  status="ongoing"                     // 'ongoing' | 'completed' | 'upcoming'
  students={32}                        // number
  onClick={() => {}}                   // callback
/>
```

### AnnouncementCard
```jsx
<AnnouncementCard
  id={1}                               // string/number
  author="Dr. Sarah Wilson"            // string
  avatar="https://..."                 // Avatar URL
  role="Professor"                     // string
  title="Class Update"                 // string
  description="..."                    // string
  timestamp="2 hours ago"              // string
  image="https://..."                  // Optional image URL
  likes={12}                           // number
  comments={3}                         // number
  shares={1}                           // number
  liked={false}                        // boolean
  onClick={() => {}}                   // callback
/>
```

### AIMonitoringWidget
```jsx
<AIMonitoringWidget
  isActive={true}                      // boolean
  faceDetected={true}                  // boolean
  focusScore={85}                      // 0-100
  engagementLevel="High"              // 'High' | 'Medium' | 'Low'
  alerts={[]}                          // string[]
/>
```

### AttendancePanel
```jsx
<AttendancePanel
  students={[
    {
      id: 1,
      name: 'Alice Johnson',
      rollNo: 'S001',
      status: 'present',              // 'present' | 'late' | 'absent'
      avatar: 'https://...'
    },
    // ...
  ]}
/>
```

### Button
```jsx
<Button
  variant="primary"                    // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size="lg"                            // 'sm' | 'md' | 'lg'
  fullWidth={false}                    // boolean
  isLoading={false}                    // boolean
  icon={IconComponent}                 // Lucide icon (optional)
  disabled={false}                     // boolean
  className=""                         // Additional classes
  onClick={() => {}}                   // callback
>
  Button Text
</Button>
```

---

## 🎨 Styling & Theming

### Using Tailwind Classes

All components use Tailwind CSS classes. Customize with:

```jsx
// Change card styling
<Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
  Custom content
</Card>

// Override button color
<Button className="bg-purple-600 hover:bg-purple-700">
  Custom Button
</Button>
```

### Common Tailwind Patterns

```jsx
// Background colors
bg-white, bg-gray-50, bg-blue-50, bg-gradient-to-r

// Text colors
text-gray-900, text-primary-600, text-green-700

// Spacing
p-4, p-6, mb-4, gap-3, gap-6

// Shadows
shadow-sm, shadow-md, shadow-lg

// Borders
border, border-gray-100, border-blue-200, border-l-4

// Rounded corners
rounded-lg, rounded-xl, rounded-2xl, rounded-full
```

---

## 🎬 Animation Effects

### Built-in Animations

All components include smooth transitions:

```css
- Hover scale: hover:scale-105 (transition-all duration-300)
- Color transitions: smooth color changes
- Borders: focus:ring-2 focus:ring-primary-600
- Smooth fade-in: opacity transitions
```

### Custom Animation Example

```jsx
// Add custom animations in your CSS or tailwind.config.js
@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

className="animate-slideIn"
```

---

## 📱 Responsive Design Breakpoints

```jsx
// Tailwind breakpoints used:
- sm: 640px (mobile)
- md: 768px (tablet)
- lg: 1024px (desktop)
- xl: 1280px (large desktop)

// Example:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* 1 column on mobile, 2 on tablet, 4 on desktop */}
</div>
```

---

## 🎯 Common Use Cases

### Building a Dashboard

```jsx
import { DashboardCard, ClassroomCard, SidebarNav } from '@/components/SaaS';
import { BarChart3, Users } from 'lucide-react';

function Dashboard() {
  return (
    <div className="flex h-screen">
      <SidebarNav items={navItems} />
      <div className="flex-1 p-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <DashboardCard icon={Users} title="Total" value="156" />
          {/* More cards */}
        </div>
        <ClassroomCard {...classData} />
      </div>
    </div>
  );
}
```

### Creating a Feed

```jsx
import { AnnouncementCard } from '@/components/SaaS';

function Feed({ announcements }) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {announcements.map(ann => (
        <AnnouncementCard key={ann.id} {...ann} />
      ))}
    </div>
  );
}
```

### Building a Modal/Dialog

```jsx
import { Card, Button } from '@/components/SaaS';

function Modal({ onClose }) {
  return (
    <Card className="w-96 p-6">
      <h2 className="text-2xl font-bold mb-4">Modal Title</h2>
      <p className="text-gray-600 mb-6">Modal content goes here</p>
      <div className="flex gap-3">
        <Button fullWidth onClick={onClose}>Cancel</Button>
        <Button fullWidth variant="primary">Confirm</Button>
      </div>
    </Card>
  );
}
```

---

## 🔌 API Integration Example

```jsx
import { useEffect, useState } from 'react';
import { ClassroomCard, Button } from '@/components/SaaS';

function ClassesList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from your API
    fetch('/api/classes')
      .then(res => res.json())
      .then(data => {
        setClasses(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <Button isLoading>Loading...</Button>;

  return (
    <div className="grid grid-cols-2 gap-6">
      {classes.map(cls => (
        <ClassroomCard
          key={cls.id}
          {...cls}
          onClick={() => navigate(`/classroom/${cls.id}`)}
        />
      ))}
    </div>
  );
}
```

---

## ✅ Best Practices

1. **Always pass required props** - Check component documentation
2. **Use icons from lucide-react** - Import before using
3. **Keep component hierarchy** - Use SidebarNav > pages > cards
4. **Mobile-first design** - Test on mobile screens first
5. **Consistent spacing** - Use Tailwind spacing scale (4, 6, 8)
6. **Color consistency** - Use defined color palette
7. **Accessibility** - Add alt text to images, labels to inputs
8. **Performance** - Lazy load heavy components/images

---

## 🐛 Troubleshooting

### Icons not showing
```jsx
// ✅ Correct
import { Users, BarChart3 } from 'lucide-react';
<DashboardCard icon={Users} />

// ❌ Wrong
<DashboardCard icon="Users" />
```

### Styling not applied
```jsx
// ✅ Check Tailwind CSS is imported
import 'tailwindcss/tailwind.css'

// ✅ Check tailwind.config.js extends colors
```

### Components not responsive
```jsx
// ✅ Use responsive classes
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"

// ❌ Avoid fixed widths
className="w-300px" // Wrong
```

---

## 📚 Additional Resources

- **Tailwind Docs**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev
- **React Docs**: https://react.dev
- **Design System**: See SAAS_UI_DESIGN_SYSTEM.md

---

## 🎉 Next Steps

1. Choose your routing solution (React Router, Next.js, etc.)
2. Integrate pages into your routing
3. Connect to your backend APIs
4. Customize colors if needed
5. Deploy to your hosting platform

**Happy Building! 🚀**
