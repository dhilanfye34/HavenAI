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
          description: `${alert.description} Details: ${alert.details}`,
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
    const processTop = (details?.process?.top_processes || [])
      .slice(0, 5)
      .map((proc) => `${proc.name || 'unknown'}(${proc.pid ?? 'n/a'})`)
      .join(', ');
    const recentFile = details?.file?.recent_events?.slice(-1)?.[0];
    const recentProcess = details?.process?.recent_events?.slice(-1)?.[0];
    const recentNetwork = details?.network?.recent_events?.slice(-1)?.[0];

    const digest = JSON.stringify({
      enabled,
      auth: runtimeStatus.auth_state,
      alerts: runtimeStatus.alert_count,
      metrics: runtimeStatus.metrics,
      fileTs: recentFile?.timestamp || null,
      processTs: recentProcess?.create_time || null,
      networkTs: recentNetwork?.timestamp || null,
    });

    const now = Date.now();
    const minIntervalMs = 60000; // Inject at most once per minute to avoid flooding.
    if (digest === lastRuntimeDigestRef.current) return;
    if (now - lastRuntimeInjectAtRef.current < minIntervalMs) return;

    lastRuntimeDigestRef.current = digest;
    lastRuntimeInjectAtRef.current = now;

    const blockedLikely = Boolean(runtimeStatus.permission_hints?.maybe_blocked);
    const severity = blockedLikely ? 'warning' : 'info';
    const descriptionParts = [
      `Modules enabled: file=${enabled.file_monitoring_enabled}, process=${enabled.process_monitoring_enabled}, network=${enabled.network_monitoring_enabled}.`,
      `Runtime counts: files=${runtimeStatus.metrics?.file_events_seen ?? 0}, process_events=${runtimeStatus.metrics?.process_events_seen ?? 0}, network_events=${runtimeStatus.metrics?.network_events_seen ?? 0}, active_connections=${runtimeStatus.metrics?.network_connection_count ?? 0}.`,
      processTop ? `Top processes: ${processTop}.` : '',
      recentFile
        ? `Latest file event: ${recentFile.type || 'event'} ${recentFile.filename || recentFile.path || 'unknown file'}.`
        : '',
      recentProcess
        ? `Latest process event: ${recentProcess.name || 'unknown'} (pid ${recentProcess.pid ?? 'n/a'}).`
        : '',
      recentNetwork
        ? `Latest network event: ${recentNetwork.process_name || 'unknown'} -> ${recentNetwork.hostname || recentNetwork.remote_ip || 'unknown'}:${recentNetwork.remote_port ?? 'n/a'}.`
        : '',
    ].filter(Boolean);

    setContextEvents((current) =>
      [
        {
          source: 'Runtime Telemetry',
          severity,
          timestamp: new Date().toISOString(),
          description: descriptionParts.join(' '),
        },
        ...current,
      ].slice(0, 30),
    );
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
