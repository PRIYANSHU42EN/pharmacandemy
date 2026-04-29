'use client'
 
import { useEffect } from 'react'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[Global Error Boundary]", error)
  }, [error])
 
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1 className="text-[24px] font-bold text-navy mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        Something went wrong!
      </h1>
      <p className="text-[14px] text-gray-500 max-w-md mb-8" style={{ fontFamily: 'var(--font-body)' }}>
        We encountered an unexpected error. Don't worry, your data is safe. Please try refreshing the page or click the button below.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-8 py-3 bg-candy-rose text-navy font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-all active:scale-[0.98]"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-white border border-gray-200 text-navy font-bold rounded-xl hover:bg-gray-50 transition-all"
        >
          Back to Home
        </button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-12 p-4 bg-gray-100 rounded-lg text-left max-w-2xl overflow-auto">
          <p className="text-[11px] font-mono text-red-600">{error.message}</p>
          <pre className="text-[10px] font-mono text-gray-400 mt-2">{error.stack}</pre>
        </div>
      )}
    </div>
  )
}
