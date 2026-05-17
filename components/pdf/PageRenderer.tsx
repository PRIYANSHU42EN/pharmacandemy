"use client";

import React, { useEffect, useRef, useState, memo } from "react";

interface PageRendererProps {
  pdfDoc: any;
  defaultViewport: any;
  scale: number;
  pageNum: number;
  isVisible: boolean;
}

const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const PageRenderer = memo(({ pdfDoc, defaultViewport, scale, pageNum, isVisible }: PageRendererProps) => {
  const textLayerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [page, setPage] = useState<any>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(false);

  // Load the page object
  useEffect(() => {
    let isMounted = true;
    if (!pdfDoc) return;

    const loadPage = async () => {
      try {
        const p = await pdfDoc.getPage(pageNum);
        if (isMounted) {
          setPage(p);
        }
      } catch (err) {
        console.error("Error loading page:", err);
        if (isMounted) {
          setError(true);
        }
      }
    };

    loadPage();
    return () => {
      isMounted = false;
    };
  }, [pdfDoc, pageNum]);

  // 3. Render the page to Canvas and Text Layer
  useEffect(() => {
    let isMounted = true;
    if (!isVisible || !page || !canvasRef.current) return;

    const render = async () => {
      try {
        if (isMounted) {
          setRendering(true);
          setError(false);
        }
        
        const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
        const viewport = page.getViewport({ scale: scale * dpr });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const displayViewport = page.getViewport({ scale });
        canvas.style.width = `${displayViewport.width}px`;
        canvas.style.height = `${displayViewport.height}px`;

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {}
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          intent: "display",
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!isMounted) return;

        // OPTIMIZATION: Render Text Layer only after Canvas is done and the thread is idle
        // This ensures scrolling remains "buttery smooth" (60fps)
        const renderTextLayer = async () => {
          if (!isMounted || !textLayerRef.current) return;
          
          try {
            const textContent = await page.getTextContent();
            const textLayerDiv = textLayerRef.current;
            textLayerDiv.innerHTML = ""; // Clear existing

            const pdfjsLib = (window as any).pdfjsLib;
            if (pdfjsLib && pdfjsLib.renderTextLayer) {
              await pdfjsLib.renderTextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport: displayViewport,
                enhanceTextSelection: true,
              }).promise;
            }
          } catch (err) {
            // console.error("Text layer rendering failed", err);
          }
        };

        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(() => renderTextLayer());
        } else {
          setTimeout(renderTextLayer, 200);
        }

        if (isMounted) setRendering(false);
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          if (isMounted) {
            setError(true);
            setRendering(false);
          }
        }
      }
    };

    // Use a small delay on mobile to let scrolling finish before rendering
    const renderTimeout = setTimeout(render, isMobile ? 50 : 0);
    
    return () => {
      isMounted = false;
      clearTimeout(renderTimeout);
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [page, scale, isVisible, pageNum]);

  const placeholderStyle = {
    width: page ? `${page.getViewport({ scale }).width}px` : (defaultViewport ? `${defaultViewport.width * scale}px` : "100%"),
    height: page ? `${page.getViewport({ scale }).height}px` : (defaultViewport ? `${defaultViewport.height * scale}px` : "1000px"),
    willChange: "transform",
    backfaceVisibility: "hidden",
    WebkitFontSmoothing: "antialiased",
    // PERFORMANCE: Use content-visibility to tell the browser to skip rendering pages far outside the viewport
    contentVisibility: isVisible ? "visible" : "auto",
    containIntrinsicSize: defaultViewport ? `${defaultViewport.width * scale}px ${defaultViewport.height * scale}px` : "100% 1000px",
  };

  return (
    <div 
      className="relative mb-6 sm:mb-10 bg-white shadow-xl transition-all duration-300 mx-auto group border border-gray-100 pdf-page overflow-hidden"
      style={{ ...placeholderStyle, "--scale-factor": scale.toString() } as React.CSSProperties}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas 
        ref={canvasRef} 
        className="max-w-full h-auto bg-gray-50 transition-opacity duration-300 opacity-100 transform-gpu" 
      />

      {/* Text Layer for selection and accessibility */}
      <div 
        ref={textLayerRef}
        className="textLayer absolute inset-0 z-10 pointer-events-auto opacity-0 hover:opacity-10 transition-opacity"
        style={{ pointerEvents: "all" }}
      />
      
      {rendering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur-[2px] z-20">
          <div className="w-10 h-10 border-3 border-candy-rose border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">P. {pageNum}</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-500 p-4 text-center z-20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[11px] font-bold">Error</p>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-navy/80 backdrop-blur-md text-[10px] text-white px-3 py-1.5 rounded-full font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
        PAGE {pageNum}
      </div>
    </div>
  );
});

PageRenderer.displayName = "PageRenderer";
export default PageRenderer;
