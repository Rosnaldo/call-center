import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Atualiza o estado para que a próxima renderização mostre a UI alternativa.
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Captured by ErrorBoundary:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div id="error-boundary-container" className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-rose-50 border border-rose-100 rounded-2xl max-w-lg mx-auto my-12 text-center animate-fade-in shadow-sm">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-rose-900 mb-2 font-sans">Ops! Algo deu errado</h2>
          <p className="text-rose-700 text-sm mb-6 max-w-md font-sans">
            Ocorreu um erro inesperado durante a renderização. Nossa equipe de simulação já foi notificada.
          </p>
          <div className="bg-white border border-rose-200 rounded-lg p-3 text-left w-full mb-6 max-h-40 overflow-auto">
            <code className="text-xs text-rose-600 font-mono block break-words">
              {this.state.error?.toString() || 'Erro desconhecido'}
            </code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

