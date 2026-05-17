"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import * as Ably from "ably";
import { ChatClient, LogLevel } from "@ably/chat";
import { ChatClientProvider } from "@ably/chat/react";
import { AblyProvider } from "ably/react";
import { useAuth } from "./AuthProvider";

interface ChatContextType {
  chatClient: ChatClient | null;
  loading: boolean;
  error: string | null;
}

const ChatContext = createContext<ChatContextType>({
  chatClient: null,
  loading: true,
  error: null,
});

export const useAblyChat = () => useContext(ChatContext);

export default function AblyChatProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [realtimeClient, setRealtimeClient] = useState<Ably.Realtime | null>(null);
  const [chatClient, setChatClient] = useState<ChatClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRealtimeClient(null);
      setChatClient(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    let rt: Ably.Realtime | null = null;
    let chat: ChatClient | null = null;

    const initAbly = async () => {
      try {
        setLoading(true);
        setError(null);
        // 1. Initialize Ably Realtime
        rt = new Ably.Realtime({
          authCallback: async (tokenParams, callback) => {
            try {
              const freshIdToken = await user.getIdToken(true);
              const response = await fetch("/api/chat/auth", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${freshIdToken}` 
                }
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Auth API returned ${response.status}`);
              }

              const tokenData = await response.json();
              callback(null, tokenData);
            } catch (err: any) {
              callback(err, null);
            }
          },
          clientId: user.uid,
          httpRequestTimeout: 15000,
          autoConnect: true,
        });

        // 2. Initialize Chat Client with Realtime instance
        chat = new ChatClient(rt, {
          logLevel: LogLevel.Silent,
        });

        // 3. Wait for connection
        await new Promise<void>((resolve, reject) => {
          if (!rt) return reject(new Error("Realtime not initialized"));

          const onConnected = () => {
            rt?.connection.off("connected", onConnected);
            resolve();
          };

          const onFailed = (err: any) => {
            rt?.connection.off("failed", onFailed);
            reject(new Error(err.reason?.message || "Connection failed"));
          };

          rt.connection.once("connected", onConnected);
          rt.connection.once("failed", onFailed);

          setTimeout(() => {
            if (isMounted && rt?.connection.state !== "connected") {
              rt?.connection.off("connected", onConnected);
              rt?.connection.off("failed", onFailed);
              reject(new Error("Real-time connection timeout (30s)"));
            }
          }, 30000);
        });

        if (isMounted) {
          setRealtimeClient(rt);
          setChatClient(chat);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to initialize real-time chat");
          setLoading(false);
        }
      }
    };

    initAbly();

    return () => {
      isMounted = false;
      if (rt) {
        rt.close();
      }
    };
  }, [user, authLoading]);

  const value = useMemo(() => ({ chatClient, loading, error }), [chatClient, loading, error]);



  return (
    <ChatContext.Provider value={value}>
      {chatClient && realtimeClient ? (
        <AblyProvider client={realtimeClient}>
          <ChatClientProvider client={chatClient}>
            {children}
          </ChatClientProvider>
        </AblyProvider>
      ) : (
        children
      )}
    </ChatContext.Provider>
  );
}
