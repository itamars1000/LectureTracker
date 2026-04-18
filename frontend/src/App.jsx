import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase.js';
import Dashboard from './components/Dashboard.jsx';
import CourseDetail from './components/CourseDetail.jsx';
import CourseWizard from './components/CourseWizard.jsx';
import TodosPage from './components/TodosPage.jsx';
import LoginPage from './components/LoginPage.jsx';

// ── Session generation helper ────────────────────────────────────────────────

function generateSessions(courseId, totalWeeks, weeklyLectures, weeklyTutorials) {
  const sessions = [];
  let lectureNum = 1;
  let tutorialNum = 1;
  for (let week = 1; week <= totalWeeks; week++) {
    for (let i = 0; i < weeklyLectures; i++) {
      sessions.push({
        id: crypto.randomUUID(),
        courseId,
        week,
        type: 'lecture',
        number: lectureNum++,
        watched: false,
      });
    }
    for (let i = 0; i < weeklyTutorials; i++) {
      sessions.push({
        id: crypto.randomUUID(),
        courseId,
        week,
        type: 'tutorial',
        number: tutorialNum++,
        watched: false,
      });
    }
  }
  return sessions;
}

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // Auth state: undefined = still checking, null = logged out, object = logged in
  const [session, setSession] = useState(undefined);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Data state — populated from Supabase after session is confirmed
  const [courses, setCourses] = useState([]);
  const [todos, setTodos] = useState([]);

  // UI state
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null); // course object or null
  const [weekFilter, setWeekFilter] = useState('all');
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'todos'

  // ── Auth bootstrap ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Restore session from localStorage (supabase-js handles this internally)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for sign-in / sign-out events (including OAuth redirect callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // Clear data when user signs out
        setCourses([]);
        setTodos([]);
        setSelectedCourseId(null);
        setView('dashboard');
        setWeekFilter('all');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load all data once session is available ────────────────────────────────
  useEffect(() => {
    if (session) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadData() {
    const uid = session.user.id;

    // Fetch all three tables in parallel
    const [
      { data: cRows, error: cErr },
      { data: sRows, error: sErr },
      { data: tRows, error: tErr },
    ] = await Promise.all([
      supabase.from('courses').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('sessions').select('*').eq('user_id', uid),
      supabase.from('todos').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
    ]);

    if (cErr || sErr || tErr) {
      console.error('loadData error:', cErr ?? sErr ?? tErr);
      return;
    }

    // Reassemble sessions as nested arrays — all existing components receive
    // the exact same shape they always have, so no component changes are needed.
    const assembled = (cRows ?? []).map((c) => {
      const sessions = (sRows ?? [])
        .filter((s) => s.course_id === c.id)
        .map((s) => ({
          id: s.id,
          courseId: s.course_id,
          week: s.week,
          type: s.type,
          number: s.number,
          watched: s.watched,
        }));
      return {
        id: c.id,
        name: c.name,
        totalWeeks: c.total_weeks,
        weeklyLectures: c.weekly_lectures,
        weeklyTutorials: c.weekly_tutorials,
        createdAt: c.created_at,
        sessions,
        total: sessions.length,
        watched: sessions.filter((s) => s.watched).length,
      };
    });
    setCourses(assembled);

    setTodos((tRows ?? []).map((t) => ({
      id: t.id,
      description: t.description,
      linkedCourseId: t.linked_course_id,  // UUID string or null
      linkedWeek: t.linked_week,
      done: t.done,
      createdAt: t.created_at,
    })));
  }

  // ── Auth handlers ──────────────────────────────────────────────────────────

  const handleSignIn = async () => {
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Supabase redirects back here after Google consent.
        // Works for both localhost:5173 and the production Vercel URL
        // because both are listed in Supabase → Authentication → URL Configuration.
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setAuthError('שגיאה בהתחברות עם Google. נסה שוב.');
      setAuthLoading(false);
    }
    // On success the browser navigates away — authLoading stays true until redirect
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange fires → clears state automatically
  };

  // ── Course handlers ────────────────────────────────────────────────────────

  const handleCreateCourse = async (formData) => {
    const userId = session.user.id;
    const courseId = crypto.randomUUID();
    const sessions = generateSessions(
      courseId,
      formData.totalWeeks,
      formData.weeklyLectures,
      formData.weeklyTutorials,
    );

    const newCourse = {
      id: courseId,
      name: formData.name,
      totalWeeks: formData.totalWeeks,
      weeklyLectures: formData.weeklyLectures,
      weeklyTutorials: formData.weeklyTutorials,
      createdAt: new Date().toISOString(),
      sessions,
      total: sessions.length,
      watched: 0,
    };

    // Optimistic update — UI feels instant
    setCourses((prev) => [newCourse, ...prev]);
    setShowWizard(false);

    // Insert course row (with explicit id so FK from sessions works immediately)
    const { error: cErr } = await supabase.from('courses').insert({
      id: courseId,
      user_id: userId,
      name: formData.name,
      total_weeks: formData.totalWeeks,
      weekly_lectures: formData.weeklyLectures,
      weekly_tutorials: formData.weeklyTutorials,
      created_at: newCourse.createdAt,
    });

    if (cErr) {
      console.error('Failed to create course:', cErr);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setShowWizard(true);
      throw cErr; // CourseWizard catches this and shows a Hebrew error message
    }

    // Bulk-insert all sessions
    const sessionRows = sessions.map((s) => ({
      id: s.id,
      user_id: userId,
      course_id: courseId,
      week: s.week,
      type: s.type,
      number: s.number,
      watched: false,
    }));

    const { error: sErr } = await supabase.from('sessions').insert(sessionRows);

    if (sErr) {
      console.error('Failed to insert sessions:', sErr);
      await supabase.from('courses').delete().eq('id', courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setShowWizard(true);
      throw sErr;
    }
  };

  const handleEditCourse = async (formData) => {
    const course = editingCourse;
    if (!course) return;
    const userId = session.user.id;

    const nameChanged = formData.name !== course.name;
    const structureChanged =
      formData.totalWeeks !== course.totalWeeks ||
      formData.weeklyLectures !== course.weeklyLectures ||
      formData.weeklyTutorials !== course.weeklyTutorials;

    if (structureChanged) {
      // Regenerate sessions — delete old, insert new
      const newSessions = generateSessions(
        course.id,
        formData.totalWeeks,
        formData.weeklyLectures,
        formData.weeklyTutorials,
      );

      const updatedCourse = {
        ...course,
        name: formData.name,
        totalWeeks: formData.totalWeeks,
        weeklyLectures: formData.weeklyLectures,
        weeklyTutorials: formData.weeklyTutorials,
        sessions: newSessions,
        total: newSessions.length,
        watched: 0,
      };

      // Optimistic update
      setCourses((prev) => prev.map((c) => (c.id === course.id ? updatedCourse : c)));
      setEditingCourse(null);

      // Update course row
      const { error: cErr } = await supabase.from('courses').update({
        name: formData.name,
        total_weeks: formData.totalWeeks,
        weekly_lectures: formData.weeklyLectures,
        weekly_tutorials: formData.weeklyTutorials,
      }).eq('id', course.id);

      if (cErr) {
        console.error('Failed to update course:', cErr);
        loadData();
        throw cErr;
      }

      // Delete old sessions
      const { error: dErr } = await supabase.from('sessions').delete().eq('course_id', course.id);
      if (dErr) {
        console.error('Failed to delete old sessions:', dErr);
        loadData();
        throw dErr;
      }

      // Insert new sessions
      const sessionRows = newSessions.map((s) => ({
        id: s.id,
        user_id: userId,
        course_id: course.id,
        week: s.week,
        type: s.type,
        number: s.number,
        watched: false,
      }));

      const { error: sErr } = await supabase.from('sessions').insert(sessionRows);
      if (sErr) {
        console.error('Failed to insert new sessions:', sErr);
        loadData();
        throw sErr;
      }
    } else if (nameChanged) {
      // Only name changed — simple update
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, name: formData.name } : c))
      );
      setEditingCourse(null);

      const { error } = await supabase
        .from('courses')
        .update({ name: formData.name })
        .eq('id', course.id);

      if (error) {
        console.error('Failed to update course name:', error);
        loadData();
        throw error;
      }
    } else {
      // Nothing changed
      setEditingCourse(null);
    }
  };

  const handleDeleteCourse = async (id) => {
    // Optimistic update
    setCourses((prev) => prev.filter((c) => c.id !== id));
    if (selectedCourseId === id) setSelectedCourseId(null);

    // FK ON DELETE CASCADE removes sessions automatically
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete course:', error);
      loadData(); // restore state
    }
  };

  // ── Session handlers ───────────────────────────────────────────────────────

  const handleAddExtraSession = async (courseId, week, type) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    // Find the max number for this type across all sessions in the course
    const typeSessions = course.sessions.filter((s) => s.type === type);
    const maxNum = typeSessions.reduce((max, s) => Math.max(max, s.number), 0);
    const nextNum = maxNum + 1;

    const newSession = {
      id: crypto.randomUUID(),
      courseId,
      week: Number(week),
      type,
      number: nextNum,
      watched: false,
    };

    // Optimistic update
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const sessions = [...c.sessions, newSession];
        // Sort sessions by type, then number to keep UI deterministic? 
        // We'll let the UI handle grouping, but it's fine.
        return {
          ...c,
          sessions,
          total: sessions.length,
        };
      })
    );

    const { error } = await supabase.from('sessions').insert({
      id: newSession.id,
      user_id: session.user.id,
      course_id: courseId,
      week: newSession.week,
      type: newSession.type,
      number: newSession.number,
      watched: false,
    });

    if (error) {
      console.error('Failed to add extra session:', error);
      loadData(); // revert
    }
  };

  const handleSessionToggle = async (sessionId, watched) => {
    // Optimistic update
    setCourses((prev) =>
      prev.map((c) => {
        const idx = c.sessions.findIndex((s) => s.id === sessionId);
        if (idx === -1) return c;
        const sessions = c.sessions.map((s) =>
          s.id === sessionId ? { ...s, watched } : s
        );
        return { ...c, sessions, watched: sessions.filter((s) => s.watched).length };
      })
    );

    const { error } = await supabase
      .from('sessions')
      .update({ watched })
      .eq('id', sessionId);

    if (error) {
      console.error('Failed to toggle session:', error);
      // Revert
      setCourses((prev) =>
        prev.map((c) => {
          const idx = c.sessions.findIndex((s) => s.id === sessionId);
          if (idx === -1) return c;
          const sessions = c.sessions.map((s) =>
            s.id === sessionId ? { ...s, watched: !watched } : s
          );
          return { ...c, sessions, watched: sessions.filter((s) => s.watched).length };
        })
      );
    }
  };

  const handleDeleteSession = async (sessionId) => {
    // Optimistic update
    setCourses((prev) =>
      prev.map((c) => {
        const sessions = c.sessions.filter((s) => s.id !== sessionId);
        if (sessions.length === c.sessions.length) return c;
        return {
          ...c,
          sessions,
          total: sessions.length,
          watched: sessions.filter((s) => s.watched).length,
        };
      })
    );

    const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
    if (error) {
      console.error('Failed to delete session:', error);
      loadData();
    }
  };

  // ── Todo handlers ──────────────────────────────────────────────────────────

  const handleAddTodo = async ({ description, linkedCourseId, linkedWeek }) => {
    // linkedCourseId arrives as a UUID string (or null/empty string)
    const courseId = linkedCourseId || null;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Optimistic update
    setTodos((prev) => [
      ...prev,
      { id, description, linkedCourseId: courseId, linkedWeek: linkedWeek ?? null, done: false, createdAt },
    ]);

    const { error } = await supabase.from('todos').insert({
      id,
      user_id: session.user.id,
      description,
      linked_course_id: courseId,
      linked_week: linkedWeek ?? null,
      done: false,
      created_at: createdAt,
    });

    if (error) {
      console.error('Failed to add todo:', error);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleToggleTodo = async (id, done) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));

    const { error } = await supabase.from('todos').update({ done }).eq('id', id);
    if (error) {
      console.error('Failed to toggle todo:', error);
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !done } : t)));
    }
  };

  const handleDeleteTodo = async (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete todo:', error);
      loadData();
    }
  };

  // ── Navigation handlers ────────────────────────────────────────────────────

  const handleNavHome = () => {
    setSelectedCourseId(null);
    setWeekFilter('all');
    setView('dashboard');
  };
  const handleNavTodos = () => {
    setSelectedCourseId(null);
    setView('todos');
  };

  const selectedCourse = selectedCourseId
    ? courses.find((c) => c.id === selectedCourseId) ?? null
    : null;

  const navTab = selectedCourse
    ? 'course'
    : view === 'todos'
      ? 'todos'
      : 'home';

  // ── Render guards ──────────────────────────────────────────────────────────

  // Still checking localStorage for existing session → show spinner
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No session → show login
  if (!session) {
    return <LoginPage onSignIn={handleSignIn} loading={authLoading} error={authError} />;
  }

  // ── Authenticated app ──────────────────────────────────────────────────────

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
                {selectedCourse
                  ? selectedCourse.name
                  : view === 'todos'
                    ? 'משימות'
                    : 'מעקב הרצאות ותרגולים'}
              </h1>
              {selectedCourse && (
                <p className="text-xs text-slate-400">חזרה ללוח הבקרה</p>
              )}
            </div>
          </div>

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
              {/* Sign-out button — shows user email as tooltip */}
              <button
                onClick={handleSignOut}
                title={session.user.email}
                className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors"
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
      </header>

      {/* Main — extra bottom padding so content clears the nav bar */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {selectedCourse ? (
          <CourseDetail
            course={selectedCourse}
            onSessionToggle={handleSessionToggle}
            onSessionDelete={handleDeleteSession}
          />
        ) : view === 'todos' ? (
          <TodosPage
            todos={todos}
            courses={courses}
            onAddTodo={handleAddTodo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
          />
        ) : (
          <Dashboard
            courses={courses}
            weekFilter={weekFilter}
            onWeekFilterChange={setWeekFilter}
            onSelectCourse={(course) => { setSelectedCourseId(course.id); setView('dashboard'); }}
            onDeleteCourse={handleDeleteCourse}
            onEditCourse={(c) => setEditingCourse(c)}
            onAddCourse={() => setShowWizard(true)}
            onSessionToggle={handleSessionToggle}
            onSessionDelete={handleDeleteSession}
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
        onTodos={handleNavTodos}
      />

      {/* Wizard Modal */}
      {(showWizard || editingCourse) && (
        <CourseWizard
          editCourse={editingCourse}
          onSubmit={editingCourse ? handleEditCourse : handleCreateCourse}
          onClose={() => { setShowWizard(false); setEditingCourse(null); }}
        />
      )}
    </div>
  );
}

// ── Bottom Navigation ────────────────────────────────────────────────────────

function BottomNav({ tab, onHome, onAdd, onTodos }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-slate-800/95 backdrop-blur border-t border-slate-700 shadow-2xl">
      <div className="max-w-6xl mx-auto flex items-center justify-around h-16 px-4">

        {/* ראשי */}
        <button
          onClick={onHome}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${tab === 'home' || tab === 'course'
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

        {/* משימות */}
        <button
          onClick={onTodos}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${tab === 'todos'
              ? 'text-amber-400'
              : 'text-slate-500 hover:text-slate-300'
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
