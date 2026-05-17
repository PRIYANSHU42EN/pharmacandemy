"use client";

import React, { useMemo } from "react";
import { Info, ExternalLink, Calendar, DollarSign, FileText, CheckCircle2, Sparkles, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRoomMessages } from "./RoomMessagesProvider";
import { toast } from "react-hot-toast";

interface ChatInfoPanelProps {
  room: any;
}

export default function ChatInfoPanel({ room }: ChatInfoPanelProps) {
  const { user, isAdmin } = useAuth();
  const [analyzing, setAnalyzing] = React.useState(false);
  const [aiData, setAiData] = React.useState<any>(room?.metadata?.aiData || null);
  const [price, setPrice] = React.useState("");
  
  const { messages, sendMessage } = useRoomMessages();

  // Sync state if room.metadata.aiData changes
  React.useEffect(() => {
    if (room?.metadata?.aiData) {
      setAiData(room.metadata.aiData);
    }
  }, [room?.metadata?.aiData]);

  // Sync state from real-time Ably messages
  React.useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.metadata?.type === "ai_update" && lastMessage.metadata?.aiData) {
        setAiData(lastMessage.metadata.aiData);
      }
    }
  }, [messages]);

  const handleAIAnalysis = async () => {
    if (!user) return;
    
    if (messages.length === 0) {
      toast.error("No messages to analyze yet.");
      return;
    }

    setAnalyzing(true);
    try {
      const idToken = await user.getIdToken();
      
      const serializedMessages = messages.map((m: any) => ({
        text: m.text || m.data?.text || "",
        clientId: m.clientId || "unknown",
        timestamp: m.timestamp
      }));

      const res = await fetch("/api/chat/ai-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ messages: serializedMessages, roomId: room.room_id })
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data = await res.json();
      setAiData(data);
      
      // Auto-request details if AI couldn't find them
      if (!data.requirements || data.requirements.length === 0 || !data.topic) {
        toast.error("Insufficient details found. Asking user for more info...");
        await requestRequirements();
      } else {
        toast.success("AI Analysis Complete");
        if (sendMessage) {
          await sendMessage({
            text: "Deal requirements have been analyzed and updated.",
            metadata: { type: "ai_update", aiData: data },
            headers: { senderName: "AI Negotiator" }
          });
        }
      }
    } catch (err) {
      toast.error("AI Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const requestRequirements = async () => {
    if (!sendMessage) return;
    await sendMessage({
      text: "To help us assist you better, could you please provide some details? What is your topic, deadline, and specific requirements?",
      metadata: { type: "system_info" },
      headers: { senderName: "AI Negotiator" }
    });
    toast.success("Requested details from user");
  };
  
  if (!room) return null;

  return (
    <div className="w-80 border-l border-slate-100 bg-slate-50/50 flex flex-col h-full overflow-y-auto">
      {/* Context Header */}
      <div className="p-8 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
             <Info size={18} />
          </div>
          <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Conversation Info</h4>
        </div>

        {room.context_type === 'ppt_inquiry' && (
          <div className="space-y-4">
            <div className="h-32 w-full rounded-2xl bg-slate-100 overflow-hidden relative group">
               <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
               <div className="absolute inset-0 flex items-center justify-center text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity">
                  <FileText size={40} />
               </div>
            </div>
            <div>
              <h5 className="font-bold text-slate-900 mb-1">Presentation Inquiry</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                User is interested in purchasing or negotiating for this asset.
              </p>
            </div>
            <button className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
               View Asset <ExternalLink size={14} />
            </button>
          </div>
        )}

        {room.context_type === 'urgent_work' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
               <div className="flex items-center gap-2 text-emerald-700 mb-2">
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Urgent Project</span>
               </div>
               <p className="text-sm font-bold text-slate-900">Custom Presentation Deal</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <Calendar size={16} className="text-blue-500 mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Deadline</p>
                  <p className="text-xs font-bold text-slate-900">{String(aiData?.deadline || "TBD")}</p>
               </div>
               <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <DollarSign size={16} className="text-emerald-500 mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Budget</p>
                  <p className="text-xs font-bold text-slate-900">{aiData?.budget ? `₹${String(aiData.budget)}` : "TBD"}</p>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Admin AI Trigger */}
      {isAdmin && (
        <div className="px-8 py-6 border-b border-slate-100 bg-blue-50/30 flex flex-col gap-3">
           <button 
             onClick={handleAIAnalysis}
             disabled={analyzing}
             className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50"
           >
             {analyzing ? (
               <Loader2 size={16} className="animate-spin" />
             ) : (
               <Sparkles size={16} className="text-blue-400" />
             )}
             {analyzing ? "Analyzing..." : "Run AI Analysis"}
           </button>
           <button 
             onClick={requestRequirements}
             className="w-full py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
           >
             Request Details
           </button>
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && (
        <div className="p-8">
           <h4 className="font-bold text-slate-900 text-[10px] uppercase tracking-[0.2em] mb-6">Negotiation Console</h4>
           
           <div className="space-y-4">
              <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Proposed Price</label>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input 
                      type="number" 
                      placeholder="Enter amount..." 
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-white border border-slate-100 rounded-xl py-3 pl-8 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                 </div>
              </div>
              
              <button 
                onClick={async () => {
                  if (!price || isNaN(Number(price))) return;
                  if (sendMessage) {
                    await sendMessage({
                      text: `DEAL OFFER: ₹${price}`,
                      metadata: {
                        type: "offer",
                        amount: Number(price)
                      }
                    });
                    toast.success("Offer Sent");
                    setPrice("");
                  }
                }}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95"
              >
                 Send Offer
              </button>
           </div>
        </div>
      )}

      {/* Danger Zone */}
      {isAdmin && (
        <div className="p-8 pt-0 mt-auto">
           <div className="pt-6 border-t border-slate-100">
              <button 
                onClick={async () => {
                  if (!window.confirm("ARE YOU SURE?")) return;
                  try {
                    if (!user) return;
                    const idToken = await user.getIdToken();
                    const res = await fetch(`/api/chat/rooms/${encodeURIComponent(room.room_id)}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${idToken}` }
                    });
                    if (res.ok) {
                      toast.success("Conversation Deleted");
                      window.location.href = "/my-chat";
                    }
                  } catch (err) {
                    toast.error("Error deleting conversation");
                  }
                }}
                className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2"
              >
                 <Trash2 size={14} /> Delete Conversation
              </button>
           </div>
        </div>
      )}

      {/* Requirements List (AI Extracted) */}
      <div className="p-8">
         <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <h5 className="font-bold text-sm mb-4 relative z-10">Deal Requirements</h5>
            <ul className="space-y-3 relative z-10">
               {(aiData?.requirements || [
                 "10-12 Slides",
                 "Standard Formatting",
                 "AI/ML Content",
                 "Reference List"
               ]).map((req: string, i: number) => (
                 <li key={i} className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                    <div className="h-1 w-1 rounded-full bg-blue-400" />
                    {req}
                 </li>
               ))}
            </ul>
         </div>
      </div>
    </div>
  );
}
