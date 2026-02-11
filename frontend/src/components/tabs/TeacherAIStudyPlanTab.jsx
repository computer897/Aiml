import { useState } from 'react'
import { Sparkles, BookOpen, Clock, Target, CheckCircle, ChevronRight, Download, Lightbulb, Zap, Brain, Loader2 } from 'lucide-react'

const subjects = ['Mathematics', 'Computer Science', 'Physics', 'English Literature', 'Chemistry', 'Biology']

const samplePlans = [
  {
    id: 1,
    subject: 'Mathematics',
    topic: 'Integration Techniques',
    difficulty: 'Intermediate',
    duration: '2 weeks',
    created: '2026-02-10',
    modules: [
      { title: 'Review of Differentiation', duration: '2 days', status: 'completed', lessons: 4 },
      { title: 'Basic Integration Rules', duration: '3 days', status: 'completed', lessons: 5 },
      { title: 'Integration by Substitution', duration: '3 days', status: 'in-progress', lessons: 4 },
      { title: 'Integration by Parts', duration: '3 days', status: 'pending', lessons: 5 },
      { title: 'Practice & Assessment', duration: '3 days', status: 'pending', lessons: 3 },
    ]
  },
  {
    id: 2,
    subject: 'Computer Science',
    topic: 'Data Structures',
    difficulty: 'Advanced',
    duration: '3 weeks',
    created: '2026-02-08',
    modules: [
      { title: 'Arrays & Linked Lists Review', duration: '2 days', status: 'completed', lessons: 3 },
      { title: 'Stacks & Queues', duration: '3 days', status: 'completed', lessons: 4 },
      { title: 'Trees & Binary Trees', duration: '4 days', status: 'in-progress', lessons: 6 },
      { title: 'Graphs & Traversals', duration: '4 days', status: 'pending', lessons: 5 },
      { title: 'Hash Tables & Heaps', duration: '3 days', status: 'pending', lessons: 4 },
      { title: 'Final Project', duration: '5 days', status: 'pending', lessons: 2 },
    ]
  }
]

function TeacherAIStudyPlanTab() {
  const [selectedSubject, setSelectedSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('intermediate')
  const [duration, setDuration] = useState('2-weeks')
  const [generating, setGenerating] = useState(false)
  const [plans, setPlans] = useState(samplePlans)
  const [expandedPlan, setExpandedPlan] = useState(null)

  const handleGenerate = async () => {
    if (!selectedSubject || !topic) return alert('Please select a subject and enter a topic.')
    setGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      const newPlan = {
        id: plans.length + 1,
        subject: selectedSubject,
        topic,
        difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
        duration: duration.replace('-', ' '),
        created: new Date().toISOString().split('T')[0],
        modules: [
          { title: `Introduction to ${topic}`, duration: '2 days', status: 'pending', lessons: 3 },
          { title: `Core Concepts of ${topic}`, duration: '3 days', status: 'pending', lessons: 5 },
          { title: `Advanced ${topic} Techniques`, duration: '4 days', status: 'pending', lessons: 4 },
          { title: 'Practice Exercises', duration: '3 days', status: 'pending', lessons: 6 },
          { title: 'Assessment & Review', duration: '2 days', status: 'pending', lessons: 2 },
        ]
      }
      setPlans([newPlan, ...plans])
      setTopic('')
      setGenerating(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" /> AI Study Plan
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate smart study plans powered by AI</p>
      </div>

      {/* Generator Card */}
      <div className="card-interactive p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800/30">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-amber-600" />
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Generate New Plan</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="input-base">
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Quantum Mechanics, Binary Trees..."
              className="input-base" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="input-base">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Duration</label>
            <select value={duration} onChange={e => setDuration(e.target.value)} className="input-base">
              <option value="1-week">1 Week</option>
              <option value="2-weeks">2 Weeks</option>
              <option value="3-weeks">3 Weeks</option>
              <option value="1-month">1 Month</option>
            </select>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="px-5 py-2.5 bg-amber-600 text-white font-semibold text-sm rounded-xl hover:bg-amber-700 transition flex items-center gap-2 disabled:opacity-50">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate Study Plan'}
        </button>
      </div>

      {/* Existing Plans */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Your Study Plans</h2>
        <div className="space-y-4">
          {plans.map(plan => {
            const completedModules = plan.modules.filter(m => m.status === 'completed').length
            const progress = Math.round((completedModules / plan.modules.length) * 100)
            const isExpanded = expandedPlan === plan.id

            return (
              <div key={plan.id} className="card-interactive overflow-hidden">
                {/* Plan header */}
                <button onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                  className="w-full p-5 text-left flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{plan.topic}</h3>
                      <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[10px] font-bold rounded-full">{plan.difficulty}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{plan.subject} &middot; {plan.duration} &middot; {plan.modules.length} modules</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-40">
                        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs font-bold text-amber-600">{progress}%</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded modules */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
                    <div className="pt-4 space-y-2.5">
                      {plan.modules.map((mod, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            mod.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                            mod.status === 'in-progress' ? 'bg-amber-100 dark:bg-amber-900/30' :
                            'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            {mod.status === 'completed' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                             mod.status === 'in-progress' ? <Zap className="w-4 h-4 text-amber-600" /> :
                             <span className="text-xs font-bold text-gray-400">{i + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${mod.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                              {mod.title}
                            </p>
                            <p className="text-[11px] text-gray-400">{mod.duration} &middot; {mod.lessons} lessons</p>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            mod.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            mod.status === 'in-progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {mod.status === 'in-progress' ? 'In Progress' : mod.status.charAt(0).toUpperCase() + mod.status.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <button className="px-3 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Export Plan
                      </button>
                      <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" /> Get Suggestions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TeacherAIStudyPlanTab
