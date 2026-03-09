import { useEffect, useMemo, useRef, useState } from 'react';

import { streamChatCompletion } from '../services/chatApi';
import {
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
    "Hi, I'm your HavenAI command assistant. Ask me what changed recently, whether anything looks risky, or what to do next.",
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

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    contextEventsRef.current = contextEvents;
  }, [contextEvents]);

  const injectAlertContext = (alert: SecurityAlert) => {
    setContextEvents((current) =>
      [
        {
          source: alert.source,
          severity: alert.severity,
          timestamp: alert.timestamp,
          description: `${alert.description} Details: ${alert.details}`,
        },
        ...current,
      ].slice(0, 20),
    );
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
    sendMessage,
  };
}
