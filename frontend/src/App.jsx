import { useState } from 'react';
import { useTheme } from './hooks/useTheme.js';
import { useAuth } from './hooks/useAuth.js';
import { useCourses } from './hooks/useCourses.js';
import { useTodos } from './hooks/useTodos.js';
import Dashboard from './components/Dashboard.jsx';
import CourseDetail from './components/CourseDetail.jsx';
import CourseWizard from './components/CourseWizard.jsx';
import TodosPage from './components/TodosPage.jsx';
import LoginPage from './components/LoginPage.jsx';

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Cross-cutting concerns ──────────────────────────────────────────────────
  const { isDark, setIsDark } = useTheme();
  const { session, signIn, signOut, loading: authLoading, error: authError } = useAuth();

  const userId = session?.user?.id ?? null;

  // ── Domain state (auto-load/clear when userId changes) ──────────────────────
  const {
    courses,
    isLoading: isCoursesLoading,
    createCourse,
    updateCourse,
    deleteCourse,
    toggleSession,
    deleteSession,
    addExtraSession,
  } = useCourses(userId);

  const { todos, isLoading: isTodosLoading, addTodo, toggleTodo, deleteTodo } =
    useTodos(userId);

  const isLoading = isCoursesLoading || isTodosLoading;

  // ── UI / Navigation state ───────────────────────────────────────────────────
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null); // course object being edited, or null
  const [weekFilter, setWeekFilter] = useState('all');
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'todos'

  // ── Navigation handlers ─────────────────────────────────────────────────────

  const handleNavHome = () => {
    setSelectedCourseId(null);
    setWeekFilter('all');
    setView('dashboard');
  };

  const handleNavTodos = () => {
    setSelectedCourseId(null);
    setView('todos');
  };

  // ── Course handlers ─────────────────────────────────────────────────────────

  const handleCreateCourse = async (formData) => {
    await createCourse(formData); // throws on DB error (CourseWizard catches it)
    setShowWizard(false);
  };

  const handleEditCourse = async (formData) => {
    if (!editingCourse) return;
    await updateCourse(editingCourse.id, formData); // throws on DB error
    setEditingCourse(null);
  };

  const handleDeleteCourse = (id) => {
    if (selectedCourseId === id) setSelectedCourseId(null);
    deleteCourse(id);
  };

  // ── Derived UI values ───────────────────────────────────────────────────────

  const selectedCourse = selectedCourseId
    ? courses.find((c) => c.id === selectedCourseId) ?? null
    : null;

  const navTab = selectedCourse ? 'course' : view === 'todos' ? 'todos' : 'home';

  // ── Render guards ───────────────────────────────────────────────────────────

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage onSignIn={signIn} loading={authLoading} error={authError} />;
  }

  // ── Authenticated app ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm dark:shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* RTL start (physical right): back button + title */}
          <div className="flex items-center gap-3">
            {selectedCourse && (
              <button
                onClick={() => setSelectedCourseId(null)}
                className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded"
              >
                <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {selectedCourse
                  ? selectedCourse.name
                  : view === 'todos'
                    ? 'משימות'
                    : 'מעקב הרצאות ותרגולים'}
              </h1>
              {selectedCourse && (
                <p className="text-xs text-gray-500 dark:text-slate-400">חזרה ללוח הבקרה</p>
              )}
            </div>
          </div>

          {/* RTL end (physical left): theme toggle + desktop actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle — always visible */}
            <button
              onClick={() => setIsDark((d) => !d)}
              title={isDark ? 'מצב בהיר' : 'מצב כהה'}
              className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Desktop-only action buttons */}
            {!selectedCourse && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setShowWizard(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  הוסף קורס
                </button>
                <button
                  onClick={signOut}
                  title={session.user.email}
                  className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  יציאה
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {isLoading ? (
          <DashboardSkeleton />
        ) : selectedCourse ? (
          <CourseDetail
            course={selectedCourse}
            onSessionToggle={toggleSession}
            onSessionDelete={deleteSession}
            onAddExtraSession={addExtraSession}
          />
        ) : view === 'todos' ? (
          <TodosPage
            todos={todos}
            courses={courses}
            onAddTodo={addTodo}
            onToggleTodo={toggleTodo}
            onDeleteTodo={deleteTodo}
          />
        ) : (
          <Dashboard
            courses={courses}
            weekFilter={weekFilter}
            onWeekFilterChange={setWeekFilter}
            onSelectCourse={(course) => { setSelectedCourseId(course.id); setView('dashboard'); }}
            onDeleteCourse={handleDeleteCourse}
            onEditCourse={(course) => setEditingCourse(course)}
            onAddCourse={() => setShowWizard(true)}
            onSessionToggle={toggleSession}
            onSessionDelete={deleteSession}
            todos={todos}
            onAddTodo={addTodo}
            onToggleTodo={toggleTodo}
            onDeleteTodo={deleteTodo}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        tab={navTab}
        onHome={handleNavHome}
        onAdd={() => setShowWizard(true)}
        onTodos={handleNavTodos}
      />

      {/* Create wizard */}
      {showWizard && (
        <CourseWizard
          onSubmit={handleCreateCourse}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* Edit wizard */}
      {editingCourse && (
        <CourseWizard
          editCourse={editingCourse}
          onSubmit={handleEditCourse}
          onClose={() => setEditingCourse(null)}
        />
      )}
    </div>
  );
}

// ── Dashboard loading skeleton ───────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Stats card placeholder */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 h-44" />
      {/* Week picker placeholder */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-gray-200 dark:bg-slate-700 flex-shrink-0" />
        ))}
      </div>
      {/* Course cards grid placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 h-52" />
        ))}
      </div>
    </div>
  );
}

// ── Bottom Navigation ────────────────────────────────────────────────────────

function BottomNav({ tab, onHome, onAdd, onTodos }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-t border-gray-200 dark:border-slate-700 shadow-2xl">
      <div className="max-w-6xl mx-auto flex items-center justify-around h-16 px-4">

        {/* ראשי */}
        <button
          onClick={onHome}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${
            tab === 'home' || tab === 'course'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium">ראשי</span>
        </button>

        {/* הוסף */}
        <button
          onClick={onAdd}
          className="flex flex-col items-center gap-1 -mt-5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-lg shadow-indigo-500/30 transition-colors flex items-center justify-center"
          aria-label="הוסף קורס"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* משימות */}
        <button
          onClick={onTodos}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${
            tab === 'todos'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-xs font-medium">משימות</span>
        </button>

      </div>
    </nav>
  );
}
