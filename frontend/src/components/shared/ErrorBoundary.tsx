import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <RefreshCw size={24} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-semibold font-ui mb-1">Something went wrong</p>
            <p className="text-gray-500 text-sm font-body">Please reload the page to try again.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 bg-ascb-orange hover:bg-ascb-orange-dark text-white rounded-xl text-sm font-semibold font-ui transition-all active:scale-95"
          >
            <RefreshCw size={15} /> Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
