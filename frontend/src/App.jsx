import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard.jsx';
import CourseDetail from './components/CourseDetail.jsx';
import CourseWizard from './components/CourseWizard.jsx';

const API = '/api';

export default function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch(`${API}/courses`);
      const data = await res.json();
      setCourses(data);
    } catch (e) {
      console.error('Failed to fetch courses', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCreateCourse = async (formData) => {
    const res = await fetch(`${API}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const created = await res.json();
    setCourses((prev) => [created, ...prev]);
    setShowWizard(false);
  };

  const handleDeleteCourse = async (id) => {
    await fetch(`${API}/courses/${id}`, { method: 'DELETE' });
    setCourses((prev) => prev.filter((c) => c.id !== id));
    if (selectedCourse?.id === id) setSelectedCourse(null);
  };

  const handleSessionToggle = async (sessionId, watched) => {
    const res = await fetch(`${API}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watched }),
    });
    const updated = await res.json();

    // Update courses list progress counts
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== updated.courseId) return c;
        const sessions = c.sessions.map((s) =>
          s.id === updated.id ? updated : s
        );
        return {
          ...c,
          sessions,
          watched: sessions.filter((s) => s.watched).length,
        };
      })
    );

    // Update selected course sessions if open
    if (selectedCourse?.id === updated.courseId) {
      setSelectedCourse((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === updated.id ? updated : s
        ),
      }));
    }
  };

  const openCourse = (course) => {
    setSelectedCourse(course);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedCourse && (
              <button
                onClick={() => setSelectedCourse(null)}
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
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedCourse ? (
          <CourseDetail
            course={selectedCourse}
            onSessionToggle={handleSessionToggle}
          />
        ) : (
          <Dashboard
            courses={courses}
            onSelectCourse={openCourse}
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
