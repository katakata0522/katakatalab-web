import React from 'react';
import { RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  variant?: 'page' | 'stage';
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * 予期しない描画例外発生時にアプリ全体のクラッシュを防ぎ、
 * 内部エラー詳細を画面へ露出せずに安全な復旧手段を提供する。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.variant === 'stage') {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-center"
        >
          <p className="text-xs font-semibold text-zinc-700">
            このプレビューの表示中に問題が発生しました
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>表示をリセット</span>
          </button>
        </div>
      );
    }

    return (
      <div
        role="alert"
        className="flex min-h-screen items-center justify-center bg-[#faf9f6] p-6 text-zinc-900"
      >
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xs">
          <h1 className="text-base font-bold text-zinc-900">画面の表示に問題が発生しました</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
            一時的な表示エラーを検知しました。下のボタンから表示を復帰できます。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>ページを再読み込み</span>
          </button>
        </div>
      </div>
    );
  }
}
