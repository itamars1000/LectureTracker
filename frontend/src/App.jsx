import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import CourseDetail from './components/CourseDetail.jsx';
import CourseWizard from './components/CourseWizard.jsx';

const STORAGE_KEY = 'lecture-tracker-v1';

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

function generateSessions(courseId, totalWeeks, weeklyLectures, weeklyTutorials) {
  const sessions = [];
  let id = Date.now(); // unique enough for localStorage
  for (let week = 1; week <= totalWeeks; week++) {
    for (let n = 1; n <= weeklyLectures; n++) {
      sessions.push({ id: id++, courseId, week, type: 'lecture', number: n, watched: false });
    }
    for (let n = 1; n <= weeklyTutorials; n++) {
      sessions.push({ id: id++, courseId, week, type: 'tutorial', number: n, watched: false });
    }
  }
  return sessions;
}

export default function App() {
  const [courses, setCourses] = useState(() => loadCourses());
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    saveCourses(courses);
  }, [courses]);

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
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              הוסף קורס
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {selectedCourse ? (
          <CourseDetail
            course={selectedCourse}
            onSessionToggle={handleSessionToggle}
          />
        ) : (
          <Dashboard
            courses={courses}
            onSelectCourse={(course) => setSelectedCourseId(course.id)}
            onDeleteCourse={handleDeleteCourse}
            onAddCourse={() => setShowWizard(true)}
            onSessionToggle={handleSessionToggle}
          />
        )}
      </main>

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
