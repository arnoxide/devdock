import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <AlertTriangle size={40} className="text-dock-yellow mb-4" />
          <h2 className="text-lg font-semibold text-dock-text mb-2">
            {this.props.fallbackMessage || 'Something went wrong'}
          </h2>
          <p className="text-sm text-dock-muted mb-1">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <pre className="text-[10px] text-dock-muted bg-dock-bg border border-dock-border rounded-lg p-3 max-w-lg max-h-40 overflow-auto mt-3 text-left whitespace-pre-wrap">
            {this.state.error?.stack}
          </pre>
          <button
            onClick={this.handleReset}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-dock-accent text-white text-sm hover:bg-dock-accent/80 transition-colors"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
