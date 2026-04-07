import { useEffect, useMemo, useRef, useState } from 'react';

import { streamChatCompletion } from '../services/chatApi';
import {
  AgentRuntimeStatus,
  ChatConnectionStatus,
  ChatContextEvent,
  ChatMessage,
  Recommendation,
  SecurityAlert,
} from '../types';

const assistantGreeting: ChatMessage = {
  id: 'assistant-welcome',
  role: 'assistant',
  content:
    "Hi, I'm your HavenAI assistant. Ask me about your security, what's happening on your device, or what you should do next.",
  timestamp: new Date().toISOString(),
};

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([assistantGreeting]);
  const [contextEvents, setContextEvents] = useState<ChatContextEvent[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ChatConnectionStatus>('degraded');
  const messagesRef = useRef<ChatMessage[]>([assistantGreeting]);
  const contextEventsRef = useRef<ChatContextEvent[]>([]);
  const lastRuntimeDigestRef = useRef<string>('');
  const lastRuntimeInjectAtRef = useRef<number>(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    contextEventsRef.current = contextEvents;
  }, [contextEvents]);

  const injectAlertContext = (alert: SecurityAlert) => {
    setContextEvents((current) => {
      // Deduplicate by checking if the same alert source+description already exists.
      const key = `${alert.source}:${alert.description}`;
      if (current.some((e) => `${e.source}:${e.description}`.startsWith(key.slice(0, 60)))) {
        return current;
      }
      return [
        {
          source: alert.source,
          severity: alert.severity,
          timestamp: alert.timestamp,
          description: `${alert.description}${typeof alert.details === 'string' ? ` Details: ${alert.details}` : ''}`,
        },
        ...current,
      ].slice(0, 20);
    });
  };

  const injectRecommendationContext = (recommendation: Recommendation) => {
    setContextEvents((current) =>
      [
        {
          source: 'AI Recommendation',
          severity: 'info',
          timestamp: new Date().toISOString(),
          description: `${recommendation.title}. Context: ${recommendation.context}`,
        },
        ...current,
      ].slice(0, 20),
    );
  };

  const injectRuntimeContext = (runtimeStatus: AgentRuntimeStatus | null) => {
    if (!runtimeStatus) return;

    const enabled = runtimeStatus.enabled_modules;
    const details = runtimeStatus.module_details;
    const metrics = runtimeStatus.metrics;

    // ── Build a comprehensive digest for change detection ──
    const fileEvents = details?.file?.recent_events || [];
    const topProcesses = details?.process?.top_processes || [];
    const activeConnections = details?.network?.active_connections || [];
    const emailDetails = details?.email;
    const emailFindings = emailDetails?.findings || [];

    const digest = JSON.stringify({
      enabled,
      fileCount: fileEvents.length,
      fileLatest: fileEvents[fileEvents.length - 1]?.timestamp || null,
      processCount: topProcesses.length,
      connectionCount: activeConnections.length,
      emailFindings: emailFindings.length,
      alertCount: runtimeStatus.alert_count,
    });

    const now = Date.now();
    const minIntervalMs = 15000; // Update every 15s so context stays fresh
    if (digest === lastRuntimeDigestRef.current) return;
    if (now - lastRuntimeInjectAtRef.current < minIntervalMs) return;

    lastRuntimeDigestRef.current = digest;
    lastRuntimeInjectAtRef.current = now;

    // ── Build rich context with ALL available data ──
    const parts: string[] = [];

    // Overview
    parts.push(
      `Modules enabled: file=${enabled.file_monitoring_enabled}, process=${enabled.process_monitoring_enabled}, network=${enabled.network_monitoring_enabled}.`,
    );
    parts.push(
      `Counts: ${metrics?.file_events_seen ?? 0} file events, ${metrics?.process_events_seen ?? 0} process events, ${metrics?.network_connection_count ?? 0} active connections.`,
    );

    // ALL recent file events (not just the last one)
    if (fileEvents.length > 0) {
      parts.push(`\nRECENT FILE EVENTS (${fileEvents.length}):`);
      for (const ev of fileEvents.slice(-20)) {
        const name = ev.filename || ev.path?.split('/').pop() || 'unknown';
        const type = ev.type || 'change';
        const time = ev.timestamp ? new Date(ev.timestamp * 1000).toLocaleTimeString() : 'unknown time';
        parts.push(`  - ${type}: "${name}" at ${time}${ev.extension ? ` (${ev.extension})` : ''}${ev.size ? ` size=${ev.size}` : ''}`);
      }
    } else {
      parts.push('\nNo recent file events detected.');
    }

    // ALL running processes
    if (topProcesses.length > 0) {
      parts.push(`\nRUNNING PROCESSES (${topProcesses.length}):`);
      for (const proc of topProcesses.slice(0, 30)) {
        const cpu = proc.cpu_percent != null ? `${proc.cpu_percent.toFixed(1)}% CPU` : '';
        const mem = proc.memory_percent != null ? `${proc.memory_percent.toFixed(1)}% mem` : '';
        const usage = [cpu, mem].filter(Boolean).join(', ');
        parts.push(`  - ${proc.name || 'unknown'} (pid ${proc.pid ?? '?'})${usage ? ` [${usage}]` : ''}`);
      }
    }

    // ALL active network connections
    if (activeConnections.length > 0) {
      parts.push(`\nACTIVE NETWORK CONNECTIONS (${activeConnections.length}):`);
      for (const conn of activeConnections.slice(0, 30)) {
        const dest = conn.hostname || conn.remote_ip || 'unknown';
        parts.push(`  - ${conn.process_name || 'unknown'} -> ${dest}:${conn.remote_port ?? '?'} (${conn.status || 'established'})`);
      }
    }

    // Email findings
    const emailEnabled = Boolean(emailDetails?.enabled);
    if (emailEnabled) {
      const scanned = emailDetails?.total_scanned || 0;
      parts.push(`\nEMAIL: ${scanned} emails scanned.`);
      if (emailFindings.length > 0) {
        parts.push(`SUSPICIOUS EMAILS (${emailFindings.length}):`);
        for (const f of emailFindings.slice(0, 10)) {
          const subj = f.email?.subject || 'unknown subject';
          const from = f.email?.from_email || 'unknown sender';
          const risk = f.risk_score != null ? `risk=${(f.risk_score * 100).toFixed(0)}%` : '';
          const reasons = f.reasons?.join('; ') || '';
          parts.push(`  - "${subj}" from ${from} ${risk}${reasons ? ` (${reasons})` : ''}`);
        }
      } else {
        parts.push('No suspicious emails detected.');
      }
    } else {
      parts.push('\nEmail monitoring: not connected.');
    }

    const blockedLikely = Boolean(runtimeStatus.permission_hints?.maybe_blocked);

    // Replace previous runtime context (don't stack old ones)
    setContextEvents((current) => {
      const filtered = current.filter((e) => e.source !== 'Runtime Telemetry');
      return [
        {
          source: 'Runtime Telemetry',
          severity: blockedLikely ? 'warning' : 'info',
          timestamp: new Date().toISOString(),
          description: parts.join('\n'),
        },
        ...filtered,
      ].slice(0, 30);
    });
  };

  const removeContextEvent = (index: number) => {
    setContextEvents((current) => current.filter((_, i) => i !== index));
  };

  const clearContextEvents = () => {
    setContextEvents([]);
    lastRuntimeDigestRef.current = '';
  };

  const sendMessage = async (content: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setConnectionStatus('offline');
      return;
    }

    const trimmed = content.trim();
    if (!trimmed || isResponding) return;

    const userMessage: ChatMessage = {
      id: uid(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const assistantMessageId = uid();

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      },
    ]);
    setIsResponding(true);
    setConnectionStatus('degraded');

    try {
      const outboundMessages = [...messagesRef.current, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      }));
      await streamChatCompletion({
        token,
        messages: outboundMessages,
        contextEvents: contextEventsRef.current,
        onToken: (tokenChunk) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: `${message.content}${tokenChunk}` }
                : message,
            ),
          );
        },
      });
      setConnectionStatus('connected');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Connection to AI backend failed';
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content:
                  message.content ||
                  `I hit a connection issue while responding. ${errorMessage}`,
              }
            : message,
        ),
      );
      setConnectionStatus('offline');
    } finally {
      setIsResponding(false);
    }
  };

  const connectionLabel = useMemo(() => {
    if (connectionStatus === 'connected') return 'Connected';
    if (connectionStatus === 'offline') return 'Offline';
    return 'Checking';
  }, [connectionStatus]);

  return {
    messages,
    isResponding,
    connectionStatus,
    connectionLabel,
    contextEvents,
    injectAlertContext,
    injectRecommendationContext,
    injectRuntimeContext,
    removeContextEvent,
    clearContextEvents,
    sendMessage,
  };
}
