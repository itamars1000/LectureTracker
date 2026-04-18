import { useMemo, useRef, useState } from 'react';

const TYPE_LABELS = { lecture: 'הרצאה', tutorial: 'תרגול' };
const TYPE_COLORS = {
  lecture: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  tutorial: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
};

export default function CourseDetail({ course, onSessionToggle, onSessionDelete }) {
  // 'all' | 'lecture' | 'tutorial'
  const [typeFilter, setTypeFilter] = useState('all');
  // 'all' | 'remaining' | 1..N (number)
  const [weekFilter, setWeekFilter] = useState('all');

  const sessions = course.sessions ?? [];
  const total = sessions.length;
  const watched = sessions.filter((s) => s.watched).length;
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0;

  // All week numbers up to totalWeeks OR highest actual week present
  const allWeeks = useMemo(() => {
    let maxWeek = course.totalWeeks || 0;
    (course.sessions || []).forEach(s => {
      if (s.week > maxWeek) maxWeek = s.week;
    });
    return Array.from({ length: maxWeek }, (_, i) => i + 1);
  }, [course.totalWeeks, course.sessions]);

  // Weeks where every session in this course is watched
  const completedWeeks = useMemo(() => {
    const done = new Set();
    allWeeks.forEach((week) => {
      const ws = sessions.filter((s) => s.week === week);
      if (ws.length > 0 && ws.every((s) => s.watched)) done.add(week);
    });
    return done;
  }, [sessions, allWeeks]);

  // Group all sessions by week (unfiltered — used for week-level progress badges)
  const byWeek = useMemo(() => {
    const map = {};
    sessions.forEach((s) => {
      if (!map[s.week]) map[s.week] = [];
      map[s.week].push(s);
    });
    return map;
  }, [sessions]);

  // Derive the visible weeks + their session lists from both filters
  const filteredWeeks = useMemo(() => {
    // Which weeks to include
    const weeksToShow =
      typeof weekFilter === 'number' ? [weekFilter] : allWeeks;

    return weeksToShow
      .map((week) => {
        let list = byWeek[week] ?? [];

        // "משימות שנותרו" — only unwatched, regardless of typeFilter
        if (weekFilter === 'remaining') {
          list = list.filter((s) => !s.watched);
        } else {
          if (typeFilter === 'lecture') list = list.filter((s) => s.type === 'lecture');
          else if (typeFilter === 'tutorial') list = list.filter((s) => s.type === 'tutorial');
        }

        return { week, sessions: list };
      })
      // for 'remaining' skip empty weeks; for all/week-number keep them so the week block is always visible
      .filter((w) => weekFilter === 'remaining' ? w.sessions.length > 0 : true);
  }, [byWeek, allWeeks, weekFilter, typeFilter]);

  const handleWeekFilter = (val) => {
    setWeekFilter(val);
    // "remaining" implies all unwatched — type filter is irrelevant there, reset it
    if (val === 'remaining') setTypeFilter('all');
  };

  return (
    <div className="space-y-5">
      {/* Course progress card */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm text-slate-400 mb-1">התקדמות בקורס</div>
            <div className="text-3xl font-bold text-white">{pct}%</div>
          </div>
          <div className="text-left">
            <div className="text-sm text-emerald-400 font-semibold">{watched} הושלמו</div>
            <div className="text-sm text-slate-400">{total - watched} נותרו</div>
          </div>
        </div>
        <div className="progress-bar h-3">
          <div
            className="progress-fill bg-gradient-to-l from-indigo-500 to-violet-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="bg-slate-700/50 rounded-xl py-2">
            <div className="font-bold text-white">{course.totalWeeks}</div>
            <div className="text-xs text-slate-400">שבועות</div>
          </div>
          <div className="bg-slate-700/50 rounded-xl py-2">
            <div className="font-bold text-indigo-300">{course.weeklyLectures}</div>
            <div className="text-xs text-slate-400">הרצאות/שבוע</div>
          </div>
          <div className="bg-slate-700/50 rounded-xl py-2">
            <div className="font-bold text-violet-300">{course.weeklyTutorials}</div>
            <div className="text-xs text-slate-400">תרגולים/שבוע</div>
          </div>
        </div>
      </div>

      {/* ── Sticky filter bar ───────────────────────────────────────────── */}
      <div className="pt-1 pb-3 space-y-3">
        {/* Week Picker */}
        <WeekPicker
          weeks={allWeeks}
          value={weekFilter}
          onChange={handleWeekFilter}
          completedWeeks={completedWeeks}
        />

        {/* Type filter — hidden when "remaining" is active (redundant there) */}
        {weekFilter !== 'remaining' && (
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { key: 'all', label: 'הכל' },
              { key: 'lecture', label: 'הרצאות' },
              { key: 'tutorial', label: 'תרגולים' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${typeFilter === f.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                {f.label}
              </button>
            ))}

            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-1.5 rounded-full text-sm font-medium border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all mr-auto"
            >
              + הוסף חריג
            </button>
          </div>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-4">
        {filteredWeeks.length === 0 ? (
          <EmptyState weekFilter={weekFilter} />
        ) : (
          filteredWeeks.map(({ week, sessions: ws }) => {
            const allWeekSessions = byWeek[week] ?? [];
            const ww = allWeekSessions.filter((s) => s.watched).length;
            const wt = allWeekSessions.length;
            return (
              <WeekBlock
                key={week}
                week={week}
                sessions={ws}
                weekDone={wt > 0 && ww === wt}
                weekWatched={ww}
                weekTotal={wt}
                // Auto-expand when a specific week is pinned
                defaultOpen={typeof weekFilter === 'number' || weekFilter === 'remaining'}
                onToggle={onSessionToggle}
                onDelete={onSessionDelete}
                onAddExtra={() => handleOpenAddModal(week)}
              />
            );
          })
        )}
      </div>

      {showAddModal && (
        <AddExtraSessionModal
          course={course}
          defaultWeek={addModalWeek}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddSubmit}
        />
      )}
    </div>
  );
}

// ── Add Extra Session Modal ──────────────────────────────────────────────────

function AddExtraSessionModal({ course, defaultWeek, onClose, onSubmit }) {
  const [week, setWeek] = useState(defaultWeek || course.totalWeeks || 1);
  const [type, setType] = useState('lecture');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(week, type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">הוספת שיעור חריג</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">הוסף לשבוע</label>
            <input
              type="number"
              min={1}
              max={50}
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">סוג שיעור</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('lecture')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${type === 'lecture' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}
              >
                הרצאה
              </button>
              <button
                type="button"
                onClick={() => setType('tutorial')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${type === 'tutorial' ? 'bg-violet-600 border-violet-600 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}
              >
                תרגול
              </button>
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-medium transition-colors"
            >
              הוסף שיעור
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Week Picker ──────────────────────────────────────────────────────────────

function WeekPicker({ weeks, value, onChange, completedWeeks = new Set() }) {
  const scrollRef = useRef(null);

  const pills = [
    { key: 'all', label: 'כל השבועות' },
    ...weeks.map((w) => ({ key: w, label: `שבוע ${w}` })),
    { key: 'remaining', label: 'משימות שנותרו' },
  ];

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {pills.map(({ key, label }) => {
        const active = value === key;
        const isRemaining = key === 'remaining';
        const done = !isRemaining && key !== 'all' && completedWeeks.has(key);
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${active
                ? isRemaining
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : done
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-indigo-600 border-indigo-600 text-white'
                : isRemaining
                  ? 'bg-transparent border-amber-500/30 text-amber-400/70 hover:border-amber-500/60 hover:text-amber-300'
                  : done
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
              }`}
          >
            {isRemaining && (
              <span className="ml-1">⚑</span>
            )}
            {done && !active && <span className="ml-1">✓</span>}
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ weekFilter }) {
  if (weekFilter === 'remaining') {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-4xl mb-3">🎉</div>
        <div className="font-medium text-slate-300">כל המשימות הושלמו!</div>
        <div className="text-sm mt-1">אין שיעורים שנותרו לצפייה</div>
      </div>
    );
  }
  return (
    <div className="text-center py-12 text-slate-400">
      <div className="text-4xl mb-3">✓</div>
      <div>כל השיעורים בשבוע זה סומנו!</div>
    </div>
  );
}

// ── Week Block ───────────────────────────────────────────────────────────────

function WeekBlock({ week, sessions, weekDone, weekWatched, weekTotal, defaultOpen, onToggle, onDelete, onAddExtra }) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  return (
    <div
      className={`bg-slate-800 border rounded-2xl overflow-hidden shadow-sm transition-colors ${weekDone ? 'border-emerald-500/30' : 'border-slate-700'
        }`}
    >
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${weekDone
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-700 text-slate-300'
              }`}
          >
            {weekDone ? '✓' : week}
          </div>
          <span className="font-semibold text-white">שבוע {week}</span>
          {weekDone && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              הושלם
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {weekWatched}/{weekTotal}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        sessions.length === 0 ? (
          <div className="px-5 py-4 flex flex-col items-center justify-center gap-2 border-t border-slate-700">
            <div className="text-sm text-slate-500">אין שיעורים בשבוע זה</div>
            {onAddExtra && (
              <button
                onClick={onAddExtra}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors border border-slate-600"
              >
                + הוסף שיעור
              </button>
            )}
          </div>
        ) : (
          <div className="border-t border-slate-700 divide-y divide-slate-700/50">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} onToggle={onToggle} onDelete={onDelete} />
            ))}
            {onAddExtra && (
              <div className="px-5 py-3 bg-slate-800/30">
                <button
                  onClick={onAddExtra}
                  className="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1 font-medium"
                >
                  <span className="text-lg leading-none mb-0.5">+</span> הוסף שיעור
                </button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({ session, onToggle, onDelete }) {
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggle = async () => {
    if (pending) return;
    setPending(true);
    await onToggle(session.id, !session.watched);
    setPending(false);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    if (confirmDelete) {
      onDelete(session.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <label className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-slate-700/30 transition-colors group">
      <div className="relative flex-shrink-0">
        <input
          type="checkbox"
          checked={session.watched}
          onChange={handleToggle}
          disabled={pending}
          className="sr-only"
        />
        <div
          onClick={handleToggle}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${session.watched
              ? 'bg-emerald-500 border-emerald-500'
              : 'bg-transparent border-slate-500 group-hover:border-slate-400'
            } ${pending ? 'opacity-50' : ''}`}
        >
          {session.watched && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <span className={`text-xs border px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[session.type]}`}>
          {TYPE_LABELS[session.type]}
        </span>
        <span
          className={`text-sm ${session.watched ? 'line-through text-slate-500' : 'text-slate-200'}`}
        >
          {TYPE_LABELS[session.type]} {session.number}
        </span>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        className={`flex-shrink-0 transition-all text-xs rounded-lg px-2 py-0.5 ${confirmDelete
            ? 'bg-red-500 text-white'
            : 'opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400'
          }`}
        title={confirmDelete ? 'לחץ שוב לאישור' : 'מחק שיעור'}
      >
        {confirmDelete ? 'מחק?' : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </label>
  );
}
