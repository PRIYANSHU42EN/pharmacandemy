"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAblyChat } from "@/components/providers/AblyChatProvider";
import { ChatRoomProvider, useMessages } from "@ably/chat/react";
import { 
  Smile, 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  ExternalLink, 
  MessageSquare, 
  Briefcase, 
  FileText,
  HelpCircle,
  Inbox,
  Flame
} from "lucide-react";
import { formatDistanceToNow, isValid } from "date-fns";

// 1. Invisible Message Loader Component for Each Room
interface LoaderProps {
  roomId: string;
  roomData: any;
  onLoaded: (roomId: string, messages: any[]) => void;
}

function RoomReactionsLoader({ roomId, roomData, onLoaded }: LoaderProps) {
  const roomOptions = useMemo(() => ({
    typing: {},
    presence: { enableEvents: false },
    occupancy: { enableEvents: false },
    messages: { rawMessageReactions: true }
  }), []);

  return (
    <ChatRoomProvider name={roomId} options={roomOptions}>
      <RoomMessagesConsumer roomId={roomId} roomData={roomData} onLoaded={onLoaded} />
    </ChatRoomProvider>
  );
}

function RoomMessagesConsumer({ roomId, roomData, onLoaded }: LoaderProps) {
  const { messages, loading } = useMessages({
    listener: () => {},
  });

  useEffect(() => {
    if (!loading && messages) {
      onLoaded(roomId, messages);
    }
  }, [loading, messages, roomId, onLoaded]);

  return null;
}

// 2. Main Page Component
interface ReactedMessage {
  id: string;
  roomId: string;
  roomMetadata: any;
  contextType: string;
  senderName: string;
  text: string;
  timestamp: Date;
  reactions: Array<{ emoji: string; count: number }>;
}

