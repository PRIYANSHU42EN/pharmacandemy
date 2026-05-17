"use client";

import React from "react";
import { Message } from "@ably/chat";
import { format, isValid } from "date-fns";
import { Paperclip, Reply, Smile, MoreHorizontal, User, Check, CheckCheck, DollarSign, Trash2 } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReply?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onDelete?: (message: Message) => void;
  onAccept?: (message: Message) => void;
  onDecline?: (message: Message) => void;
  replies?: Message[];
}

export default function MessageBubble({ 
  message, 
  isMe, 
  onReply, 
  onReact,
  onDelete,
  onAccept,
  onDecline,
  replies = []
}: MessageBubbleProps) {
  const createdAt = new Date(message.timestamp);
  const timeStr = isValid(createdAt) ? format(createdAt, 'HH:mm') : '';

  return (
    <div className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-4 px-4`}>
      {/* Sender Name (if not me) */}
      {!isMe && (
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1">
          {message.clientId === "SYSTEM" ? "System" : (String(message.headers?.senderName || "User"))}
        </span>
      )}

      <div className={`relative flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Main Bubble */}
        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm transition-all duration-300 ${
          isMe 
            ? "bg-blue-600 text-white rounded-tr-none" 
            : "bg-white text-slate-900 rounded-tl-none border border-slate-100"
        }`}>
          {/* Thread Parent Indicator (if this is a reply) */}
          {message.metadata?.parentSerial && (
            <div className={`mb-2 p-2 rounded-lg text-[10px] border flex items-center gap-2 ${
              isMe ? "bg-white/10 border-white/20 text-white/80" : "bg-slate-50 border-slate-100 text-slate-500"
            }`}>
              <Reply size={12} className="shrink-0" />
              <span className="truncate italic">Replying to a message...</span>
            </div>
          )}

          {/* Message Text */}
          {message.metadata?.type === "offer" ? (
            <div className="flex flex-col gap-3 min-w-[200px]">
               <div className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${
                 isMe ? "bg-white/10 border-white/20" : "bg-blue-50 border-blue-100"
               }`}>
                  <DollarSign size={32} className={isMe ? "text-white" : "text-blue-600"} />
                  <p className={`text-2xl font-black ${isMe ? "text-white" : "text-slate-900"}`}>
                    ₹{String((message.metadata as any)?.amount || "0")}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${isMe ? "text-white/70" : "text-blue-600/70"}`}>
                    Proposed Price
                  </p>
               </div>
               <p className="text-sm font-medium opacity-90 italic text-center">
                 {isMe ? "You sent a deal offer" : "Admin sent a deal offer"}
                 {message.metadata?.status === "accepted" && " (Accepted ✅)"}
                 {message.metadata?.status === "declined" && " (Declined ❌)"}
               </p>
               {!isMe && !message.metadata?.status && (
                 <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => onAccept?.(message)}
                      className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-bold uppercase hover:bg-blue-700 transition-all">
                      Accept
                    </button>
                    <button 
                      onClick={() => onDecline?.(message)}
                      className="flex-1 py-2 rounded-lg bg-white text-slate-900 border border-slate-200 text-[10px] font-bold uppercase hover:bg-slate-50 transition-all">
                      Decline
                    </button>
                 </div>
               )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed break-words">{message.text}</p>
          )}

          {/* Attachment */}
          {message.metadata?.attachment && (
            <div className={`mt-3 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
              isMe ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
            }`}>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                isMe ? "bg-white/20" : "bg-white shadow-sm"
              }`}>
                <Paperclip size={18} className={isMe ? "text-white" : "text-blue-600"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${isMe ? "text-white" : "text-slate-900"}`}>
                  {String((message.metadata as any)?.attachment?.name || "File")}
                </p>
                <a 
                  href={String((message.metadata as any)?.attachment?.url || "#")} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`text-[10px] font-bold uppercase tracking-wider ${isMe ? "text-white/70 hover:text-white" : "text-blue-600 hover:text-blue-700"}`}
                >
                  Download
                </a>
              </div>
            </div>
          )}

          {/* Bottom Info Bar */}
          <div className={`flex items-center gap-2 mt-2 justify-end ${isMe ? "text-white/60" : "text-slate-400"}`}>
            <span className="text-[10px] font-medium">
              {timeStr}
            </span>
            {isMe && (
              <div className="flex items-center">
                <CheckCheck size={12} className="text-blue-200" />
              </div>
            )}
          </div>

          {/* Reactions Display */}
          {message.reactions && (
            (() => {
              const allReactions = {
                ...(message.reactions.unique || {}),
                ...(message.reactions.distinct || {}),
                ...(message.reactions.multiple || {}),
              };
              if (Object.keys(allReactions).length === 0) return null;

              return (
                <div className={`flex flex-wrap gap-1 mt-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {Object.entries(allReactions).map(([emoji, data]) => (
                    <div 
                      key={emoji}
                      className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 border ${
                        isMe ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="font-bold">{(data as any).total}</span>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        {/* Message Actions (Visible on Hover) */}
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ${
          isMe ? 'flex-row-reverse' : 'flex-row'
        }`}>
          <div className={`flex items-center gap-1 bg-white shadow-lg border border-slate-100 rounded-full p-1 ${
            isMe ? 'flex-row-reverse' : 'flex-row'
          }`}>
            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
              <button 
                key={emoji}
                onClick={() => onReact?.(message, emoji)}
                className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-50 text-sm transition-all hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
          <button 
            onClick={() => onReply?.(message)}
            className="h-8 w-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-all"
            title="Reply"
          >
            <Reply size={16} />
          </button>
          <button 
            onClick={() => onDelete?.(message)}
            className="h-8 w-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title="Delete Message"
          >
            <Trash2 size={16} />
          </button>
          <button 
            className="h-8 w-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-all"
            title="More Options"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Inline Replies List (if any) */}
      {replies.length > 0 && (
        <div className={`mt-2 ml-10 pl-4 border-l-2 border-slate-100 space-y-2 w-full max-w-[70%]`}>
           {replies.map((reply) => (
             <div key={reply.serial} className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                  {reply.clientId === message.clientId ? "Self Reply" : "Reply"}
                </span>
                <div className="bg-slate-50/50 p-3 rounded-xl text-xs text-slate-700 italic border border-slate-50">
                  {reply.text}
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
