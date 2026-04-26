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
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('lecture-tracker-theme');
      return saved !== null ? saved === 'dark' : true; // default dark
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('lecture-tracker-theme', isDark ? 'dark' : 'light'); } catch {}
  }, [isDark]);

  // ── Auth state: undefined = still checking, null = logged out, object = logged in
  const [session, setSession] = useState(undefined);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Data state — populated from Supabase after session is confirmed
  const [courses, setCourses] = useState([]);
  const [todos, setTodos] = useState([]);

  // UI state
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [weekFilter, setWeekFilter] = useState('all');
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'todos'

  // ── Auth bootstrap ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
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
      linkedCourseId: t.linked_course_id,
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
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthError('שגיאה בהתחברות עם Google. נסה שוב.');
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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

    setCourses((prev) => [newCourse, ...prev]);
    setShowWizard(false);

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
      throw cErr;
    }

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

  const handleDeleteCourse = async (id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    if (selectedCourseId === id) setSelectedCourseId(null);

    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete course:', error);
      loadData();
    }
  };

  // ── Session handlers ───────────────────────────────────────────────────────

  const handleAddExtraSession = async (courseId, week, type) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const newSession = {
      id: crypto.randomUUID(),
      courseId,
      week: Number(week),
      type,
      watched: false,
      number: 0,
    };

    const typeSessions = course.sessions.filter((s) => s.type === type).map((s) => ({ ...s }));
    typeSessions.push(newSession);

    typeSessions.sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      const aNum = a.id === newSession.id ? Infinity : a.number;
      const bNum = b.id === newSession.id ? Infinity : b.number;
      return aNum - bNum;
    });

    const sessionsToUpdateInDb = [];

    typeSessions.forEach((s, idx) => {
      const newNum = idx + 1;
      if (s.id === newSession.id) {
        newSession.number = newNum;
      } else if (s.number !== newNum) {
        sessionsToUpdateInDb.push({ id: s.id, number: newNum });
      }
    });

    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const updatedSessions = c.sessions.map((oldS) => {
          const changed = sessionsToUpdateInDb.find((u) => u.id === oldS.id);
          if (changed) return { ...oldS, number: changed.number };
          return oldS;
        });
        updatedSessions.push(newSession);
        return { ...c, sessions: updatedSessions, total: updatedSessions.length };
      })
    );

    const { error: insErr } = await supabase.from('sessions').insert({
      id: newSession.id,
      user_id: session.user.id,
      course_id: courseId,
      week: newSession.week,
      type: newSession.type,
      number: newSession.number,
      watched: false,
    });

    if (insErr) {
      console.error('Failed to add extra session:', insErr);
      loadData();
      return;
    }

    if (sessionsToUpdateInDb.length > 0) {
      await Promise.all(
        sessionsToUpdateInDb.map((u) =>
          supabase.from('sessions').update({ number: u.number }).eq('id', u.id)
        )
      );
    }
  };

  const handleSessionToggle = async (sessionId, watched) => {
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
    setCourses((prev) =>
      prev.map((c) => {
        const sessions = c.sessions.filter((s) => s.id !== sessionId);
        if (sessions.length === c.sessions.length) return c;
        return { ...c, sessions, total: sessions.length, watched: sessions.filter((s) => s.watched).length };
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
    const courseId = linkedCourseId || null;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

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

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage onSignIn={handleSignIn} loading={authLoading} error={authError} />;
  }

  // ── Authenticated app ──────────────────────────────────────────────────────

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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
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
                /* Sun icon */
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                /* Moon icon */
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
                  onClick={handleSignOut}
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
        {selectedCourse ? (
          <CourseDetail
            course={selectedCourse}
            onSessionToggle={handleSessionToggle}
            onSessionDelete={handleDeleteSession}
            onAddExtraSession={handleAddExtraSession}
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

      {showWizard && (
        <CourseWizard
          onSubmit={handleCreateCourse}
          onClose={() => setShowWizard(false)}
        />
      )}
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
