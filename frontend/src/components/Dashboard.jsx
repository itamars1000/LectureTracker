import { useMemo, useState, useRef, useCallback } from 'react';
import CourseCard from './CourseCard.jsx';

const TYPE_LABELS = { lecture: 'הרצאה', tutorial: 'תרגול' };
const TYPE_COLORS = {
  lecture: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  tutorial: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
};

export default function Dashboard({
  courses,
  weekFilter,
  onWeekFilterChange,
  onSelectCourse,
  onDeleteCourse,
  onAddCourse,
  onSessionToggle,
}) {
  const setWeekFilter = onWeekFilterChange;

  const totalSessions = courses.reduce((sum, c) => sum + c.total, 0);
  const totalWatched  = courses.reduce((sum, c) => sum + c.watched, 0);
  const globalPct = totalSessions > 0 ? Math.round((totalWatched / totalSessions) * 100) : 0;

  // Union of every week number that exists across all courses
  const allWeeks = useMemo(() => {
    const set = new Set();
    courses.forEach((c) => c.sessions?.forEach((s) => set.add(s.week)));
    return [...set].sort((a, b) => a - b);
  }, [courses]);

  // Weeks where every session across every course is watched
  const completedWeeks = useMemo(() => {
    const done = new Set();
    allWeeks.forEach((week) => {
      const weekSessions = courses.flatMap((c) =>
        (c.sessions ?? []).filter((s) => s.week === week)
      );
      if (weekSessions.length > 0 && weekSessions.every((s) => s.watched)) {
        done.add(week);
      }
    });
    return done;
  }, [courses, allWeeks]);

  // Per-week stats across all courses
  const weeklyStats = useMemo(() => {
    return allWeeks.map((week) => {
      const weekSessions = courses.flatMap((c) =>
        (c.sessions ?? []).filter((s) => s.week === week)
      );
      const watched = weekSessions.filter((s) => s.watched).length;
      const total   = weekSessions.length;
      const pct     = total > 0 ? Math.round((watched / total) * 100) : 0;
      return { week, watched, total, pct, done: watched === total && total > 0 };
    });
  }, [courses, allWeeks]);

  // Build the cross-course session list for filtered views
  const filteredGroups = useMemo(() => {
    if (weekFilter === 'all') return [];

    return courses
      .map((course) => {
        const sessions = (course.sessions ?? []).filter((s) => {
          if (weekFilter === 'remaining') return !s.watched;
          return s.week === weekFilter;
        });
        return { course, sessions };
      })
      .filter((g) => g.sessions.length > 0);
  }, [courses, weekFilter]);

  const showFiltered = weekFilter !== 'all';

  return (
    <div className="space-y-5">
      {/* Global Stats */}
      {courses.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">התקדמות הסמסטר</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {totalWatched} מתוך {totalSessions} שיעורים הושלמו
              </p>
            </div>
            <div className="text-4xl font-bold text-indigo-400">{globalPct}%</div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill bg-gradient-to-l from-indigo-500 to-violet-500"
              style={{ width: `${globalPct}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-700/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{courses.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">קורסים</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-emerald-400">{totalWatched}</div>
              <div className="text-xs text-slate-400 mt-0.5">הושלמו</div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-3">
              <div className="text-2xl font-bold text-amber-400">{totalSessions - totalWatched}</div>
              <div className="text-xs text-slate-400 mt-0.5">נותרו</div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly progress breakdown */}
      {courses.length > 0 && weeklyStats.length > 0 && (
        <WeeklyProgress
          weeklyStats={weeklyStats}
          onWeekClick={(w) => setWeekFilter(w)}
        />
      )}

      {/* Week Picker — sticky, only shown when there are courses */}
      {courses.length > 0 && (
        <div className="sticky top-[61px] z-10 bg-slate-900 py-2">
          <WeekPicker weeks={allWeeks} value={weekFilter} onChange={setWeekFilter} completedWeeks={completedWeeks} />
        </div>
      )}

      {/* ── Content area ─────────────────────────────────────────────── */}
      {courses.length === 0 ? (
        <EmptyDashboard onAddCourse={onAddCourse} />
      ) : showFiltered ? (
        <FilteredView
          groups={filteredGroups}
          weekFilter={weekFilter}
          onSessionToggle={onSessionToggle}
          onSelectCourse={onSelectCourse}
        />
      ) : (
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
            הקורסים שלי
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => onSelectCourse(course)}
                onDelete={() => onDeleteCourse(course.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Weekly Progress Breakdown ─────────────────────────────────────────────────

function WeeklyProgress({ weeklyStats, onWeekClick }) {
  const [open, setOpen] = useState(true);

  const doneCount = weeklyStats.filter((w) => w.done).length;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white">התקדמות שבועית</span>
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
            {doneCount}/{weeklyStats.length} שבועות הושלמו
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Week rows */}
      {open && (
        <div className="border-t border-slate-700 px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {weeklyStats.map(({ week, watched, total, pct, done }) => (
            <button
              key={week}
              onClick={() => onWeekClick(week)}
              className="group text-right hover:opacity-80 transition-opacity"
            >
              {/* Label row */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {done ? (
                    <span className="text-xs text-emerald-400 font-bold">✓</span>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">{pct}%</span>
                  )}
                  <span className="text-xs text-slate-500">{watched}/{total}</span>
                </div>
                <span className={`text-sm font-medium group-hover:text-indigo-300 transition-colors ${done ? 'text-emerald-400' : 'text-slate-300'}`}>
                  שבוע {week}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    done
                      ? 'bg-emerald-500'
                      : pct > 0
                      ? 'bg-gradient-to-l from-indigo-500 to-violet-500'
                      : 'bg-slate-600'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Week Picker ──────────────────────────────────────────────────────────────

function WeekPicker({ weeks, value, onChange, completedWeeks = new Set() }) {
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(100);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollWidth - el.clientWidth;
    if (scrollable <= 0) { setThumbWidth(100); setThumbLeft(0); return; }
    const w = (el.clientWidth / el.scrollWidth) * 100;
    const scrolled = -el.scrollLeft; // RTL: scrollLeft is negative when scrolled left
    const ratio = Math.max(0, Math.min(1, scrolled / scrollable));
    setThumbWidth(w);
    setThumbLeft((1 - ratio) * (100 - w));
  }, []);

  const startDrag = useCallback((clientX) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    setDragging(true);
    dragStartX.current = clientX;
    dragStartScroll.current = el.scrollLeft;

    const onMove = (cx) => {
      const trackWidth = track.getBoundingClientRect().width;
      const scrollable = el.scrollWidth - el.clientWidth;
      if (trackWidth <= 0 || scrollable <= 0) return;
      const dx = cx - dragStartX.current;
      // RTL: dragging right → scroll right (less negative), dragging left → more negative
      const scrollDelta = (dx / trackWidth) * el.scrollWidth;
      el.scrollLeft = Math.max(-scrollable, Math.min(0, dragStartScroll.current - scrollDelta));
      updateThumb();
    };

    const onMouseMove = (e) => onMove(e.clientX);
    const onTouchMove = (e) => onMove(e.touches[0].clientX);
    const stop = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stop);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', stop);
  }, [updateThumb]);

  const pills = [
    { key: 'all',       label: 'כל השבועות',   special: false },
    ...weeks.map((w) => ({ key: w, label: `שבוע ${w}`, special: false })),
    { key: 'remaining', label: 'משימות שנותרו', special: true  },
  ];

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={updateThumb}
        className="flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pills.map(({ key, label, special }) => {
          const active = value === key;
          const done = !special && key !== 'all' && completedWeeks.has(key);
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                active
                  ? special
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : done
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-indigo-600 border-indigo-600 text-white'
                  : special
                  ? 'bg-transparent border-amber-500/30 text-amber-400/70 hover:border-amber-500/60 hover:text-amber-300'
                  : done
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
              }`}
            >
              {special && <span className="ml-1">⚑</span>}
              {done && !active && <span className="ml-1">✓</span>}
              {label}
            </button>
          );
        })}
      </div>

      {/* Draggable scroll indicator */}
      <div
        ref={trackRef}
        className="relative mt-2 h-1.5 bg-slate-700/60 rounded-full cursor-pointer"
        onClick={(e) => {
          // Click on track → jump scroll to that position
          const el = scrollRef.current;
          const track = trackRef.current;
          if (!el || !track) return;
          const rect = track.getBoundingClientRect();
          const clickRatio = (e.clientX - rect.left) / rect.width;
          const scrollable = el.scrollWidth - el.clientWidth;
          // RTL: 0 = right (start), 1 = left (end) → invert
          el.scrollLeft = -(1 - clickRatio) * scrollable;
          updateThumb();
        }}
      >
        <div
          className={`absolute top-0 h-full rounded-full transition-[width] duration-150 ${
            dragging ? 'bg-indigo-400 cursor-grabbing' : 'bg-indigo-500/70 hover:bg-indigo-400 cursor-grab'
          }`}
          style={{ width: `${thumbWidth}%`, left: `${thumbLeft}%` }}
          onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX); }}
          onTouchStart={(e) => startDrag(e.touches[0].clientX)}
        />
      </div>
    </div>
  );
}

