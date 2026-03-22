import { useState, useRef, useEffect } from 'react';

export default function TodoPanel({ todos, courses, weekFilter, onAddTodo, onToggleTodo, onDeleteTodo }) {
  const [open, setOpen] = useState(true);
  const [desc, setDesc] = useState('');
  const [linkedCourseId, setLinkedCourseId] = useState('');
  const [linkedWeek, setLinkedWeek] = useState('');
  const inputRef = useRef(null);

  // Weeks available for the selected course
  const courseWeeks = linkedCourseId
    ? [...new Set(
        (courses.find((c) => c.id === linkedCourseId)?.sessions ?? []).map((s) => s.week)
      )].sort((a, b) => a - b)
    : [];

  // When course selection changes, reset week
  useEffect(() => { setLinkedWeek(''); }, [linkedCourseId]);

  // Filter todos based on the current weekFilter
  const visibleTodos = todos.filter((t) => {
    if (weekFilter === 'remaining') return !t.done;
    if (weekFilter === 'all') return true;
    // Numeric week filter: show todos linked to that week OR unlinked todos
    if (typeof weekFilter === 'number') {
      if (t.linkedWeek && t.linkedCourseId) return t.linkedWeek === weekFilter;
      return !t.linkedWeek; // unlinked todos always show
    }
    return true;
  });

  const pendingCount = todos.filter((t) => !t.done).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = desc.trim();
    if (!trimmed) return;
    onAddTodo({
      description: trimmed,
      linkedCourseId: linkedCourseId || null,
      linkedWeek: linkedWeek ? Number(linkedWeek) : null,
    });
    setDesc('');
    setLinkedCourseId('');
    setLinkedWeek('');
    inputRef.current?.focus();
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white">מרכז משימות</span>
          {pendingCount > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
              {pendingCount} פתוחות
            </span>
          )}
          {pendingCount === 0 && todos.length > 0 && (
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              הכל הושלם ✓
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-700 px-5 py-4 space-y-4">
          {/* Add todo form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="משימה חדשה..."
                dir="rtl"
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!desc.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                הוסף
              </button>
            </div>

            {/* Optional course + week link */}
            <div className="flex gap-2">
              <select
                value={linkedCourseId}
                onChange={(e) => setLinkedCourseId(e.target.value)}
                dir="rtl"
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="">קורס (אופציונלי)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {linkedCourseId && courseWeeks.length > 0 && (
                <select
                  value={linkedWeek}
                  onChange={(e) => setLinkedWeek(e.target.value)}
                  dir="rtl"
                  className="w-32 bg-slate-700 border border-slate-600 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">שבוע (אופציונלי)</option>
                  {courseWeeks.map((w) => (
                    <option key={w} value={w}>שבוע {w}</option>
                  ))}
                </select>
              )}
            </div>
          </form>

          {/* Todo list */}
          {visibleTodos.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-4">
              {weekFilter === 'remaining'
                ? 'אין משימות פתוחות 🎉'
                : 'אין משימות להצגה'}
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleTodos.map((todo) => {
                const linkedCourse = todo.linkedCourseId
                  ? courses.find((c) => c.id === todo.linkedCourseId)
                  : null;
                return (
                  <li
                    key={todo.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      todo.done
                        ? 'bg-slate-700/30 border-slate-700/50'
                        : 'bg-slate-700/50 border-slate-600/50 hover:border-slate-500/70'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => onToggleTodo(todo.id, !todo.done)}
                      className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        todo.done
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'bg-transparent border-slate-500 hover:border-emerald-400'
                      }`}
                    >
                      {todo.done && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0" dir="rtl">
                      <span className={`text-sm block ${todo.done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {todo.description}
                      </span>
                      {/* Badges */}
                      {(linkedCourse || todo.linkedWeek) && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {linkedCourse && (
                            <span className="inline-flex items-center text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                              {linkedCourse.name}
                            </span>
                          )}
                          {todo.linkedWeek && (
                            <span className="inline-flex items-center text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
                              שבוע {todo.linkedWeek}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteTodo(todo.id)}
                      className="flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors mt-0.5"
                      title="מחק משימה"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
