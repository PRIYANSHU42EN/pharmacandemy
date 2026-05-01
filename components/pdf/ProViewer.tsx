"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Toolbar from "./Toolbar";
import PageRenderer from "./PageRenderer";
import SkeletonPulse from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { useAuth } from "@/components/providers/AuthProvider";

interface ProViewerProps {
  url: string;
  title: string;
  resourceId?: string;
  isPremiumResource?: boolean;
}

export default function ProViewer({ url, title, resourceId, isPremiumResource = false }: ProViewerProps) {
  const { user } = useAuth();
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [isResuming, setIsResuming] = useState(false);
  
  // Learning Features State
  const [notes, setNotes] = useState<any[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load PDF.js and initialize document
  useEffect(() => {
    const initPdf = async () => {
      if (!url) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const PDF_VERSION = "3.11.174";
        
        // 1. Load PDF.js Script if not present
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/build/pdf.js`;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load PDF engine."));
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/build/pdf.worker.min.js`;

        // 2. Fetch PDF as arraybuffer with Retry Logic
        let response: Response | null = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          try {
            console.log(`[ProViewer] Fetching PDF (Attempt ${attempts + 1}/${maxAttempts})...`);
            response = await fetch(url);
            if (response.ok) break;
            
            if (response.status === 403) throw new Error("Access denied (Premium required).");
            if (response.status === 404) throw new Error("PDF file not found.");
          } catch (err: any) {
            if (attempts === maxAttempts - 1) throw err;
            console.warn(`[ProViewer] Fetch retry ${attempts + 1}:`, err.message);
          }
          attempts++;
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempts)));
        }

        if (!response || !response.ok) {
          throw new Error(`Connection failed (${response?.status || 'Network Error'})`);
        }
        
        // Allow octet-stream for legacy GDrive links proxied via server
        const contentType = response.headers.get("content-type") || "";
        if (contentType && !contentType.includes("pdf") && !contentType.includes("octet-stream") && !url.includes(".pdf")) {
          throw new Error("Invalid file format. The server did not return a PDF.");
        }

        const data = await response.arrayBuffer();

        // 3. Load the document
        const loadingTask = pdfjsLib.getDocument({
          data,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${PDF_VERSION}/standard_fonts/`,
        });

        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        
        const pagePromises = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          pagePromises.push(pdfDoc.getPage(i));
        }
        const loadedPages = await Promise.all(pagePromises);
        setPages(loadedPages);
        setLoading(false);

        // Resume reading & Load Notes
        if (resourceId) {
          const lastPage = localStorage.getItem(`pdf_pos_${resourceId}`);
          if (lastPage) {
            const pageNum = parseInt(lastPage);
            if (pageNum > 1 && pageNum <= pdfDoc.numPages) {
              setIsResuming(true);
              setTimeout(() => {
                handleJumpToPage(pageNum);
                setTimeout(() => setIsResuming(false), 1000);
              }, 600);
            }
          }
          
          const storedNotes = localStorage.getItem(`pdf_notes_${resourceId}`);
          if (storedNotes) setNotes(JSON.parse(storedNotes));
        }

      } catch (err: any) {
        console.error("[ProViewer] Critical Error:", err);
        setError(err.message || "Failed to load document.");
        setLoading(false);
      }
    };

    initPdf();
    return () => { if (pdf) { pdf.destroy().catch(() => {}); } };
  }, [url, resourceId]);

  // Track scroll position, update page, save progress, and track analytics
  useEffect(() => {
    if (pages.length === 0 || !containerRef.current) return;

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.getAttribute("data-page-num") || "1");
          if (pageNum !== currentPage) {
            setCurrentPage(pageNum);
            if (resourceId) {
              localStorage.setItem(`pdf_pos_${resourceId}`, pageNum.toString());
              
              // Analytics: Track page view
              import("@/lib/analytics").then(({ analytics }) => {
                analytics.track({
                  eventType: "pdf_page_view",
                  resourceId,
                  metadata: { page: pageNum, title }
                });
              });
            }
          }
        }
      });
    }, { root: containerRef.current, threshold: 0.4 });

    document.querySelectorAll(".pdf-page-wrapper").forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [pages, resourceId, currentPage, title]);

  // Session Time Tracking
  useEffect(() => {
    const timer = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => {
      clearInterval(timer);
      if (resourceId && sessionTime > 5) {
        import("@/lib/analytics").then(({ analytics }) => {
          analytics.track({
            eventType: "pdf_session_end",
            resourceId,
            metadata: { duration: sessionTime, totalPages: numPages }
          });
        });
      }
    };
  }, [resourceId, sessionTime, numPages]);

  // Handle Text Selection for Highlights/Notes
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text && text.length > 3) {
      const confirmed = window.confirm(`Add note for: "${text.substring(0, 50)}..."?`);
      if (confirmed && resourceId) {
        const newNote = {
          id: Date.now(),
          text,
          page: currentPage,
          createdAt: new Date().toISOString()
        };
        const updatedNotes = [...notes, newNote];
        setNotes(updatedNotes);
        localStorage.setItem(`pdf_notes_${resourceId}`, JSON.stringify(updatedNotes));
        setShowNotes(true);
      }
      selection?.removeAllRanges();
    }
  }, [currentPage, notes, resourceId]);

  const deleteNote = (id: number) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    if (resourceId) localStorage.setItem(`pdf_notes_${resourceId}`, JSON.stringify(updatedNotes));
  };

  const handleJumpToPage = useCallback((num: number) => {
    if (num < 1 || num > numPages) return;
    const element = document.getElementById(`page-wrap-${num}`);
    if (element && containerRef.current) {
      const offset = element.offsetTop - 80;
      containerRef.current.scrollTo({ top: offset, behavior: isResuming ? "auto" : "smooth" });
    }
  }, [numPages, isResuming]);

  const canViewPage = useCallback((index: number) => {
    if (!isPremiumResource || user?.is_premium) return true;
    return index < 3;
  }, [user?.is_premium, isPremiumResource]);

  if (loading) return (
    <div className="flex flex-col h-[85vh] bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-2xl p-8">
      <SkeletonPulse className="h-12 w-full rounded-xl mb-8" />
      <SkeletonPulse className="flex-1 w-full rounded-xl" />
    </div>
  );

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="pdf-container flex flex-row h-[92vh] bg-[#323639] rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative select-none animate-in fade-in zoom-in-95 duration-700" onMouseUp={handleSelection} onContextMenu={(e) => e.preventDefault()}>
      <div className="flex flex-col flex-1 relative overflow-hidden bg-[#525659]">
        {/* Visual Progress Bar */}
        <div className="absolute top-0 left-0 h-[3px] bg-candy-rose z-[60] transition-all duration-300 shadow-[0_0_10px_rgba(247,197,216,0.5)]" style={{ width: `${(currentPage / numPages) * 100}%` }} />
        
        <Toolbar 
          pageNum={currentPage}
          numPages={numPages}
          scale={scale}
          onPrevPage={() => handleJumpToPage(currentPage - 1)}
          onNextPage={() => handleJumpToPage(currentPage + 1)}
          onZoomIn={() => setScale(s => Math.min(s + 0.2, 4))}
          onZoomOut={() => setScale(s => Math.max(s - 0.2, 0.4))}
          onResetZoom={() => setScale(1.1)}
          onJumpToPage={handleJumpToPage}
          title={title}
        />

        <div 
          ref={containerRef} 
          className="flex-1 overflow-auto p-4 sm:p-10 scroll-smooth custom-scrollbar relative"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            {pages.map((page, idx) => {
              const pageNum = idx + 1;
              const allowed = canViewPage(idx);
              return (
                <div key={idx} id={`page-wrap-${pageNum}`} data-page-num={pageNum} className="pdf-page-wrapper relative">
                  {allowed ? (
                    <PageRenderer page={page} scale={scale} pageNum={pageNum} isVisible={Math.abs(currentPage - pageNum) <= 3} />
                  ) : (
                    <div className="mb-10 bg-white/10 backdrop-blur-3xl border border-white/20 flex flex-col items-center justify-center p-12 text-center rounded-3xl shadow-2xl relative overflow-hidden" style={{ width: `${600 * scale}px`, height: `${840 * scale}px`, maxWidth: '90vw' }}>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                      <div className="w-24 h-24 bg-candy-rose/30 rounded-full flex items-center justify-center mx-auto mb-8 text-candy-rose animate-pulse shadow-[0_0_40px_rgba(247,197,216,0.3)]">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      </div>
                      <h4 className="text-[28px] font-bold text-white mb-4 tracking-tight">Premium Study Resource</h4>
                      <p className="text-white/70 text-[15px] mb-10 max-w-sm leading-relaxed">Upgrade to PharmaCademy Premium to unlock full access to this document and join 10k+ successful students.</p>
                      <button className="bg-candy-rose text-navy px-10 py-4 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(247,197,216,0.4)] text-[16px]">
                        GET PREMIUM ACCESS
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Learning Sidebar (Notes/Highlights) */}
      <div className={`w-85 bg-[#F9F8F7] border-l border-gray-200 flex flex-col transition-all duration-500 ease-in-out shadow-[-20px_0_40px_rgba(0,0,0,0.05)] z-50 ${showNotes ? 'mr-0' : '-mr-85'}`}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white/80 backdrop-blur-md">
          <div>
            <h3 className="text-[16px] font-bold text-navy flex items-center gap-2">
              <span className="p-1.5 bg-navy/5 rounded-lg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></span>
              My Study Notes
            </h3>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mt-1">{notes.length} Active Snippets</p>
          </div>
          <button onClick={() => setShowNotes(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        
        <div className="flex-1 overflow-auto p-5 space-y-5 custom-scrollbar">
          {notes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6 text-gray-300 rotate-12 animate-float"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg></div>
              <p className="text-[13px] font-bold text-navy/40 leading-relaxed">Select text in the document to automatically capture study notes here.</p>
            </div>
          ) : (
            notes.map(note => (
              <div key={note.id} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm group hover:border-candy-rose/40 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-navy/10 group-hover:bg-candy-rose transition-colors" />
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold text-white bg-navy px-2.5 py-1 rounded-lg">PAGE {note.page}</span>
                  <button onClick={() => deleteNote(note.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
                </div>
                <p className="text-[13px] text-gray-700 leading-relaxed font-medium">"{note.text}"</p>
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-mono">{new Date(note.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => handleJumpToPage(note.page)} className="text-[11px] font-extrabold text-navy hover:text-candy-rose transition-colors flex items-center gap-1">GO TO SOURCE <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {!showNotes && (
        <button onClick={() => setShowNotes(true)} className="absolute right-8 bottom-8 w-16 h-16 bg-navy text-white rounded-2xl shadow-[0_20px_50px_rgba(26,31,60,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[70] group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          {notes.length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-candy-rose text-navy text-[10px] font-black rounded-full flex items-center justify-center border-2 border-navy">{notes.length}</span>}
        </button>
      )}

      {isResuming && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-navy/90 backdrop-blur-xl text-white px-8 py-4 rounded-2xl font-bold shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-10 duration-700 z-[80] flex items-center gap-4">
          <div className="w-3 h-3 bg-candy-rose rounded-full animate-ping" />
          <span className="tracking-tight">RESUMING YOUR SESSION FROM PAGE {currentPage}</span>
        </div>
      )}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .pdf-container .custom-scrollbar::-webkit-scrollbar-thumb { background: #606367; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(12deg); }
          50% { transform: translateY(-10px) rotate(8deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }

        .textLayer { position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; opacity: 0.2; line-height: 1.0; }
        .textLayer span { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
        ::selection { background: rgba(247, 197, 216, 0.45); color: transparent; }
      `}</style>
    </div>
  );
}
