"use client";

import { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, Send, X, Bot, User, 
  Sparkles, BrainCircuit, BookOpen, 
  GraduationCap, Loader2, MinusCircle, Maximize2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIService } from "@/services/aiService";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AIStudyAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: "Hello! I'm your Pharmacy Study Assistant. How can I help you with your subjects today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
          pillar: 'study'
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-[100] flex flex-col items-end">
      {/* Floating Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1A1F3C] to-[#2D345B] text-white shadow-[0_20px_50px_rgba(26,31,60,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 border border-white/10 group relative"
        >
          <div className="absolute inset-0 rounded-full bg-candy-rose/20 animate-ping opacity-75" />
          <BrainCircuit className="w-8 h-8 relative z-10 group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-candy-rose text-[10px] font-bold rounded-full text-white shadow-sm">AI</div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={cn(
          "bg-white/80 backdrop-blur-2xl rounded-[32px] border border-white/40 shadow-[0_40px_100px_rgba(26,31,60,0.15)] flex flex-col overflow-hidden transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-10",
          isMinimized ? "h-20 w-[320px]" : "h-[600px] w-[90vw] sm:w-[420px]"
        )}>
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-[#1A1F3C] to-[#2D345B] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-candy-rose" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Cube AI Study Hub</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-medium text-white/60">Pharmacy Specialist</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Chat Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none bg-gradient-to-b from-white/50 to-transparent">
                {messages.map((msg, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                      msg.role === "user" 
                        ? "bg-[#1A1F3C] text-candy-rose border-white/10" 
                        : "bg-white text-[#1A1F3C] border-[#1A1F3C]/5"
                    )}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    
                    <div className={cn(
                      "max-w-[80%] p-4 rounded-[22px] text-[14px] leading-relaxed shadow-sm",
                      msg.role === "user" 
                        ? "bg-[#1A1F3C] text-white rounded-tr-none" 
                        : "bg-white border border-[#1A1F3C]/5 text-slate-700 rounded-tl-none"
                    )}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-white">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-3 flex-row animate-pulse">
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#1A1F3C]/5 flex items-center justify-center text-[#1A1F3C]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="px-5 py-4 rounded-[22px] bg-white border border-[#1A1F3C]/5 rounded-tl-none shadow-sm flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 bg-[#1A1F3C]/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-[#1A1F3C]/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-[#1A1F3C]/20 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white/50 backdrop-blur-md border-t border-white/40">
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Ask anything about Pharmacy..." 
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-5 pr-14 text-sm focus:ring-4 focus:ring-candy-rose/10 focus:border-candy-rose/50 outline-none transition-all shadow-sm group-hover:shadow-md"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#1A1F3C] text-candy-rose rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:scale-100 group-hover:bg-candy-rose group-hover:text-[#1A1F3C]"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 opacity-30">
                  <div className="h-px flex-1 bg-slate-900" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">
                    Proprietary Study Model
                  </span>
                  <div className="h-px flex-1 bg-slate-900" />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
