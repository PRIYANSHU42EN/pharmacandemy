"use client";

import React from "react";
import Link from "next/link";
import { Search, Plus, MessageSquare, Briefcase, FileText, Trash2, Smile } from "lucide-react";
import { formatDistanceToNow, isValid } from "date-fns";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "react-hot-toast";

interface ChatSidebarProps {
  rooms: any[];
  activeRoomId: string | null;
  onSelectRoom: (id: string) => void;
  onDeleteRoom?: (id: string) => void;
}

export default function ChatSidebar({ rooms, activeRoomId, onSelectRoom, onDeleteRoom }: ChatSidebarProps) {
  const { user, userProfile, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/chat/search-users?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const text = await res.text();
        // console.("Search API error:", res.status, text);
        return;
      }

      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (err) {
      // console.("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const startChat = async (targetUserId: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          participantIds: [user?.uid, targetUserId],
          metadata: {
            title: "Direct Message"
          }
        })
      });
      const room = await res.json();
      if (room.room_id) {
        onSelectRoom(room.room_id);
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (err) {
      // console.("Failed to start chat:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("CAUTION: This will delete ALL visible conversations for everyone. Proceed?")) return;
    
    try {
      const token = await user?.getIdToken();
      const deletePromises = rooms.map(room => 
        fetch(`/api/chat/rooms/${encodeURIComponent(room.room_id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(deletePromises);
      toast.success("Cleanup Complete");
      if (onDeleteRoom) {
        rooms.forEach(r => onDeleteRoom(r.room_id));
      } else {
        window.location.reload();
      }
    } catch (err) {
      // console.("Bulk cleanup failed:", err);
      toast.error("Bulk cleanup failed");
    }
  };

  return (
    <div className="w-80 flex flex-col bg-slate-50 border-r border-slate-100 h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Messages</h1>
          <div className="flex gap-2">
            {isAdmin && rooms.length > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="h-10 px-3 rounded-xl bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100 shadow-sm"
              >
                Clear All
              </button>
            )}
            <button 
              onClick={() => {
                const input = document.getElementById("chat-user-search");
                input?.focus();
              }}
              className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            id="chat-user-search"
            type="text" 
            placeholder="Search username..." 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
          />
          
          {/* Search Results Dropdown */}
          {searchQuery.length >= 3 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-64 overflow-y-auto p-2">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-slate-400">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No users found</div>
              ) : (
                searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startChat(u.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{u.display_name || u.username}</p>
                      <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Reactions Hub CTA */}
        <Link 
          href="/my-chat/reactions"
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-150 active:scale-95 shadow-sm shadow-blue-200"
        >
          <Smile size={14} className="animate-pulse" />
          <span>View Message Reactions</span>
        </Link>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {(!rooms || rooms?.length === 0) ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <MessageSquare size={32} />
            </div>
            <p className="text-slate-400 text-sm">No active conversations</p>
          </div>
        ) : (
          rooms.map((room) => {
            const isActive = activeRoomId === room.room_id;
            const Icon = room.context_type === 'urgent_work' ? Briefcase : 
                        room.context_type === 'ppt_inquiry' ? FileText : MessageSquare;
            
            return (
              <div
                key={room.room_id}
                onClick={() => onSelectRoom(room.room_id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectRoom(room.room_id);
                  }
                }}
                tabIndex={0}
                role="button"
                className={`w-full flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 group relative cursor-pointer outline-none ${
                  isActive 
                  ? "bg-white shadow-md shadow-blue-500/5 ring-1 ring-slate-100" 
                  : "hover:bg-slate-100 focus:bg-slate-100"
                }`} // Container is now a div to prevent nested button error
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full"></div>
                )}

                {/* Room Avatar */}
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                  isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-200 text-slate-500"
                }`}>
                  <Icon size={24} />
                </div>

                {/* Content */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 truncate">
                      {isAdmin 
                        ? (room.metadata?.studentName || "Student") 
                        : (room.metadata?.adminName || "Expert Support")}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                      {room.last_message_at && isValid(new Date(room.last_message_at)) 
                        ? formatDistanceToNow(new Date(room.last_message_at), { addSuffix: false })
                        : 'Just now'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate flex-1 ${Number(room.unread_count) > 0 ? "text-slate-900 font-semibold" : "text-slate-500"}`}>
                      {String(room.metadata?.lastMessageText || "New conversation...")}
                    </p>
                    {Number(room.unread_count) > 0 && (
                      <span className="h-5 min-w-[20px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {String(room.unread_count)}
                      </span>
                    )}
                  </div>
                  
                  {/* Context Badge */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      room.context_type === 'urgent_work' ? "bg-orange-50 text-orange-600" :
                      room.context_type === 'ppt_inquiry' ? "bg-blue-50 text-blue-600" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {(room.context_type || 'general').replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Individual Delete Button (Admin or Owner) */}
                {(isAdmin || room.participant_ids?.includes(user?.uid)) && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm("Delete this conversation?")) return;
                      try {
                        const token = await user?.getIdToken();
                        const res = await fetch(`/api/chat/rooms/${encodeURIComponent(room.room_id)}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (res.ok) {
                          toast.success("Chat removed");
                          if (onDeleteRoom) {
                            onDeleteRoom(room.room_id);
                          } else {
                            window.location.reload(); 
                          }
                        } else {
                          toast.error("Failed to delete");
                        }
                      } catch (err) {
                        toast.error("Error deleting chat");
                      }
                    }}
                    className="absolute right-2 top-2 h-8 w-8 rounded-lg bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-100 shadow-sm"
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
          );
        })
      )}
    </div>

      {/* User Status Bar */}
      <div className="p-6 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden">
             {/* Profile image placeholder */}
             <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {isAdmin ? (userProfile?.displayName || "Support Agent") : "Expert Support"}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
