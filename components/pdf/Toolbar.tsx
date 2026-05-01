"use client";

import React from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Layout, 
  Download,
  Printer,
  Maximize2
} from "lucide-react";

interface ToolbarProps {
  pageNum: number;
  numPages: number;
  scale: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onJumpToPage: (page: number) => void;
  title: string;
}

export default function Toolbar({
  pageNum,
  numPages,
  scale,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onJumpToPage,
  title
}: ToolbarProps) {
  return (
    <div className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 px-3 md:px-6 py-2.5 flex items-center justify-between shadow-sm">
      {/* Navigation Group */}
      <div className="flex items-center gap-1 md:gap-3">
        <div className="flex items-center gap-0.5">
          <button 
            onClick={onPrevPage}
            disabled={pageNum <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-20 transition-all text-gray-700"
            title="Previous Page"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2 bg-gray-100 px-2.5 py-1.5 rounded-xl border border-gray-200/50">
            <input 
              type="text"
              value={pageNum}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) onJumpToPage(val);
              }}
              className="w-8 bg-transparent text-center text-[13px] font-bold outline-none text-navy"
            />
            <span className="text-gray-400 text-[11px] font-medium select-none">/ {numPages}</span>
          </div>

          <button 
            onClick={onNextPage}
            disabled={pageNum >= numPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-20 transition-all text-gray-700"
            title="Next Page"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Title Group - Desktop Only */}
      <div className="hidden lg:block flex-1 px-8">
        <h2 className="text-[14px] font-bold text-navy truncate text-center opacity-80">{title}</h2>
      </div>

      {/* Control Group */}
      <div className="flex items-center gap-1 md:gap-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200/50">
          <button 
            onClick={onZoomOut} 
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-[11px] font-bold w-12 text-center text-navy font-mono select-none">
            {Math.round(scale * 100)}%
          </span>
          <button 
            onClick={onZoomIn} 
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-gray-600"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
        </div>
        
        <div className="hidden sm:block w-[1px] h-6 bg-gray-200 mx-1" />
        
        <div className="flex items-center gap-1">
          <button 
            onClick={onResetZoom} 
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-all" 
            title="Fit to Width"
          >
            <Layout size={18} />
          </button>
          
          <button 
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-all sm:flex hidden" 
            onClick={() => window.print()}
            title="Print Document"
          >
            <Printer size={18} />
          </button>
          
          <button 
            className="p-2 rounded-lg bg-navy text-white hover:bg-navy/90 transition-all shadow-md active:scale-95" 
            title="Full Screen"
            onClick={() => {
              const el = document.querySelector(".pdf-container");
              if (el?.requestFullscreen) el.requestFullscreen();
            }}
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
