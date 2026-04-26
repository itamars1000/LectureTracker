import { useState } from 'react';
import { getCourseColor } from '../lib/courseColors.js';

// ── SVG Progress Ring ────────────────────────────────────────────────────────

function ProgressRing({ pct, colorHex }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const isDone = pct === 100;

  return (
    <div className="relative w-[72px] h-[72px] flex items-center justify-center flex-shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        {/* Track */}
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-gray-200 dark:text-slate-700"
        />
        {/* Progress fill */}
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            stroke: isDone ? '#10b981' : colorHex,
            transition: 'stroke-dashoffset 0.7s ease',
          }}
        />
      </svg>
      {/* Centre label */}
      <span className="absolute text-sm font-bold text-gray-900 dark:text-white">
        {pct}%
      </span>
    </div>
  );
}

// ── Course Card ──────────────────────────────────────────────────────────────

export default function CourseCard({ course, onClick, onDelete, onEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pct = course.total > 0 ? Math.round((course.watched / course.total) * 100) : 0;
  const isDone = pct === 100;
  const color = getCourseColor(course.id);

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-800
        border border-gray-200 dark:border-slate-700
        ${color.hoverBorder}
        rounded-2xl p-5 cursor-pointer
        hover:shadow-md transition-all duration-200
        group relative shadow-sm
      `}
    >
      {/* Delete button — top left, appears on hover (or when confirming) */}
      <button
        onClick={handleDelete}
        className={`absolute top-3 left-3 p-1.5 rounded-lg text-xs transition-all ${
          confirmDelete
            ? 'bg-red-500 text-white'
            : 'text-gray-400 dark:text-slate-500 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100'
        }`}
        title={confirmDelete ? 'לחץ שוב לאישור מחיקה' : 'מחק קורס'}
      >
        {confirmDelete ? (
          <span className="px-1 font-medium">מחק?</span>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>

      {/* Edit button — top right, appears on hover (replaces the badge visually) */}
      <button
        onClick={handleEdit}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100"
        title="ערוך קורס"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* Completed badge — top right, hidden on hover (edit button takes over) */}
      {isDone && (
        <span className="absolute top-3 right-3 text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium group-hover:opacity-0 transition-opacity">
          הושלם ✓
        </span>
      )}

      {/* Course name — pl-6 clears the delete button */}
      <h3 className={`text-base font-bold mb-1 transition-colors line-clamp-2 pl-6 tracking-tight
        text-gray-900 dark:text-white ${color.hoverText}`}
      >
        {course.name}
      </h3>

      {/* Meta */}
      <p className="text-xs text-gray-400 dark:text-slate-400 mb-5">
        {course.totalWeeks} שבועות · {course.total} שיעורים
      </p>

      {/* Progress ring — centered */}
      <div className="flex flex-col items-center gap-2">
        <ProgressRing pct={pct} colorHex={color.hex} />
        <p className="text-xs text-gray-400 dark:text-slate-400">
          {course.watched} / {course.total} נצפו
        </p>
      </div>
    </div>
  );
}
