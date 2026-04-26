import { Component } from 'react';

/**
 * Top-level error boundary.
 * Catches synchronous render errors from any child component and shows a
 * friendly Hebrew fallback instead of a blank white screen.
 *
 * Usage: wrap <App /> in main.jsx
 *   <ErrorBoundary><App /></ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6"
          dir="rtl"
        >
          <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/40 rounded-2xl p-8 max-w-md w-full shadow-xl text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              משהו השתבש
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm">
              אירעה שגיאה בלתי צפויה. ניתן לנסות לרענן את הדף.
            </p>

            <details className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700/50 rounded-lg p-3 text-right">
              <summary className="cursor-pointer font-medium mb-1">
                פרטי השגיאה
              </summary>
              <pre className="whitespace-pre-wrap break-all mt-1 text-right">
                {this.state.error.message}
              </pre>
            </details>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-medium transition-colors"
            >
              רענן דף
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
