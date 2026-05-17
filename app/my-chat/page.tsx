"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAblyChat } from "@/components/providers/AblyChatProvider";
import { ChatRoomProvider } from "@ably/chat/react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatInfoPanel from "@/components/chat/ChatInfoPanel";
import { RoomMessagesProvider } from "@/components/chat/RoomMessagesProvider";
import dynamic from "next/dynamic";
import { MessageCircle, Shield, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import ChatWindow since it heavily relies on @ably/chat
const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function MyChatPage() {
  const { user, loading: authLoading } = useAuth();
  const { 
    chatClient, 
    loading: ablyLoading, 
    error: ablyError 
  } = useAblyChat();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize options to prevent room recreation on every render
  const roomOptions = React.useMemo(() => ({
    typing: {},
    presence: { enableEvents: true },
    occupancy: { enableEvents: true },
    messages: { rawMessageReactions: true }
  }), []);

  // 1. Fetch Rooms from Supabase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRooms = async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/chat/rooms", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setRooms(data);
          if (data.length > 0 && !activeRoomId) {
            const params = new URLSearchParams(window.location.search);
            const targetRoomId = params.get("room");
            const hasTargetRoom = data.some((r: any) => r.room_id === targetRoomId);
            setActiveRoomId(hasTargetRoom ? targetRoomId : data[0].room_id);
          }
        } else if (data.error) {
          setError(data.error);
        }
      } catch (err: any) {
        // console.("Failed to fetch rooms:", err);
        setError("Connection failed. Please check your internet.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [user]);

  // Combined Loading State
  const isInitializing = authLoading || ablyLoading || (loading && !error && !ablyError);

  if (isInitializing) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-slate-50 font-inter">
        <div className="flex flex-col items-center gap-6 p-8">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-400/20"></div>
            <div className="relative h-16 w-16 animate-spin rounded-full border-4 border-blue-600 border-t-transparent shadow-xl"></div>
          </div>
          <div className="space-y-1">
             <p className="text-slate-800 font-bold text-lg">Initializing Negotiation Hub</p>
             <p className="text-slate-400 text-sm font-medium">Securing your real-time connection...</p>
          </div>
        </div>
      </div>
    );
  }

  // Combined Error State
  const activeError = ablyError || error;

  if (activeError) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center bg-slate-50 p-6 text-center font-inter">
        <div className="mb-8 relative">
           <div className="absolute -inset-4 bg-red-500/10 blur-2xl rounded-full"></div>
           <div className="relative h-20 w-20 rounded-3xl bg-red-100 flex items-center justify-center text-red-600 shadow-lg">
              <AlertCircle size={40} />
           </div>
        </div>
        <h1 className="mb-2 text-2xl font-black text-slate-900 tracking-tight">Access Restricted</h1>
        <p className="mb-10 max-w-md text-slate-500 leading-relaxed font-medium">
          {activeError}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-slate-900 px-10 py-4 font-bold text-white transition-all hover:bg-slate-800 active:scale-95"
        >
          <span className="relative z-10">Reconnect Hub</span>
          <Zap size={18} className="text-blue-400 transition-transform group-hover:rotate-12" />
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center bg-slate-50 p-6 text-center font-inter">
        <div className="mb-8 relative">
           <div className="absolute -inset-4 bg-blue-500/10 blur-2xl rounded-full"></div>
           <div className="relative h-20 w-20 rounded-3xl bg-white flex items-center justify-center text-blue-600 shadow-xl border border-slate-100">
              <MessageCircle size={40} />
           </div>
        </div>
        <h1 className="mb-2 text-2xl font-black text-slate-900 tracking-tight">Unlock Direct Access</h1>
        <p className="mb-10 max-w-sm text-slate-500 leading-relaxed font-medium">
          Sign in to negotiate project details, request custom PPTs, and talk directly with our admin experts.
        </p>
        <button 
          onClick={() => window.location.href = "/login"}
          className="rounded-2xl bg-blue-600 px-10 py-4 font-bold text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95"
        >
          Sign In to Chat
        </button>
      </div>
    );
  }

  const activeRoom = rooms.find(r => r.room_id === activeRoomId);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden relative">
      {/* Sidebar - Room List */}
      <div className={cn(
        "w-full lg:w-80 flex-shrink-0 lg:block",
        activeRoomId ? "hidden lg:block" : "block"
      )}>
        <ChatSidebar 
          rooms={rooms} 
          activeRoomId={activeRoomId} 
          onSelectRoom={setActiveRoomId} 
          onDeleteRoom={(deletedId) => {
            setRooms(prev => prev.filter(r => r.room_id !== deletedId));
            if (activeRoomId === deletedId) {
              setActiveRoomId(null);
            }
          }}
        />
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden relative border-x border-slate-100 bg-white",
        activeRoomId ? "block" : "hidden lg:flex"
      )}>
        {activeRoomId ? (
          <ChatRoomProvider 
            name={activeRoomId}
            options={roomOptions}
          >
            <RoomMessagesProvider>
              <div className="flex h-full flex-1 overflow-hidden">
                <ChatWindow 
                  roomId={activeRoomId} 
                  roomData={activeRoom} 
                  onBack={() => setActiveRoomId(null)}
                />
                
                {/* Info Panel - Contextual Details - Desktop Only */}
                <div className="hidden xl:block">
                  <ChatInfoPanel room={activeRoom} />
                </div>
              </div>
            </RoomMessagesProvider>
          </ChatRoomProvider>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 lg:p-12 text-center bg-slate-50/30">
             <div className="mb-6 lg:mb-8 relative">
                <div className="absolute -inset-4 bg-blue-500/10 blur-2xl rounded-full"></div>
                <div className="relative h-20 w-20 lg:h-24 lg:w-24 rounded-[1.5rem] lg:rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-xl">
                   <Zap size={32} className="text-white animate-pulse lg:hidden" />
                   <Zap size={40} className="text-white animate-pulse hidden lg:block" />
                </div>
             </div>
             <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3 lg:mb-4">Your Negotiation Hub</h2>
             <p className="text-slate-500 max-w-md text-base lg:text-lg px-4">
                Select a conversation from the sidebar to start discussing your project or PPT inquiry directly with our team.
             </p>
             <div className="mt-8 lg:mt-12 flex gap-4 lg:gap-6">
                <div className="flex flex-col items-center gap-2">
                   <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Shield size={20} className="lg:hidden" />
                      <Shield size={24} className="hidden lg:block" />
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secure Deals</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl lg:rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <MessageCircle size={20} className="lg:hidden" />
                      <MessageCircle size={24} className="hidden lg:block" />
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Real-time Chat</span>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
