import { useState } from 'react';

export default function CourseWizard({ onSubmit, onClose, editCourse }) {
  const isEdit = !!editCourse;
  const [form, setForm] = useState({
    name: editCourse?.name ?? '',
    totalWeeks: editCourse?.totalWeeks ?? 13,
    weeklyLectures: editCourse?.weeklyLectures ?? 2,
    weeklyTutorials: editCourse?.weeklyTutorials ?? 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const structureChanged = isEdit && (
    form.totalWeeks !== editCourse.totalWeeks ||
    form.weeklyLectures !== editCourse.weeklyLectures ||
    form.weeklyTutorials !== editCourse.weeklyTutorials
  );

  const totalSessions =
    form.totalWeeks * (Number(form.weeklyLectures) + Number(form.weeklyTutorials));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'name' ? value : Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('יש להזין שם קורס'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit(form);
    } catch {
      setError('שגיאה ביצירת הקורס, נסה שוב');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? 'עריכת קורס' : 'הוספת קורס חדש'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              {isEdit ? 'עדכן את פרטי הקורס' : 'מלא את הפרטים לייצור לוח זמנים אוטומטי'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
              שם הקורס <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="לדוגמה: מבוא למדעי המחשב"
              className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
              מספר שבועות בסמסטר
            </label>
            <input
              type="number"
              name="totalWeeks"
              min={1}
              max={30}
              value={form.totalWeeks}
              onChange={handleChange}
              className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                הרצאות בשבוע
              </label>
              <input
                type="number"
                name="weeklyLectures"
                min={0}
                max={10}
                value={form.weeklyLectures}
                onChange={handleChange}
                className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1.5">
                תרגולים בשבוע
              </label>
              <input
                type="number"
                name="weeklyTutorials"
                min={0}
                max={10}
                value={form.weeklyTutorials}
                onChange={handleChange}
                className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-100/80 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-200/80 dark:border-slate-600/50">
            <div className="text-xs text-gray-500 dark:text-slate-400 mb-2 font-medium">תצוגה מקדימה</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-300">סה"כ שיעורים שייווצרו:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalSessions}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-slate-400 mt-1">
              <span>
                {form.totalWeeks} שבועות × ({form.weeklyLectures} הרצאות + {form.weeklyTutorials} תרגולים)
              </span>
            </div>
          </div>

          {structureChanged && (
            <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>שינוי מבנה הקורס (שבועות/הרצאות/תרגולים) יאפס את כל ההתקדמות.</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white py-2.5 rounded-xl font-medium transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isEdit ? 'שמור שינויים' : 'צור קורס'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
