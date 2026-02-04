'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render errors in the wallet subtree, logs them (so we get debug when
 * things "just happen"), and shows a fallback UI instead of a blank page.
 */
export default class LoggingErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(err: Error): State {
    return { error: err }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', err)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback
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
