const FEATURES = [
  { emoji: '📖', text: 'מעקב שיעורים ותרגולים לפי שבוע' },
  { emoji: '✅', text: 'ניהול משימות מקושרות לקורסים' },
  { emoji: '☁️', text: 'סנכרון בענן בין כל המכשירים' },
];

export default function LoginPage({ onSignIn, loading, error }) {
  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center p-6 overflow-hidden"
      dir="rtl"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-white dark:bg-slate-900" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-white dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900 pointer-events-none" />

      {/* Decorative glow — top centre */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[480px] h-[320px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 flex flex-col gap-10">

        {/* ── Branding ─────────────────────────────────────────────────────── */}
        <div className="text-center flex flex-col items-center gap-5">
          {/* App icon */}
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/25 flex items-center justify-center shadow-sm">
            <span className="text-4xl select-none">📚</span>
          </div>

          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
              מעקב הרצאות
            </h1>
            <h1 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight leading-snug">
              ותרגולים
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
              עקוב אחר ההתקדמות שלך בכל קורס בסמסטר
            </p>
          </div>
        </div>

        {/* ── Feature list ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {FEATURES.map(({ emoji, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 bg-gray-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 rounded-2xl px-4 py-3"
            >
              <span className="text-xl flex-shrink-0 select-none">{emoji}</span>
              <span className="text-sm text-gray-600 dark:text-slate-300 font-medium">{text}</span>
            </div>
          ))}
        </div>

        {/* ── Sign-in ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {error && (
            <div className="text-sm text-red-500 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          {/* Google sign-in button — white background per Google brand guidelines */}
          <button
            onClick={onSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed text-gray-800 font-semibold py-3.5 px-4 rounded-2xl transition-all shadow-md hover:shadow-lg border border-gray-200"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin flex-shrink-0" />
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{loading ? 'מתחבר...' : 'כניסה עם Google'}</span>
          </button>

          <p className="text-xs text-gray-400 dark:text-slate-500 text-center leading-relaxed">
            הנתונים שלך שמורים בצורה מאובטחת
          </p>
        </div>

      </div>
    </div>
  );
}
