"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { 
  useTyping, 
  usePresenceListener, 
  useRoom, 
  useOccupancy, 
  useRoomReactions 
} from "@ably/chat/react";
import { Message } from "@ably/chat";
import { Send, Paperclip, MoreVertical, Smile, User, Check, CheckCheck, X, Sparkles, Reply, ChevronLeft } from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { useRoomMessages } from "./RoomMessagesProvider";
import { chatSupabase as supabase } from "@/lib/supabase/chat";
import MessageBubble from "./MessageBubble";

interface ChatWindowProps {
  roomData: any;
  roomId: string;
  onBack?: () => void;
}

export default function ChatWindow({ roomData, roomId, onBack }: ChatWindowProps) {
  const { user, userProfile } = useAuth();
  const isAdmin = userProfile?.role === "admin";
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Message Management
  const { 
    messages: allMessages, 
    sendMessage, 
    updateMessage,
    deleteMessage,
    sendReaction,
  } = useRoomMessages();

  // 2. Room & Occupancy
  const { connections = 0 } = useOccupancy() || {};
  const { sendRoomReaction } = useRoomReactions() || {};

  // 3. Presence & Typing
  const { currentlyTyping = new Set<string>(), keystroke } = useTyping() || {};
  const { presenceData = [] } = usePresenceListener() || {};
  
  // Convert currentlyTyping Set to array for display, filtering out self
  const typingDisplayNames = useMemo(() => {
    return Array.from(currentlyTyping).filter(id => id !== user?.uid);
  }, [currentlyTyping, user?.uid]);

  // 4. Initial Load (Mark as Read)
  useEffect(() => {
    if (roomData?.room_id && user) {
      const markAsRead = async () => {
        try {
          const token = await user.getIdToken();
          await fetch("/api/chat/unread-count", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ roomId: roomData.room_id })
          });
        } catch (err) {
          // console.("Failed to mark as read:", err);
        }
      };
      markAsRead();
    }
  }, [roomData?.room_id, user]);

  // 5. Handlers
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const msgText = text.trim();
    try {
      if (sendMessage) {
        await sendMessage({ 
          text: msgText,
          metadata: {
            parentSerial: replyTo?.serial ?? "",
          },
          headers: {
            senderName: userProfile?.displayName || user?.email?.split('@')[0] || "User"
          }
        });
      }
      setText("");
      setReplyTo(null);
    } catch (err) {
      // console.("Failed to send message:", err);
    }
  };

  const handleReact = useCallback(async (message: Message, emoji: string) => {
    try {
      if (!sendReaction) return;
      await sendReaction(message.serial, { name: emoji });
    } catch (err) {
      // console.("Reaction failed:", err);
    }
  }, [sendReaction]);

  const handleDelete = useCallback(async (message: Message) => {
    if (!deleteMessage) return;
    if (window.confirm("Delete this message?")) {
      try {
        await deleteMessage(message.serial);
      } catch (err) {
        // console.("Deletion failed:", err);
      }
    }
  }, [deleteMessage]);

  const handleAcceptOffer = useCallback(async (message: Message) => {
    try {
      if (!updateMessage || !sendMessage) return;
      await updateMessage(message.serial, {
        text: message.text,
        metadata: { ...message.metadata, status: "accepted" }
      });
      await sendMessage({
        text: "Deal Accepted! 🤝",
        metadata: { type: "system_info" },
        headers: { senderName: "SYSTEM" }
      });
    } catch (err) {
      // console.("Accept failed:", err);
    }
  }, [updateMessage, sendMessage]);

  const handleDeclineOffer = useCallback(async (message: Message) => {
    try {
      if (!updateMessage || !sendMessage) return;
      await updateMessage(message.serial, {
        text: message.text,
        metadata: { ...message.metadata, status: "declined" }
      });
      await sendMessage({
        text: "Deal Declined. ❌",
        metadata: { type: "system_info" },
        headers: { senderName: "SYSTEM" }
      });
    } catch (err) {
      // console.("Decline failed:", err);
    }
  }, [updateMessage, sendMessage]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sendMessage || !roomData?.room_id) return;

    setIsUploading(true);
    try {
      const filePath = `chat-attachments/${roomData.room_id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('resources').upload(filePath, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(filePath);

      await sendMessage({
        text: `Shared a file: ${file.name}`,
        metadata: {
          attachment: { url: publicUrl, name: file.name, type: file.type }
        }
      });
    } catch (error) {
      // console.('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Group messages into threads
  const threadedMessages = useMemo(() => {
    const rootMessages = allMessages.filter(m => !m.metadata?.parentSerial);
    const replies = allMessages.filter(m => m.metadata?.parentSerial);
    return rootMessages.map(m => ({
      ...m,
      replies: replies.filter(r => r.metadata?.parentSerial === m.serial)
    }));
  }, [allMessages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Room Header */}
      <div className="h-16 lg:h-20 border-b border-slate-100 px-4 lg:px-8 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2 lg:gap-4 overflow-hidden">
          {/* Mobile Back Button */}
          {onBack && (
            <button 
              onClick={onBack}
              className="lg:hidden p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shrink-0">
            <User size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 leading-tight mb-0.5 truncate text-sm lg:text-base">
              {isAdmin 
                ? (roomData?.metadata?.studentName || roomData?.metadata?.title || "Conversation") 
                : (roomData?.context_type === "general" ? roomData?.metadata?.title : (roomData?.metadata?.adminName || "Expert Support"))}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${presenceData.length > 1 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {presenceData.length > 1 ? 'Connected' : 'Waiting...'}
                </span>
              </div>
              {typeof connections === 'number' && connections > 0 && (
                <span className="hidden sm:inline-flex text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
                  {connections} Online
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 lg:gap-3 shrink-0">
          <button 
            onClick={() => sendRoomReaction?.({ name: "🎉" })}
            className="h-10 w-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all active:scale-90"
            title="Celebrate!"
          >
            <Sparkles size={20} />
          </button>
          <button className="h-10 w-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors">
             <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-2 scroll-smooth bg-slate-50/30"
      >
        {threadedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <p className="text-sm font-medium">No messages yet. Start the conversation!</p>
          </div>
        )}
        
        {threadedMessages.map((msg) => (
          <MessageBubble 
            key={msg.serial}
            message={msg}
            isMe={msg.clientId === user?.uid}
            onReply={setReplyTo}
            onReact={handleReact}
            onDelete={handleDelete}
            onAccept={handleAcceptOffer}
            onDecline={handleDeclineOffer}
            replies={msg.replies}
          />
        ))}

        {/* Typing Indicators */}
        {typingDisplayNames.length > 0 && (
          <div className="flex justify-start px-4">
             <div className="bg-white/80 backdrop-blur shadow-sm border border-slate-100 px-4 py-2 rounded-2xl flex items-center gap-2">
                <div className="flex gap-1">
                   <div className="h-1 w-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                   <div className="h-1 w-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                   <div className="h-1 w-1 bg-blue-400 rounded-full animate-bounce"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {typingDisplayNames[0]} is typing...
                </span>
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-8 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        {/* Reply Preview */}
        {replyTo && (
          <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <Reply size={16} className="text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-600 uppercase">Replying to {replyTo.headers?.senderName || "User"}</p>
                <p className="text-xs text-slate-600 truncate">{replyTo.text}</p>
              </div>
            </div>
            <button 
              onClick={() => setReplyTo(null)}
              className="h-6 w-6 rounded-full hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend}>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-12 w-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <Paperclip size={20} className={isUploading ? "animate-pulse" : ""} />
            </button>
            
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  keystroke?.();
                }}
                placeholder={isUploading ? "Uploading file..." : "Type your message..."}
                disabled={isUploading}
                className="w-full bg-slate-50 border-none rounded-xl py-4 px-5 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none disabled:opacity-50"
              />
            </div>

            <button 
              type="submit"
              disabled={!text.trim() || isUploading}
              className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
