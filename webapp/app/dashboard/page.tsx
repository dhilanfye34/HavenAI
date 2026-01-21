'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Monitor, 
  LogOut,
  RefreshCw,
  FileWarning,
  Wifi,
  Cpu,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  details: string;
  is_resolved: boolean;
  created_at: string;
}

interface Stats {
  total: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  last_24h: number;
  last_7d: number;
  unresolved: number;
}

interface Device {
  id: string;
  name: string;
  os_type: string;
  last_seen: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Check if logged in
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchData(token);
  }, []);

  const fetchData = async (token: string) => {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch alerts
      const alertsRes = await fetch(`${API_URL}/alerts?limit=10`, { headers });
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }

      // Fetch stats
      const statsRes = await fetch(`${API_URL}/alerts/stats`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch devices
      const devicesRes = await fetch(`${API_URL}/devices`, { headers });
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setDevices(devicesData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const token = localStorage.getItem('access_token');
    if (token) {
      await fetchData(token);
    }
    setRefreshing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const resolveAlert = async (alertId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      await fetch(`${API_URL}/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_resolved: true }),
      });
      handleRefresh();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getSecurityScore = () => {
    if (!stats) return 100;
    // Simple scoring: start at 100, subtract points for unresolved alerts
    const penalty = (stats.by_severity?.critical || 0) * 20 + 
                   (stats.by_severity?.high || 0) * 10 + 
                   (stats.by_severity?.medium || 0) * 5;
    return Math.max(0, 100 - penalty);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'suspicious_download': return <FileWarning className="h-5 w-5" />;
      case 'suspicious_network': return <Wifi className="h-5 w-5" />;
      case 'suspicious_process': return <Cpu className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const score = getSecurityScore();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-cyan-400" />
              <span className="text-2xl font-bold text-white">HavenAI</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">
                {user?.full_name || user?.email}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white transition"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Security Score */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Security Score</div>
            <div className={`text-4xl font-bold ${
              score >= 80 ? 'text-green-400' : 
              score >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {score}
            </div>
            <div className="text-gray-500 text-sm mt-1">
              {score >= 80 ? 'Good' : score >= 50 ? 'Fair' : 'At Risk'}
            </div>
          </div>

          {/* Total Alerts */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Total Alerts</div>
            <div className="text-4xl font-bold text-white">{stats?.total || 0}</div>
            <div className="text-gray-500 text-sm mt-1">
              {stats?.unresolved || 0} unresolved
            </div>
          </div>

          {/* Last 24h */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Last 24 Hours</div>
            <div className="text-4xl font-bold text-white">{stats?.last_24h || 0}</div>
            <div className="text-gray-500 text-sm mt-1">alerts</div>
          </div>

          {/* Devices */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-gray-400 text-sm mb-2">Devices</div>
            <div className="text-4xl font-bold text-white">{devices.length}</div>
            <div className="text-gray-500 text-sm mt-1">connected</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Alerts List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Alerts</h2>
              
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <div className="text-gray-400">No alerts yet. You&apos;re safe!</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)} ${
                        alert.is_resolved ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="mt-0.5">
                            {getAlertIcon(alert.type)}
                          </div>
                          <div>
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-sm opacity-80 mt-1">
                              {alert.description}
                            </div>
                            <div className="text-xs opacity-60 mt-2">
                              {formatDate(alert.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs uppercase font-semibold px-2 py-1 rounded">
                            {alert.severity}
                          </span>
                          {!alert.is_resolved && (
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Devices */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Your Devices</h2>
              {devices.length === 0 ? (
                <div className="text-gray-400 text-sm">
                  No devices registered yet. Download HavenAI to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div key={device.id} className="flex items-center space-x-3">
                      <Monitor className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-white text-sm">{device.name}</div>
                        <div className="text-gray-500 text-xs">
                          {device.os_type} • Last seen {formatDate(device.last_seen)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Severity Breakdown */}
            {stats && stats.total > 0 && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">By Severity</h2>
                <div className="space-y-2">
                  {['critical', 'high', 'medium', 'low'].map((sev) => (
                    <div key={sev} className="flex items-center justify-between">
                      <span className={`text-sm capitalize ${
                        sev === 'critical' ? 'text-red-400' :
                        sev === 'high' ? 'text-orange-400' :
                        sev === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {sev}
                      </span>
                      <span className="text-white">
                        {stats.by_severity?.[sev] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
