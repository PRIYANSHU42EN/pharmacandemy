"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Send, Bot, User, Sparkles, Clock, 
  CheckCircle2, AlertCircle, FileText, 
  MessageSquare, History, BrainCircuit,
  Info, Trash2, Loader2
} from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";
import { AIService } from "@/services/aiService";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function UrgentHelpChat() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount (for anonymous or resuming)
  useEffect(() => {
    const saved = localStorage.getItem("cubepharm_urgent_chat");
    const savedTicket = localStorage.getItem("cubepharm_current_ticket");
    
    if (savedTicket) setCurrentTicketId(savedTicket);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const withDates = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(withDates);
      } catch (e) {
        // console.("Failed to load chat history", e);
      }
    } else {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: "Hello! I'm your CubePharma AI Academic Assistant. I'm here to help you with any urgent presentations, assignments, or study reports you need. \n\nWhat are you working on today?",
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("cubepharm_urgent_chat", JSON.stringify(messages));
    }
    if (currentTicketId) {
      localStorage.setItem("cubepharm_current_ticket", currentTicketId);
    }
  }, [messages, currentTicketId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const syncMessageToDB = async (content: string, isAi: boolean, ticketId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/urgent-work/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ticketId, message: content, isAi })
      });
    } catch (e) {
      // console.("Failed to sync message to DB", e);
    }
  };

  const createTicketInDB = async (ticketData: any) => {
    if (!user) return null;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/urgent-work/tickets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          topic: ticketData.topic,
          subject: ticketData.subject,
          requirements: typeof ticketData.requirements === 'string' 
            ? ticketData.requirements 
            : JSON.stringify(ticketData.requirements),
          urgencyLevel: ticketData.urgencyLevel,
          budgetExpectation: ticketData.budget,
          deadline: ticketData.deadline || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Ticket created! Connecting you with an expert...");
        return data.id;
      } else {
        const err = await res.json();
        // console.("Ticket creation error:", err);
        toast.error("Failed to create ticket");
      }
    } catch (e) {
      // console.("Failed to create ticket in DB", e);
      toast.error("Network error creating ticket");
    }
    return null;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Sync user message if ticket exists
    if (currentTicketId && user) {
      syncMessageToDB(input, false, currentTicketId);
    }

    try {
      const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
      chatHistory.push({ role: "user", content: input });

      const response = await AIService.generateChatResponse(chatHistory, 'negotiator');
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);

      // Check if ticket data was generated
      const rawTicketData = AIService.parseTicketData(response);
      if (rawTicketData && user && !currentTicketId) {
        // Robust field mapping
        const ticketData = {
          ...rawTicketData,
          budget: (rawTicketData as any).budget || (rawTicketData as any).budgetExpectation
        };

        const newId = await createTicketInDB(ticketData);
        if (newId) {
          setCurrentTicketId(newId);
          // Sync current message to this new ticket
          syncMessageToDB(response, true, newId);
        }
      } else if (currentTicketId && user) {
        syncMessageToDB(response, true, currentTicketId);
      }

    } catch (error: any) {
      // console.("AI Error:", error);
      toast.error(error.message || "AI is temporarily unavailable. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear your chat history?")) {
      localStorage.removeItem("cubepharm_urgent_chat");
      localStorage.removeItem("cubepharm_current_ticket");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-navy relative flex flex-col items-center justify-center p-4 md:p-10 overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-candy-rose/5 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-candy-lavender/5 blur-[160px] rounded-full" />
      </div>

      <div className="container-main relative z-10 w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_32px_120px_rgba(0,0,0,0.5)] rounded-[40px] overflow-hidden border border-white/5">
        {/* Chat Header */}
        <div className="bg-white/5 backdrop-blur-3xl border-b border-white/10 p-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-candy-rose to-candy-lavender flex items-center justify-center shadow-2xl shadow-candy-rose/20">
              <BrainCircuit className="w-7 h-7 text-navy" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl tracking-tight">Academic Deal Room</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-slate font-bold uppercase tracking-[0.2em]">AI Negotiator Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {currentTicketId && (
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3" />
                Ticket: {currentTicketId.slice(0, 8)}
              </div>
            )}
            <button 
              onClick={async () => {
                if (!user) {
                  window.location.href = "/login";
                  return;
                }
                setIsLinking(true);
                try {
                  const token = await user.getIdToken();
                  const res = await fetch("/api/chat/rooms", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      contextType: "urgent_work",
                      contextId: currentTicketId,
                      metadata: {
                        title: "Urgent Project Negotiation",
                        ticketId: currentTicketId
                      }
                    })
                  });
                  if (res.ok) {
                    const room = await res.json();
                    window.location.href = `/my-chat?roomId=${room.room_id}`;
                  } else {
                    toast.error("Failed to initiate chat");
                  }
                } catch (err) {
                  toast.error("Connection error");
                } finally {
                  setIsLinking(false);
                }
              }}
              disabled={isLinking}
              className="px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
              {isLinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
              {isLinking ? "Connecting..." : "Talk to Admin"}
            </button>
            <button 
              onClick={handleClearChat}
              className="p-3 rounded-2xl bg-white/5 text-slate hover:text-rose-400 transition-all hover:bg-rose-400/10"
              title="Reset Session"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div 
          ref={scrollRef}
          className="flex-1 bg-navy/40 backdrop-blur-md p-6 md:p-10 overflow-y-auto space-y-10 scroll-smooth"
        >
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex gap-5 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center shadow-lg",
                msg.role === "user" ? "bg-candy-rose text-navy" : "bg-white/10 text-candy-rose border border-white/10"
              )}>
                {msg.role === "user" ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
              </div>
              
              <div className={cn(
                "p-5 md:p-6 rounded-[28px] text-[15px] leading-relaxed shadow-2xl",
                msg.role === "user" 
                  ? "bg-candy-rose text-navy font-semibold rounded-tr-none" 
                  : "bg-white/5 text-white/90 border border-white/10 backdrop-blur-sm rounded-tl-none"
              )}>
                <p className="whitespace-pre-wrap">{msg.content.replace(/<TICKET_DATA>[\s\S]*?<\/TICKET_DATA>/, "").trim()}</p>
                <span className={cn(
                  "text-[10px] block mt-4 font-bold opacity-40 uppercase tracking-widest",
                  msg.role === "user" ? "text-navy" : "text-slate"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-5 mr-auto">
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-candy-rose border border-white/10 flex items-center justify-center">
                <Bot className="w-6 h-6 animate-pulse" />
              </div>
              <div className="p-6 rounded-[28px] rounded-tl-none bg-white/5 border border-white/10 flex items-center gap-2 shadow-2xl">
                <div className="w-2 h-2 bg-candy-rose rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-candy-rose rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-candy-rose rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="bg-white/5 backdrop-blur-3xl border-t border-white/10 p-8">
          {!user && !authLoading ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
               <p className="text-amber-200 text-xs font-medium">Please log in to save your request and get expert help.</p>
               <a href="/login" className="text-amber-400 text-xs font-bold underline">Login Now →</a>
            </div>
          ) : (
            <div className="relative group">
              <input
                type="text"
                placeholder="Describe your work, deadline, and subject..."
                className="w-full bg-navy/60 border border-white/10 rounded-[24px] py-6 pl-8 pr-20 text-white placeholder:text-slate/60 focus:outline-none focus:ring-2 focus:ring-candy-rose/30 transition-all text-base shadow-inner"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim()}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-candy-rose rounded-2xl flex items-center justify-center text-navy shadow-xl shadow-candy-rose/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          )}
          
          <div className="mt-6 flex items-center justify-center gap-10">
            <div className="flex items-center gap-2 text-[10px] text-slate/60 font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5 text-candy-rose" />
              High-Speed Delivery
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate/60 font-bold uppercase tracking-[0.2em]">
              <CheckCircle2 className="w-3.5 h-3.5 text-candy-rose" />
              Verified Experts
            </div>
          </div>
        </div>
      </div>

      {/* Floating Badge */}
      <div className="absolute bottom-10 left-10 hidden xl:block">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[32px] flex items-center gap-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-candy-rose/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-candy-rose" />
          </div>
          <div>
            <p className="text-white font-bold text-xs">Typical Turnaround</p>
            <p className="text-candy-rose text-[10px] font-bold uppercase tracking-widest mt-0.5">Under 12 Hours</p>
          </div>
        </div>
      </div>
    </div>
  );
}