// ── Filtered cross-course view ───────────────────────────────────────────────

function FilteredView({ groups, weekFilter, onSessionToggle, onSelectCourse }) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">
          {weekFilter === 'remaining' ? '🎉' : '✓'}
        </div>
        <p className="text-slate-300 font-medium">
          {weekFilter === 'remaining'
            ? 'כל המשימות הושלמו!'
            : `אין שיעורים לשבוע ${weekFilter}`}
        </p>
        {weekFilter === 'remaining' && (
          <p className="text-slate-500 text-sm mt-1">אין שיעורים שנותרו לצפייה</p>
        )}
      </div>
    );
  }

  const heading =
    weekFilter === 'remaining'
      ? `משימות שנותרו — ${groups.reduce((s, g) => s + g.sessions.length, 0)} שיעורים`
      : `שבוע ${weekFilter} — ${groups.reduce((s, g) => s + g.sessions.length, 0)} שיעורים`;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
        {heading}
      </h2>
      {groups.map(({ course, sessions }) => (
        <CourseWeekBlock
          key={course.id}
          course={course}
          sessions={sessions}
          onSessionToggle={onSessionToggle}
          onSelectCourse={onSelectCourse}
        />
      ))}
    </div>
  );
}

// ── Per-course block in filtered view ────────────────────────────────────────

