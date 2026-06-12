'use client'

/**
 * NftAssetErrorBoundary.tsx - Error boundary for the NFT asset tool
 * Catches render explosions before they take down the whole page.
 * Without this, one bad prop crashes the universe. With it, we just show a sad card.
 * (React requires a class component for error boundaries. Yes, in 2025. No, we can't change it.)
 *
 * @author Juan – class component archaeologist, doing god's unglamorous work
 */

import { Component, type ReactNode } from 'react'

// The shape of our tiny shame
interface State {
  hasError: boolean
  message: string
}

interface Props {
  children: ReactNode
}

export default class NftAssetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    // Something exploded. We note it. We move on.
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // Log it so devtools can mourn the loss
    console.error('[NFT Asset Tool] Render error:', error, info.componentStack)
  }

  reset = () => {
    // Give the user a second chance. We believe in redemption.
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="w-full max-w-md rounded-xl border border-dark-accent-error/30 bg-dark-accent-error/5 p-8 text-center">
          {/* The sad icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dark-accent-error/30 bg-dark-accent-error/10">
              <svg
                className="h-7 w-7 text-dark-accent-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
          </div>

          <h2 className="mb-2 text-base font-semibold text-dark-text-primary">
            Something went wrong
          </h2>
          <p className="mb-1 text-sm text-dark-text-tertiary">
            The tool ran into an error and had to stop.
          </p>
          {this.state.message && (
            <p className="mb-6 rounded-lg border border-dark-border-primary bg-dark-bg-primary px-3 py-2 font-mono text-xs text-dark-text-secondary">
              {this.state.message}
            </p>
          )}
          {!this.state.message && <div className="mb-6" />}

          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg border border-dark-accent-primary/30 bg-dark-accent-primary/10 px-5 py-2.5 text-sm font-medium text-dark-accent-primary transition-colors hover:border-dark-accent-primary/50 hover:bg-dark-accent-primary/15"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}

// — Juan. It broke. We caught it. Click the button. The layers are still there (probably).
