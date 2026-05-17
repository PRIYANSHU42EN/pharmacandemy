"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useMessages } from "@ably/chat/react";
import { Message, ChatMessageEventType, ChatMessageEvent } from "@ably/chat";

interface RoomMessagesContextType {
  messages: Message[];
  sendMessage: any;
  updateMessage: any;
  deleteMessage: any;
  sendReaction: any;
  loading: boolean;
  history: any;
}

const RoomMessagesContext = createContext<RoomMessagesContextType | null>(null);

export function RoomMessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const updateLocalMessages = useCallback((message: Message) => {
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.serial === message.serial);
      let updated = [...prev];
      if (index === -1) {
        updated.push(message);
      } else {
        // Ably Message objects have a with() method to merge updates/deletions
        // @ts-ignore - some versions might have slightly different signatures but .with is the standard pattern
        updated[index] = updated[index].with(message);
      }
      return updated.sort((a, b) => a.serial.localeCompare(b.serial));
    });
  }, []);

  const { 
    sendMessage, 
    updateMessage, 
    deleteMessage, 
    sendReaction, 
    history, 
    historyBeforeSubscribe 
  } = useMessages({
    listener: (event: ChatMessageEvent) => {
      switch (event.type) {
        case ChatMessageEventType.Created:
        case ChatMessageEventType.Updated:
        case ChatMessageEventType.Deleted:
          updateLocalMessages(event.message);
          break;
      }
    },
    // @ts-ignore
    onReaction: (event: any) => {
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.serial === event.messageSerial);
        if (index === -1) return prev;
        const updated = [...prev];
        // Apply reaction summary event to the message
        updated[index] = updated[index].with(event);
        return updated;
      });
    }
  });

  useEffect(() => {
    let isMounted = true;
    
    const loadHistory = async () => {
      if (!historyBeforeSubscribe) return;
      try {
        const result = await historyBeforeSubscribe({ limit: 100 });
        if (isMounted) {
          // history results are usually returned newest first, but we want oldest first for chat flow
          setMessages([...result.items].reverse());
          setLoading(false);
        }
      } catch (err) {
        // console.("[RoomMessagesProvider] Failed to load history:", err);
        if (isMounted) setLoading(false);
      }
    };

    loadHistory();
    return () => { isMounted = false; };
  }, [historyBeforeSubscribe]);

  return (
    <RoomMessagesContext.Provider value={{ 
      messages, 
      sendMessage, 
      updateMessage, 
      deleteMessage, 
      sendReaction, 
      loading,
      history
    }}>
      {children}
    </RoomMessagesContext.Provider>
  );
}

export const useRoomMessages = () => {
  const context = useContext(RoomMessagesContext);
  if (!context) {
    throw new Error("useRoomMessages must be used within RoomMessagesProvider");
  }
  return context;
};
