"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Download, User, ArrowUpRight } from "lucide-react";
import { PPTListing } from "@/types";
import { cn } from "@/lib/utils";

interface PPTCardProps {
  ppt: PPTListing;
  priority?: boolean;
}

export default function PPTCard({ ppt, priority = false }: PPTCardProps) {
  const [imgSrc, setImgSrc] = useState(ppt.thumbnail_url || "/images/ppt-placeholder.jpg");
  const priceInRupees = (ppt.price / 100).toFixed(0);

  return (
    <div className="group relative flex flex-col h-full bg-white rounded-[2rem] border border-slate-200 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 overflow-hidden">
      
      {/* Visual Header */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={imgSrc}
          alt={ppt.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          onError={() => setImgSrc("/images/ppt-placeholder.jpg")}
        />
        
        {/* Overlay Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-slate-900 shadow-sm">
            {ppt.category?.name || "General"}
          </span>
        </div>

        {/* Badge removed to align with free platform vision */}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6">
           <Link 
            href={`/marketplace/${ppt.id}`}
            className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 shadow-xl"
           >
             View Details
             <ArrowUpRight className="w-3 h-3" />
           </Link>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
            {ppt.creator?.avatar_url ? (
              <Image src={ppt.creator.avatar_url} alt="" width={20} height={20} className="object-cover" />
            ) : (
              <User className="w-3 h-3 text-slate-400" />
            )}
          </div>
          <span className="text-[11px] font-bold text-slate-500 tracking-tight">
            {ppt.creator?.display_name || "Independent Creator"}
          </span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors tracking-tight">
          {ppt.title}
        </h3>
        
        <p className="text-sm text-slate-500 line-clamp-2 mb-6 leading-relaxed font-medium">
          {ppt.description}
        </p>

        {/* Dynamic Footer */}
        <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-slate-900">{ppt.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Download className="w-4 h-4" />
              <span className="text-sm font-bold">{ppt.download_count}</span>
            </div>
          </div>

          <div>
            {ppt.price === 0 ? (
              <span className="text-sm font-extrabold text-emerald-500 tracking-tight">FREE</span>
            ) : (
              <span className="text-xl font-extrabold text-slate-900">₹{(ppt.price / 100).toFixed(0)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

