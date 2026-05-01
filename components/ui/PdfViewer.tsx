"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import SkeletonPulse from "./Skeleton";
import ErrorState from "./ErrorState";

import { useAuth } from "@/components/providers/AuthProvider";

interface PdfViewerProps {
  url: string;
  title: string;
}

export default function PdfViewer({ url, title }: PdfViewerProps) {
  const { user } = useAuth();
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [useIframe, setUseIframe] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Function to check if URL is Supabase Storage and get signed URL if needed
  const getWorkableUrl = useCallback(async (originalUrl: string) => {
    // If it's already a signed URL or not a Supabase URL, return as is
    if (!originalUrl.includes("supabase.co/storage/v1/object/")) return originalUrl;
    
    try {
      console.log("[PdfViewer] Detected Supabase URL, attempting to get signed version...");
      const idToken = await user?.getIdToken();
      if (!idToken) return originalUrl;

      // Extract path and bucket from URL
      // Format: https://project.supabase.co/storage/v1/object/[public/authenticated]/[bucket]/[path]
      const urlParts = originalUrl.split("/storage/v1/object/");
      if (urlParts.length < 2) return originalUrl;

      const pathParts = urlParts[1].split("/");
      // Remove 'public' or 'authenticated' prefix
      pathParts.shift();
      const bucket = pathParts.shift();
      const path = pathParts.join("/");

      if (!bucket || !path) return originalUrl;

      const response = await fetch("/api/resources/signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ path, bucket })
      });

      if (!response.ok) throw new Error("Failed to get signed URL");
      
      const { signedUrl } = await response.json();
      return signedUrl;
    } catch (err) {
      return originalUrl;
    }
  }, [user]);

  // Load PDF.js from CDN
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!(window as any).pdfjsLib) {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.async = true;
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        // Attempt to get a workable URL (signed if needed)
        const workableUrl = await getWorkableUrl(url);
        
        // Handle Google Drive links by using an iframe instead of PDF.js
        if (workableUrl.includes("drive.google.com")) {
          let driveId = "";
          // Extract ID from /file/d/[ID]/ or ?id=[ID]
          const idMatch = workableUrl.match(/\/d\/([^\/]+)/) || workableUrl.match(/[?&]id=([^&]+)/);
          if (idMatch) driveId = idMatch[1];
          
          if (driveId) {
            // Use Google Docs Viewer embed for better CSP compatibility
            setCurrentUrl(`https://docs.google.com/viewer?url=https://drive.google.com/uc?id=${driveId}&embedded=true`);
          } else {
            setCurrentUrl(workableUrl.replace("/view", "/preview").split("?")[0]);
          }
          
          setUseIframe(true);
          setLoading(false);
          return;
        }

        setCurrentUrl(workableUrl);
        const loadingTask = pdfjsLib.getDocument(workableUrl);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setLoading(false);
      } catch (err: any) {
        setError("Failed to load PDF. Please try again or open in new tab.");
        setLoading(false);
      }
    };

    loadPdfJs();
  }, [url, getWorkableUrl]);

  const renderPage = useCallback(async (num: number, currentScale: number) => {
    if (!pdf || !canvasRef.current) return;

    try {
      setRendering(true);
      
      // Cancel previous render task if any
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdf.getPage(num);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      
      await renderTask.promise;
      setRendering(false);
    } catch (err: any) {
      // Rendering cancelled is normal
    }
  }, [pdf]);

  useEffect(() => {
    if (pdf) {
      renderPage(pageNum, scale);
    }
  }, [pdf, pageNum, scale, renderPage]);

  // Handle responsive initial scale
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setScale(0.8);
    } else {
      setScale(1.0);
    }
  }, []);

  const handlePrevPage = () => {
    if (pageNum <= 1) return;
    setPageNum(pageNum - 1);
  };

  const handleNextPage = () => {
    if (pageNum >= numPages) return;
    setPageNum(pageNum + 1);
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1.5);

  if (loading) {
    return (
      <div className="w-full rounded-2xl overflow-hidden" style={{ height: "80vh", minHeight: "500px" }}>
        <SkeletonPulse className="w-full h-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-2xl p-8" style={{ background: "white", border: "0.5px solid #e0e0e0" }}>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
        <div className="mt-4 text-center">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14px] font-medium"
            style={{ color: "var(--color-candy-rose)" }}
          >
            Open Original PDF ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden shadow-sm relative z-0" style={{ border: "0.5px solid #e0e0e0", background: "#f8f9fa" }}>
      {/* PDF Controls - Hidden for Iframe (which has its own controls) */}
      {!useIframe && (
        <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 sticky top-[72px] z-10" style={{ background: "white", borderBottom: "0.5px solid #e0e0e0" }}>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevPage} 
              disabled={pageNum <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-[13px] font-medium" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid)" }}>
              Page {pageNum} of {numPages}
            </span>
            <button 
              onClick={handleNextPage} 
              disabled={pageNum >= numPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
              </svg>
            </button>
            <span className="text-[12px] min-w-[40px] text-center font-medium" style={{ fontFamily: "var(--font-mono)" }}>
              {Math.round(scale * 100)}%
            </span>
            <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <div className="w-[1px] h-4 bg-gray-200 mx-1" />
            <button onClick={resetZoom} className="text-[11px] font-bold px-2 py-1 rounded hover:bg-gray-100" style={{ color: "var(--color-candy-rose)" }}>
              RESET
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area or Iframe Fallback */}
      <div className="flex-1 bg-[#525659] flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}>
        {useIframe ? (
          <iframe 
            src={currentUrl}
            className="w-full h-full border-0"
            allow="autoplay"
            title="PDF Preview"
            style={{ display: "block", minHeight: "100%" }}
          />
        ) : (
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start">
            <div className="relative shadow-2xl h-fit w-fit mx-auto">
              <canvas ref={canvasRef} className="max-w-full h-auto bg-white" style={{ display: "block" }} />
              {rendering && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--color-candy-rose)] border-t-transparent animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Info - Only for PDF.js mode */}
      {!useIframe && (
        <div className="px-4 py-2 flex items-center justify-between bg-white text-[11px]" style={{ borderTop: "0.5px solid #e0e0e0", color: "var(--color-slate)" }}>
          <p>{title}</p>
          <div className="flex gap-4">
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-candy-rose)] transition-colors">Download PDF</a>
            <span>Powered by PDF.js</span>
          </div>
        </div>
      )}
    </div>
  );
}
