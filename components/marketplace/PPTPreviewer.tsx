"use client";

import { useState } from "react";
import { 
  ChevronLeft, ChevronRight, Lock, 
  Maximize2, Download, Eye, Layers 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlidePreview {
  id: string;
  url: string;
  slideNumber: number;
}

interface PPTPreviewerProps {
  slides: SlidePreview[];
  isUnlocked?: boolean;
}

export default function PPTPreviewer({ slides, isUnlocked = false }: PPTPreviewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    if (currentIndex < slides.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const prevSlide = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  if (!slides || slides.length === 0) return null;

  return (
    <div className="bg-navy rounded-[32px] overflow-hidden shadow-2xl relative border border-white/5">
      {/* Main Slide View */}
      <div className="aspect-[16/9] relative group">
        <img 
          src={slides[currentIndex].url} 
          alt={`Slide ${slides[currentIndex].slideNumber}`} 
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            !isUnlocked && currentIndex > 0 ? "blur-md brightness-50" : ""
          )}
        />
        
        {/* Watermark (If locked) */}
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div className="rotate-[-30deg] flex flex-col gap-8 opacity-10">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="text-white text-6xl font-black whitespace-nowrap uppercase tracking-[1em]">
                  CUBEPHARMA PREVIEW • CUBEPHARMA PREVIEW
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lock Overlay for restricted slides */}
        {!isUnlocked && currentIndex > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy/40 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 border border-white/20">
              <Lock className="w-8 h-8 text-candy-rose" />
            </div>
            <h4 className="text-white font-bold text-lg mb-1">Restricted Content</h4>
            <p className="text-white/60 text-xs font-medium">Purchase this PPT to unlock all slides.</p>
          </div>
        )}

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 p-6 flex items-center justify-between bg-gradient-to-t from-navy/80 to-transparent">
          <div className="flex items-center gap-4">
            <button 
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all disabled:opacity-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
              Slide {slides[currentIndex].slideNumber} / {slides.length}
            </span>
            <button 
              onClick={nextSlide}
              disabled={currentIndex === slides.length - 1 || (!isUnlocked && currentIndex >= 2)}
              className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-all disabled:opacity-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="w-10 h-10 rounded-xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 transition-all">
                <Maximize2 className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="p-4 bg-white/5 border-t border-white/5 flex gap-3 overflow-x-auto scrollbar-none">
        {slides.map((slide, i) => (
          <button 
            key={slide.id}
            onClick={() => setCurrentIndex(i)}
            disabled={!isUnlocked && i > 2}
            className={cn(
              "w-24 aspect-[16/9] rounded-lg overflow-hidden shrink-0 border-2 transition-all relative",
              currentIndex === i ? "border-candy-rose scale-105" : "border-transparent opacity-50 hover:opacity-80",
              !isUnlocked && i > 2 ? "grayscale cursor-not-allowed" : ""
            )}
          >
            <img src={slide.url} className="w-full h-full object-cover" alt="" />
            {!isUnlocked && i > 2 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Lock className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
