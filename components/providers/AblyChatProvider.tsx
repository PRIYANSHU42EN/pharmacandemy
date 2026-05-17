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
                throw new Error(`Auth API returned ${response.status}`);
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

  if (user && loading && !chatClient && !error) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-slate-50 font-inter">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent shadow-sm"></div>
          <p className="text-slate-600 font-medium tracking-tight">Establishing secure connection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center bg-slate-50 p-6 text-center font-inter">
        <div className="mb-6 rounded-full bg-red-100 p-4 text-red-600">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Issue</h2>
        <p className="text-slate-500 max-w-md mb-8">
          {error}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          Try Again
        </button>
      </div>
    );
  }

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