export default function ReactionsHubPage() {
  const { user, loading: authLoading } = useAuth();
  const { chatClient, loading: ablyLoading } = useAblyChat();
  const router = useRouter();

  const [rooms, setRooms] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [loadedRoomsData, setLoadedRoomsData] = useState<Record<string, any[]>>({});
  const [activeFilters, setActiveFilters] = useState<string>("all");

  // Fetch all chat rooms on mount
  useEffect(() => {
    if (!user) return;

    const fetchRooms = async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/chat/rooms", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setRooms(data);
        }
      } catch (err) {
        console.error("Failed to load rooms:", err);
      } finally {
        setRoomsLoading(false);
      }
    };

    fetchRooms();
  }, [user]);

  // Callback when a room's history finishes loading
  const handleRoomMessagesLoaded = useCallback((roomId: string, messagesList: any[]) => {
    setLoadedRoomsData(prev => {
      // Avoid unnecessary state updates if data is identical
      if (prev[roomId] && prev[roomId].length === messagesList.length) {
        return prev;
      }
      return {
        ...prev,
        [roomId]: messagesList
      };
    });
  }, []);

  // Compute how many rooms are currently loading
  const pendingRoomsCount = useMemo(() => {
    if (roomsLoading) return 1;
    return rooms.filter(r => !loadedRoomsData[r.room_id]).length;
  }, [rooms, loadedRoomsData, roomsLoading]);

  // Extract and aggregate reacted messages
  const reactedMessages = useMemo(() => {
    const list: ReactedMessage[] = [];

    // Create a Map for O(1) room lookups to improve performance
    const roomsMap = new Map();
    for (const room of rooms) {
      roomsMap.set(room.room_id, room);
    }

    Object.entries(loadedRoomsData).forEach(([roomId, messages]) => {
      const roomInfo = roomsMap.get(roomId);
      if (!roomInfo) return;

      messages.forEach(msg => {
        if (!msg.reactions) return;

        const allReactions = {
          ...(msg.reactions.unique || {}),
          ...(msg.reactions.distinct || {}),
          ...(msg.reactions.multiple || {}),
        };

        const parsedReactions = Object.entries(allReactions)
          .map(([emoji, data]: [string, any]) => ({
            emoji,
            count: data.total || 0
          }))
          .filter(r => r.count > 0);

        if (parsedReactions.length > 0) {
          list.push({
            id: msg.serial || msg.id || Math.random().toString(),
            roomId,
            roomMetadata: roomInfo.metadata || {},
            contextType: roomInfo.context_type || "general",
            senderName: String(msg.headers?.senderName || "User"),
            text: msg.text || "",
            timestamp: new Date(msg.timestamp),
            reactions: parsedReactions
          });
        }
      });
    });

    // Sort newest reacted messages first
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [loadedRoomsData, rooms]);

  // Filter messages based on active filters
  const filteredMessages = useMemo(() => {
    if (activeFilters === "all") return reactedMessages;
    return reactedMessages.filter(m => m.contextType === activeFilters);
  }, [reactedMessages, activeFilters]);

  // Check if fully initialized
  const isGlobalLoading = authLoading || ablyLoading || roomsLoading;

  if (isGlobalLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-inter">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent shadow-xl"></div>
          <p className="text-slate-600 font-semibold">Initializing Reactions Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 md:px-8 font-inter">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />

      {/* Hidden loaders to fetch room messages through Ably */}
      {chatClient && rooms.map(room => (
        <RoomReactionsLoader 
          key={room.room_id} 
          roomId={room.room_id} 
          roomData={room} 
          onLoaded={handleRoomMessagesLoaded} 
        />
      ))}

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <Link 
              href="/my-chat" 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold text-sm mb-4 transition-colors group"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
              Back to Chat Rooms
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Smile size={24} className="animate-bounce" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reactions Hub</h1>
                <p className="text-slate-500 font-medium text-sm">See reacted messages and jump directly into conversations.</p>
              </div>
            </div>
          </div>

          {/* Sync indicator */}
          {pendingRoomsCount > 0 ? (
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600 text-xs font-bold shrink-0 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>Scanning chats ({pendingRoomsCount} left)...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-bold shrink-0 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Synced with Ably Live</span>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100/80">
          {[
            { id: "all", label: "All Contexts", icon: Sparkles },
            { id: "urgent_work", label: "Urgent Work", icon: Briefcase },
            { id: "ppt_inquiry", label: "PPT Inquiries", icon: FileText },
            { id: "general", label: "General Chat", icon: MessageSquare }
          ].map(filter => {
            const Icon = filter.icon;
            const isSelected = activeFilters === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilters(filter.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isSelected 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-105" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon size={14} />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Aggregate Feed Grid */}
        {filteredMessages.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xl shadow-slate-100/50">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
              {pendingRoomsCount > 0 ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              ) : (
                <Inbox size={36} />
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {pendingRoomsCount > 0 ? "Loading Message History..." : "No reactions found yet"}
            </h3>
            <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed mb-6">
              {pendingRoomsCount > 0 
                ? "Connecting with Ably servers to load messages and reactions..."
                : "Messages that receive thumbs-up, hearts, or other emojis in any chat will display here immediately."}
            </p>
            {!pendingRoomsCount && (
              <Link 
                href="/my-chat"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                Go React to Messages
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMessages.map(msg => {
              const RoomIcon = msg.contextType === 'urgent_work' ? Briefcase : 
                              msg.contextType === 'ppt_inquiry' ? FileText : MessageSquare;
              
              return (
                <div 
                  key={msg.id} 
                  className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col justify-between shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div>
                    {/* Card Header Info */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                          msg.contextType === 'urgent_work' ? "bg-orange-50 text-orange-600" :
                          msg.contextType === 'ppt_inquiry' ? "bg-blue-50 text-blue-600" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          <RoomIcon size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">
                            {msg.roomMetadata?.title || "Conversation"}
                          </p>
                          <span className={`text-[8px] font-black uppercase tracking-wider ${
                            msg.contextType === 'urgent_work' ? "text-orange-600" :
                            msg.contextType === 'ppt_inquiry' ? "text-blue-600" :
                            "text-slate-400"
                          }`}>
                            {msg.contextType.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                        <Clock size={12} />
                        <span>
                          {isValid(msg.timestamp) 
                            ? formatDistanceToNow(msg.timestamp, { addSuffix: true }) 
                            : "Just now"}
                        </span>
                      </div>
                    </div>

                    {/* Sender Details */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                        {msg.senderName.slice(0, 1)}
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {msg.senderName}
                      </span>
                    </div>

                    {/* Message Box */}
                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 mb-4">
                      <p className="text-slate-800 text-sm font-medium leading-relaxed break-words line-clamp-4 italic">
                        "{msg.text}"
                      </p>
                    </div>
                  </div>

                  {/* Actions & Reactions count */}
                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50 mt-auto">
                    {/* Reactions array pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {msg.reactions.map((r, idx) => (
                        <div 
                          key={idx} 
                          className="px-2.5 py-1 rounded-full text-xs bg-slate-100 border border-slate-200 flex items-center gap-1.5 font-bold text-slate-600 shadow-sm"
                        >
                          <span>{r.emoji}</span>
                          <span className="text-[10px]">{r.count}</span>
                        </div>
                      ))}
                    </div>

                    {/* Jump to Chat button */}
                    <button
                      onClick={() => router.push(`/my-chat?room=${msg.roomId}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-sm shrink-0"
                    >
                      <span>Jump</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
