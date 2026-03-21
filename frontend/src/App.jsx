import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import CourseDetail from './components/CourseDetail.jsx';
import CourseWizard from './components/CourseWizard.jsx';

const STORAGE_KEY = 'lecture-tracker-v1';
const TODOS_KEY = 'lecture-tracker-todos-v1';

function loadCourses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveCourses(courses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(TODOS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

function generateSessions(courseId, totalWeeks, weeklyLectures, weeklyTutorials) {
  const sessions = [];
  let id = Date.now();
  let lectureNum = 1;
  let tutorialNum = 1;
  for (let week = 1; week <= totalWeeks; week++) {
    for (let i = 0; i < weeklyLectures; i++) {
      sessions.push({ id: id++, courseId, week, type: 'lecture', number: lectureNum++, watched: false });
    }
    for (let i = 0; i < weeklyTutorials; i++) {
      sessions.push({ id: id++, courseId, week, type: 'tutorial', number: tutorialNum++, watched: false });
    }
  }
  return sessions;
}

export default function App() {
  const [courses, setCourses] = useState(() => loadCourses());
  const [todos, setTodos] = useState(() => loadTodos());
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [weekFilter, setWeekFilter] = useState('all');

  useEffect(() => {
    saveCourses(courses);
  }, [courses]);

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  const selectedCourse = selectedCourseId
    ? courses.find((c) => c.id === selectedCourseId) ?? null
    : null;

  const handleCreateCourse = (formData) => {
    const id = Date.now();
    const sessions = generateSessions(
      id,
      formData.totalWeeks,
      formData.weeklyLectures,
      formData.weeklyTutorials,
    );
    const newCourse = {
      id,
      name: formData.name,
      totalWeeks: formData.totalWeeks,
      weeklyLectures: formData.weeklyLectures,
      weeklyTutorials: formData.weeklyTutorials,
      createdAt: new Date().toISOString(),
      sessions,
      total: sessions.length,
      watched: 0,
    };
    setCourses((prev) => [newCourse, ...prev]);
    setShowWizard(false);
  };

  const handleDeleteCourse = (id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    if (selectedCourseId === id) setSelectedCourseId(null);
  };

  const handleAddTodo = ({ description, linkedCourseId, linkedWeek }) => {
    setTodos((prev) => [
      ...prev,
      { id: Date.now(), description, linkedCourseId, linkedWeek, done: false, createdAt: new Date().toISOString() },
    ]);
  };

  const handleToggleTodo = (id, done) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
  };

  const handleDeleteTodo = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSessionToggle = (sessionId, watched) => {
    setCourses((prev) =>
      prev.map((c) => {
        const idx = c.sessions.findIndex((s) => s.id === sessionId);
        if (idx === -1) return c;
        const sessions = c.sessions.map((s) =>
          s.id === sessionId ? { ...s, watched } : s
        );
        return {
          ...c,
          sessions,
          watched: sessions.filter((s) => s.watched).length,
        };
      })
    );
  };

  // Bottom nav tab handler
  const handleNavHome = () => {
    setSelectedCourseId(null);
    setWeekFilter('all');
  };
  const handleNavRemaining = () => {
    setSelectedCourseId(null);
    setWeekFilter('remaining');
  };

  const navTab = selectedCourse
    ? 'course'
    : weekFilter === 'remaining'
    ? 'remaining'
    : 'home';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedCourse && (
              <button
                onClick={() => setSelectedCourseId(null)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
              >
                <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">
                {selectedCourse ? selectedCourse.name : 'מעקב הרצאות ותרגולים'}
              </h1>
              {selectedCourse && (
                <p className="text-xs text-slate-400">חזרה ללוח הבקרה</p>
              )}
            </div>
          </div>
          {!selectedCourse && (
            <button
              onClick={() => setShowWizard(true)}
              className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              הוסף קורס
            </button>
          )}
        </div>
      </header>

      {/* Main — extra bottom padding so content clears the nav bar */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {selectedCourse ? (
          <CourseDetail
            course={selectedCourse}
            onSessionToggle={handleSessionToggle}
          />
        ) : (
          <Dashboard
            courses={courses}
            weekFilter={weekFilter}
            onWeekFilterChange={setWeekFilter}
            onSelectCourse={(course) => setSelectedCourseId(course.id)}
            onDeleteCourse={handleDeleteCourse}
            onAddCourse={() => setShowWizard(true)}
            onSessionToggle={handleSessionToggle}
            todos={todos}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        tab={navTab}
        onHome={handleNavHome}
        onAdd={() => setShowWizard(true)}
        onRemaining={handleNavRemaining}
      />

      {/* Wizard Modal */}
      {showWizard && (
        <CourseWizard
          onSubmit={handleCreateCourse}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

function BottomNav({ tab, onHome, onAdd, onRemaining }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-slate-800/95 backdrop-blur border-t border-slate-700 shadow-2xl">
      <div className="max-w-6xl mx-auto flex items-center justify-around h-16 px-4">

        {/* ראשי */}
        <button
          onClick={onHome}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${
            tab === 'home' || tab === 'course'
              ? 'text-indigo-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium">ראשי</span>
        </button>

        {/* הוסף — center action button */}
        <button
          onClick={onAdd}
          className="flex flex-col items-center gap-1 -mt-5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-lg shadow-indigo-500/30 transition-colors flex items-center justify-center"
          aria-label="הוסף קורס"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* נותרו */}
        <button
          onClick={onRemaining}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${
            tab === 'remaining'
              ? 'text-amber-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-xs font-medium">נותרו</span>
        </button>

      </div>
    </nav>
  );
}
