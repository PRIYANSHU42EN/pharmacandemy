"use client";

import React, { useEffect, useRef, useState, memo } from "react";

interface PageRendererProps {
  page: any;
  scale: number;
  pageNum: number;
  isVisible: boolean;
}

const PageRenderer = memo(({ page, scale, pageNum, isVisible }: PageRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState(false);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (!isVisible || !page || !canvasRef.current) return;

    const render = async () => {
      try {
        setRendering(true);
        setError(false);
        
        const viewport = page.getViewport({ scale: scale * window.devicePixelRatio });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // 1. Render Canvas
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const displayViewport = page.getViewport({ scale });
        canvas.style.width = `${displayViewport.width}px`;
        canvas.style.height = `${displayViewport.height}px`;

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          intent: "display",
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        setRendering(false);
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error(`[PageRenderer] Error rendering page ${pageNum}:`, err);
          setError(true);
          setRendering(false);
        }
      }
    };

    render();
    
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [page, scale, isVisible, pageNum]);

  const placeholderStyle = {
    width: page ? `${page.getViewport({ scale }).width}px` : "100%",
    aspectRatio: page ? undefined : "1 / 1.414",
    height: page ? `${page.getViewport({ scale }).height}px` : "auto",
  };

  return (
    <div 
      className="relative mb-6 sm:mb-10 bg-white shadow-xl transition-all duration-300 mx-auto group border border-gray-100 pdf-page"
      style={{ ...placeholderStyle, "--scale-factor": scale.toString() } as React.CSSProperties}
      onContextMenu={(e) => e.preventDefault()} // Security: Disable right-click on pages
    >
      <canvas 
        ref={canvasRef} 
        className="max-w-full h-auto bg-gray-50 transition-opacity duration-300 opacity-100" 
      />
      
      {/* Text Layer Disabled for Performance & Security */}
      {/* <div 
        ref={textLayerRef} 
        className="textLayer absolute inset-0 pointer-events-auto opacity-20 hover:opacity-100 transition-opacity"
        style={{ mixBlendMode: 'multiply' }}
      /> */}
      
      {rendering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur-[2px] animate-pulse">
          <div className="w-12 h-12 border-4 border-candy-rose border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rendering Page {pageNum}...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-500 p-4 text-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[12px] font-bold">Rendering failed</p>
        </div>
      )}

      {/* Page Badge */}
      <div className="absolute top-4 left-4 bg-navy/80 backdrop-blur-md text-[10px] text-white px-3 py-1.5 rounded-full font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        P. {pageNum}
      </div>
    </div>
  );
});

PageRenderer.displayName = "PageRenderer";
export default PageRenderer;
