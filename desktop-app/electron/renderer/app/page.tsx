'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Settings,
  Power,
  FileWarning,
  Wifi,
  Cpu,
  ChevronRight,
  X,
} from 'lucide-react';

// Types
interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  details: any;
  timestamp: number;
  agent: string;
}

interface AgentStatus {
  status: 'running' | 'stopped' | 'error';
  error?: string;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ status: 'stopped' });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [user, setUser] = useState<any>(null);

  // Wait for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if we're in Electron (only after mount)
  const isElectron = mounted && typeof window !== 'undefined' && !!(window as any).havenai;

  useEffect(() => {
    if (!mounted || !isElectron) return;

    const havenai = (window as any).havenai;

    // Load saved credentials
    havenai.getCredentials().then((creds: any) => {
      if (creds.accessToken && creds.user) {
        setUser(creds.user);
      }
    });

    // Get initial agent status
    havenai.getAgentStatus().then((status: string) => {
      setAgentStatus({ status: status as 'running' | 'stopped' });
    });

    // Listen for new alerts
    havenai.onNewAlert((alert: Alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    // Listen for agent status changes
    havenai.onAgentStatus((status: AgentStatus) => {
      setAgentStatus(status);
    });

    return () => {
      havenai.removeAllListeners('new-alert');
      havenai.removeAllListeners('agent-status');
    };
  }, [mounted, isElectron]);

  const toggleAgent = async () => {
    if (!isElectron) return;
    const havenai = (window as any).havenai;

    if (agentStatus.status === 'running') {
      await havenai.stopAgent();
      setAgentStatus({ status: 'stopped' });
    } else {
      await havenai.startAgent();
      setAgentStatus({ status: 'running' });
    }
  };

  const getStatusColor = () => {
    switch (agentStatus.status) {
      case 'running':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (agentStatus.status) {
      case 'running':
        return <ShieldCheck className="h-16 w-16 text-green-400" />;
      case 'error':
        return <ShieldAlert className="h-16 w-16 text-red-400" />;
      default:
        return <Shield className="h-16 w-16 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 border-red-500 text-red-400';
      case 'high':
        return 'bg-orange-500/20 border-orange-500 text-orange-400';
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      default:
        return 'bg-blue-500/20 border-blue-500 text-blue-400';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'suspicious_download':
        return <FileWarning className="h-5 w-5" />;
      case 'suspicious_network':
        return <Wifi className="h-5 w-5" />;
      case 'suspicious_process':
        return <Cpu className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  // Show loading state until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Not in Electron - show message
  if (!isElectron) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">HavenAI Desktop</h1>
          <p className="text-gray-400">
            This UI is designed to run inside the Electron app.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            Run `npm run dev:electron` from the electron directory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* App Title - Draggable region */}
        <div className="p-4 border-b border-gray-700 drag-region">
          <div className="flex items-center space-x-2 no-drag">
            <Shield className="h-8 w-8 text-cyan-400" />
            <span className="text-xl font-bold text-white">HavenAI</span>
          </div>
        </div>

        {/* Status */}
        <div className="p-4">
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            {getStatusIcon()}
            <div className={`text-lg font-semibold mt-2 ${getStatusColor()}`}>
              {agentStatus.status === 'running' ? 'Protected' : 
               agentStatus.status === 'error' ? 'Error' : 'Stopped'}
            </div>
            <button
              onClick={toggleAgent}
              className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center mx-auto ${
                agentStatus.status === 'running'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              <Power className="h-4 w-4 mr-2" />
              {agentStatus.status === 'running' ? 'Stop' : 'Start'} Protection
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 flex-1">
          <div className="text-gray-400 text-sm mb-2">Today&apos;s Summary</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Alerts</span>
              <span className="text-white font-medium">{alerts.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Critical</span>
              <span className="text-red-400 font-medium">
                {alerts.filter((a) => a.severity === 'critical').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">High</span>
              <span className="text-orange-400 font-medium">
                {alerts.filter((a) => a.severity === 'high').length}
              </span>
            </div>
          </div>
        </div>

        {/* User */}
        {user && (
          <div className="p-4 border-t border-gray-700">
            <div className="text-sm text-gray-400 truncate">{user.email}</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header - Draggable */}
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 drag-region">
          <div className="text-gray-400 text-sm no-drag">Recent Alerts</div>
          <button className="text-gray-400 hover:text-white transition no-drag">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-auto p-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mb-4" />
              <div className="text-xl font-semibold text-white mb-2">All Clear!</div>
              <div className="text-gray-400">
                No threats detected. Your system is protected.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div
                  key={alert.id || index}
                  onClick={() => setSelectedAlert(alert)}
                  className={`border rounded-lg p-4 cursor-pointer transition hover:bg-gray-800 ${getSeverityColor(
                    alert.severity
                  )}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm opacity-80 mt-1">
                          {alert.description}
                        </div>
                        <div className="text-xs opacity-60 mt-2">
                          {formatTime(alert.timestamp)} • {alert.agent}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Alert Details</h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div
                className={`inline-block px-2 py-1 rounded text-xs font-semibold uppercase mb-3 ${getSeverityColor(
                  selectedAlert.severity
                )}`}
              >
                {selectedAlert.severity}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {selectedAlert.title}
              </h3>
              <p className="text-gray-400 mb-4">{selectedAlert.description}</p>

              {selectedAlert.details && (
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Details</div>
                  <pre className="text-xs text-gray-300 overflow-auto">
                    {JSON.stringify(selectedAlert.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAlert.details?.recommendation && (
                <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/50 rounded-lg">
                  <div className="text-cyan-400 text-sm font-medium mb-1">
                    Recommendation
                  </div>
                  <div className="text-gray-300 text-sm">
                    {selectedAlert.details.recommendation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}