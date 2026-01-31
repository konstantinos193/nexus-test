'use client'

/**
 * LoggingErrorBoundary - Catches render errors in the wallet subtree
 * Logs them so we get a clue when things "just happen"
 * Shows a fallback UI instead of a blank page
 * Because a blank page is just us giving up. And we don't give up
 *
 * Class component (required for getDerivedStateFromError + componentDidCatch)
 * If we have a fallback prop, we render it; else we render a simple "Something went wrong" + message + Try again
 *
 * @author Juan - The developer who caught the errors
 * (Coded with care, humor, and probably too much coffee)
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export default class LoggingErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  // Sync state with the error so we can render the fallback UI
  static getDerivedStateFromError(err: Error): State {
    return { error: err }
  }

  // Log to console so we get a clue in dev (and in production if they open devtools)
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', err)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
      // Default fallback: message + error text + Try again button
      return (
        <div className="min-h-screen bg-dark-bg-primary flex flex-col items-center justify-center gap-4 px-4" role="alert">
          <p className="text-dark-text-secondary text-center font-medium">Something went wrong.</p>
          <pre className="text-xs text-dark-text-secondary/80 bg-dark-bg-secondary p-3 rounded-lg overflow-auto max-w-full max-h-32">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 rounded-lg bg-dark-border-accent hover:bg-dark-border-accent/80 text-dark-text-primary font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - We catch. We log. We show a way out.