function CourseWeekBlock({ course, sessions, onSessionToggle, onSelectCourse }) {
  const [open, setOpen] = useState(true);
  const watchedCount = sessions.filter((s) => s.watched).length;
  const allDone = watchedCount === sessions.length;

  return (
    <div
      className={`bg-slate-800 border rounded-2xl overflow-hidden shadow-sm transition-colors ${
        allDone ? 'border-emerald-500/30' : 'border-slate-700'
      }`}
    >
      {/* Course header row */}
      <div className="flex items-center px-5 py-3.5">
        <button
          className="flex-1 flex items-center gap-3 text-right"
          onClick={() => setOpen((v) => !v)}
        >
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              allDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {allDone ? '✓' : watchedCount}
          </div>
          <span className="font-semibold text-white text-sm flex-1 text-right">
            {course.name}
          </span>
          <span className="text-xs text-slate-400 flex-shrink-0">
            {watchedCount}/{sessions.length}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Navigate into course */}
        <button
          onClick={() => onSelectCourse(course)}
          className="mr-3 text-slate-500 hover:text-indigo-400 transition-colors flex-shrink-0"
          title="פתח קורס"
        >
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Session rows */}
      {open && (
        <div className="border-t border-slate-700 divide-y divide-slate-700/50">
          {sessions.map((s) => (
            <DashboardSessionRow key={s.id} session={s} onToggle={onSessionToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Session row (inline toggle, no navigation needed) ────────────────────────

function DashboardSessionRow({ session, onToggle }) {
  const [pending, setPending] = useState(false);

  const handleToggle = async () => {
    if (pending) return;
    setPending(true);
    await onToggle(session.id, !session.watched);
    setPending(false);
  };

  return (
    <label className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-slate-700/30 transition-colors group">
      <div className="relative flex-shrink-0">
        <input type="checkbox" checked={session.watched} onChange={handleToggle} disabled={pending} className="sr-only" />
        <div
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            session.watched ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-500 group-hover:border-slate-400'
          } ${pending ? 'opacity-50' : ''}`}
        >
          {session.watched && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <span className={`text-xs border px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[session.type]}`}>
          {TYPE_LABELS[session.type]}
        </span>
        <span className={`text-sm truncate ${session.watched ? 'line-through text-slate-500' : 'text-slate-200'}`}>
          {TYPE_LABELS[session.type]} {session.number}
          {session.type === 'lecture' ? '' : ` — שבוע ${session.week}`}
        </span>
      </div>
      {session.watched && (
        <span className="text-xs text-emerald-500 flex-shrink-0">✓ נצפה</span>
      )}
    </label>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyDashboard({ onAddCourse }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">📚</div>
      <h2 className="text-xl font-semibold text-slate-300 mb-2">אין קורסים עדיין</h2>
      <p className="text-slate-500 mb-6">הוסף קורס ראשון כדי להתחיל לעקוב אחר ההתקדמות שלך</p>
      <button
        onClick={onAddCourse}
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
      >
        הוסף קורס ראשון
      </button>
    </div>
  );
}
