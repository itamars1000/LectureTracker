import { useState } from 'react';

const STATUS_FILTERS = [
  { key: 'all',     label: 'הכל' },
  { key: 'pending', label: 'פתוחות' },
  { key: 'done',    label: 'הושלמו' },
];

export default function TodosPage({ todos, courses, onAddTodo, onToggleTodo, onDeleteTodo }) {
  const [desc, setDesc] = useState('');
  const [linkedCourseId, setLinkedCourseId] = useState('');
  const [linkedWeek, setLinkedWeek] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('');

  const courseWeeks = linkedCourseId
    ? [...new Set(
        (courses.find((c) => c.id === linkedCourseId)?.sessions ?? []).map((s) => s.week)
      )].sort((a, b) => a - b)
    : [];

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
  };

  const filtered = todos.filter((t) => {
    if (statusFilter === 'pending' && t.done) return false;
    if (statusFilter === 'done' && !t.done) return false;
    if (courseFilter && t.linkedCourseId !== courseFilter) return false;
    return true;
  });

  const pendingCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{todos.length}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">סה"כ</div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">פתוחות</div>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{doneCount}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">הושלמו</div>
        </div>
      </div>

      {/* Add todo form */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-300">משימה חדשה</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="תיאור המשימה..."
              dir="rtl"
              className="flex-1 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!desc.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              הוסף
            </button>
          </div>
          <div className="flex gap-2">
            <select
              value={linkedCourseId}
              onChange={(e) => { setLinkedCourseId(e.target.value); setLinkedWeek(''); }}
              dir="rtl"
              className="flex-1 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
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
                className="w-32 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="">שבוע (אופציונלי)</option>
                {courseWeeks.map((w) => (
                  <option key={w} value={w}>שבוע {w}</option>
                ))}
              </select>
            )}
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                statusFilter === key
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {courses.length > 0 && (
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            dir="rtl"
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 text-xs rounded-full px-3 py-1 focus:outline-none focus:border-indigo-500"
          >
            <option value="">כל הקורסים</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Todo list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">{todos.length === 0 ? '📝' : '🎉'}</div>
          <p className="text-gray-600 dark:text-slate-300 font-medium">
            {todos.length === 0
              ? 'אין משימות עדיין'
              : statusFilter === 'done'
              ? 'אין משימות שהושלמו'
              : 'כל המשימות הושלמו!'}
          </p>
          {todos.length === 0 && (
            <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">הוסף משימה ראשונה למעלה</p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((todo) => {
            const linkedCourse = todo.linkedCourseId
              ? courses.find((c) => c.id === todo.linkedCourseId)
              : null;
            return (
              <li
                key={todo.id}
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${
                  todo.done
                    ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-200/60 dark:border-slate-700/50'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <button
                  onClick={() => onToggleTodo(todo.id, !todo.done)}
                  className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    todo.done
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-transparent border-gray-300 dark:border-slate-500 hover:border-emerald-400'
                  }`}
                >
                  {todo.done && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0" dir="rtl">
                  <span className={`text-sm block leading-snug ${
                    todo.done ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-100'
                  }`}>
                    {todo.description}
                  </span>
                  {(linkedCourse || todo.linkedWeek) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {linkedCourse && (
                        <span className="inline-flex items-center text-xs bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                          {linkedCourse.name}
                        </span>
                      )}
                      {todo.linkedWeek && (
                        <span className="inline-flex items-center text-xs bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
                          שבוע {todo.linkedWeek}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onDeleteTodo(todo.id)}
                  className="flex-shrink-0 text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors mt-0.5"
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
  );
}
