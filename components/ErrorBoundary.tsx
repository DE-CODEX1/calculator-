import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Telegram Config (Hardcoded for stability during crashes)
const TELEGRAM_BOT_TOKEN = "8402034051:AAEOB5tiWnSK0Cubc_Qhl8BsNDhLIUf3hos";
const TELEGRAM_CHAT_ID = "8379688666";

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.reportErrorToTelegram(error, errorInfo);
  }

  private async reportErrorToTelegram(error: Error, errorInfo: ErrorInfo) {
    try {
      const report = `
⚠️ <b>APP CRASH DETECTED (AUTO-HEALING)</b> ⚠️

<b>Error:</b> ${error.toString()}
<b>Component:</b> ${errorInfo.componentStack?.slice(0, 150)}...
<b>User Agent:</b> ${navigator.userAgent}
<b>Time:</b> ${new Date().toLocaleString()}
      `;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: report,
          parse_mode: 'HTML'
        })
      });
    } catch (e) {
      // Fallback if network fails
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold text-white mb-2">System Glitch Detected</h1>
          <p className="text-gray-400 mb-6 max-w-xs">
            An anomaly occurred. Protocols are attempting to self-heal.
          </p>
          <button 
            onClick={this.handleReload}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl transition-all font-mono"
          >
            <RefreshCw className="w-4 h-4" /> REBOOT SYSTEM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;