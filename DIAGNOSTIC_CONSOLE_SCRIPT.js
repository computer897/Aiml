/**
 * DIAGNOSTIC SCRIPT FOR CLASSROOM ISSUES
 *
 * HOW TO USE:
 * 1. Open your app in browser (logged in as teacher)
 * 2. Press F12 to open Developer Tools
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Run it: Press ENTER
 * 6. Share the output with me
 */

console.log('🔍 Starting Classroom Diagnostics...\n')

// Test 1: Check API URL Configuration
console.log('📍 API Configuration:')
console.log(`   VITE_API_URL: ${import.meta.env.VITE_API_URL || 'NOT SET'}`)
console.log(`   VITE_SOCKET_URL: ${import.meta.env.VITE_SOCKET_URL || 'NOT SET'}`)

// Test 2: Check if user is logged in
console.log('\n👤 User Auth:')
const user = localStorage.getItem('user')
if (user) {
  const userData = JSON.parse(user)
  console.log(`   ✅ Logged in as: ${userData.name} (${userData.role})`)
  console.log(`   Token present: ${!!userData.token}`)
} else {
  console.log('   ❌ NOT LOGGED IN')
}

// Test 3: Test backend connectivity
console.log('\n🌐 Backend Health Check:')
const apiBase = import.meta.env.VITE_API_URL || 'https://aiml-1-rjdv.onrender.com'
fetch(`${apiBase}/health`)
  .then(res => res.json())
  .then(data => {
    console.log(`   ✅ Backend is UP: ${JSON.stringify(data)}`)
  })
  .catch(err => {
    console.log(`   ❌ Backend is DOWN or unreachable`)
    console.log(`   Error: ${err.message}`)
  })

// Test 4: List loaded classes
console.log('\n📚 Checking Classes:')
fetch(`${apiBase}/class/teacher/classes`, {
  headers: {
    'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user') || '{}').token}`
  }
})
  .then(res => res.json())
  .then(data => {
    console.log(`   Found ${data.length} classes:`)
    data.forEach((cls, i) => {
      console.log(`   ${i+1}. ${cls.title} (ID: ${cls.class_id}) - Active: ${cls.is_active}`)
    })
  })
  .catch(err => {
    console.log(`   ❌ Failed to fetch classes: ${err.message}`)
  })

// Test 5: Simulate create classroom request
console.log('\n🚀 Testing Create Classroom API:')
const testClassData = {
  class_id: `TEST_${Date.now()}`,
  title: 'Test Classroom',
  description: 'Testing creation',
  schedule_time: new Date().toISOString(),
  duration_minutes: 60
}

console.log(`   Sending: ${JSON.stringify(testClassData)}`)
fetch(`${apiBase}/class/create`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user') || '{}').token}`
  },
  body: JSON.stringify(testClassData)
})
  .then(res => {
    console.log(`   Response Status: ${res.status}`)
    return res.json()
  })
  .then(data => {
    console.log(`   ✅ Success: ${JSON.stringify(data)}`)
  })
  .catch(err => {
    console.log(`   ❌ Failed: ${err.message}`)
  })

console.log('\n✅ Diagnostics complete! Check above for ✅ or ❌ marks.')
console.log('Share any ❌ errors with me to fix the issue.\n')
