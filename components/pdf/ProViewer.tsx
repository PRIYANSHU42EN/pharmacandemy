"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Toolbar from "./Toolbar";
import PageRenderer from "./PageRenderer";
import SkeletonPulse from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { useAuth } from "@/components/providers/AuthProvider";
import { pdfCache } from "@/lib/indexedDBCache";

interface ProViewerProps {
  url: string;
  title: string;
  resourceId?: string;
}

export default function ProViewer({ url, title, resourceId }: ProViewerProps) {
  const { user } = useAuth();
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultViewport, setDefaultViewport] = useState<any>(null);
  const [isResuming, setIsResuming] = useState(false);
  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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

        // 1. Load PDF.js Script if not present (now using local optimized build)
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `/lib/pdf.min.js`; // Zero-latency local load
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load PDF engine."));
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        // 1.5 Set Local Worker Path
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `/lib/pdf.worker.min.js`; // Zero-latency local worker
        }

        // 2. Load PDF data (Check Cache first for zero-latency)
        let data: ArrayBuffer | null = await pdfCache.get(url);
        
        if (!data) {
          // Cache miss - Fetch as arraybuffer with Retry Logic
          let response: Response | null = null;
          let attempts = 0;
          const maxAttempts = 3;

          while (attempts < maxAttempts) {
            try {
              response = await fetch(url);
              if (response.ok) break;
              if (response.status === 403) throw new Error("Access denied. Please contact support.");
              if (response.status === 404) throw new Error("PDF file not found.");
            } catch (err: any) {
              if (attempts === maxAttempts - 1) throw err;
            }
            attempts++;
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempts)));
          }

          if (!response || !response.ok) {
            throw new Error(`Connection failed (${response?.status || 'Network Error'})`);
          }

          // Validation
          const contentType = response.headers.get("content-type") || "";
          if (contentType && !contentType.includes("pdf") && !contentType.includes("octet-stream") && !url.includes(".pdf")) {
            throw new Error("Invalid file format. The server did not return a PDF.");
          }

          data = await response.arrayBuffer();
          
          // Save to cache for next time
          if (data) {
            await pdfCache.set(url, data);
          }
        }

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

        // OPTIMIZATION: Only fetch the first page to get metadata and aspect ratio.
        // Child PageRenderers will lazily fetch their own pages when scrolled into view.
        const firstPage = await pdfDoc.getPage(1);
        setDefaultViewport(firstPage.getViewport({ scale: 1.0 }));
        
        // We do NOT load all pages into memory. This prevents mobile OOM crashes.

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
        // console.("[ProViewer] Critical Error:", err);
        setError(err.message || "Failed to load document.");
        setLoading(false);
      }
    };

    initPdf();
    return () => { if (pdf) { pdf.destroy().catch(() => { }); } };
  }, [url, resourceId]);

  // Track scroll position, update page, save progress, and track analytics
  useEffect(() => {
    if (!pdf || !containerRef.current) return;

    // OPTIMIZATION: Use a larger rootMargin to pre-load pages before they enter the viewport
    // This reduces "white flashes" during scrolling.
    const rootMargin = isMobile ? "100% 0px" : "200% 0px";

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.getAttribute("data-page-num") || "1");
          if (pageNum !== currentPage) {
            setCurrentPage(pageNum);
            if (resourceId) {
              localStorage.setItem(`pdf_pos_${resourceId}`, pageNum.toString());

              // Analytics: Track page view (debounced implicitly by state update)
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
    }, { 
      root: containerRef.current, 
      threshold: 0.1, // Trigger earlier
      rootMargin
    });

    const wrappers = document.querySelectorAll(".pdf-page-wrapper");
    wrappers.forEach((el) => observerRef.current?.observe(el));
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [pdf, numPages, resourceId, currentPage, title, isMobile]);

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



  if (loading) return (
    <div className="flex flex-col h-[85vh] bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-2xl p-8">
      <SkeletonPulse className="h-12 w-full rounded-xl mb-8" />
      <SkeletonPulse className="flex-1 w-full rounded-xl" />
    </div>
  );

  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="pdf-container flex flex-row h-[92vh] bg-[#323639] rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-700" onContextMenu={(e) => e.preventDefault()}>
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
          className="flex-1 overflow-auto p-4 sm:p-10 scroll-smooth custom-scrollbar relative bg-[#525659] transition-colors duration-500"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y pinch-zoom' }}
        >
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
              // OPTIMIZATION: Reduce visibility window on mobile to save memory
              const visibilityWindow = isMobile ? 2 : 4;
              const isVisible = Math.abs(currentPage - pageNum) <= visibilityWindow;
              
              return (
                <div key={pageNum} id={`page-wrap-${pageNum}`} data-page-num={pageNum} className="pdf-page-wrapper relative">
                   <PageRenderer 
                      pdfDoc={pdf} 
                      defaultViewport={defaultViewport}
                      scale={scale} 
                      pageNum={pageNum} 
                      isVisible={isVisible} 
                   />
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
              <p className="text-[13px] font-bold text-navy/40 leading-relaxed">Study notes and important snippets from this document will appear here.</p>
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
                  <button onClick={() => handleJumpToPage(note.page)} className="text-[11px] font-extrabold text-navy hover:text-candy-rose transition-colors flex items-center gap-1">GO TO SOURCE <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg></button>
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

        .pdf-page-wrapper {
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          perspective: 1000;
          -webkit-perspective: 1000;
        }

        .textLayer { position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; opacity: 0.2; line-height: 1.0; }
        .textLayer span { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
        ::selection { background: rgba(247, 197, 216, 0.45); color: transparent; }
      `}</style>
    </div>
  );
}
