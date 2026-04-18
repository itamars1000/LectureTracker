import { useState } from 'react';

export default function CourseCard({ course, onClick, onDelete, onEdit }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pct = course.total > 0 ? Math.round((course.watched / course.total) * 100) : 0;

  const colorClass =
    pct === 100
      ? 'from-emerald-500 to-teal-500'
      : pct >= 50
      ? 'from-indigo-500 to-violet-500'
      : 'from-blue-500 to-indigo-500';

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
      className="bg-slate-800 border border-slate-700 rounded-2xl p-5 cursor-pointer hover:border-indigo-500/60 hover:bg-slate-750 transition-all duration-200 group relative shadow-md"
    >
      {/* Action buttons */}
      <div className="absolute top-3 left-3 flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(course); }}
          className="p-1.5 rounded-lg text-xs text-slate-500 hover:text-indigo-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
          title="ערוך קורס"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className={`p-1.5 rounded-lg text-xs transition-all ${
            confirmDelete
              ? 'bg-red-500 text-white'
              : 'text-slate-500 hover:text-red-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100'
          }`}
          title={confirmDelete ? 'לחץ שוב לאישור מחיקה' : 'מחק קורס'}
        >
          {confirmDelete ? (
            <span className="px-1 font-medium">מחק?</span>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Badge */}
      {pct === 100 && (
        <span className="absolute top-3 right-3 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
          הושלם ✓
        </span>
      )}

      {/* Course name */}
      <h3 className="text-base font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors line-clamp-2 pl-6">
        {course.name}
      </h3>

      {/* Meta */}
      <div className="flex gap-3 text-xs text-slate-400 mb-4">
        <span>{course.totalWeeks} שבועות</span>
        <span>·</span>
        <span>{course.total} שיעורים</span>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">{course.watched} / {course.total} נצפו</span>
          <span className="font-semibold text-white">{pct}%</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-fill bg-gradient-to-l ${colorClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
