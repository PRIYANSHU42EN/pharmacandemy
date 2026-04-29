"use client";

import React, { useState } from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import SkeletonPulse from "./Skeleton";

interface VideoPlayerProps {
  url: string;
  title: string;
}

export default function VideoPlayer({ url, title }: VideoPlayerProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const getYouTubeId = (rawUrl: string) => {
    if (!rawUrl) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = rawUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const youtubeId = getYouTubeId(url);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    setIsReady(true);
  };

  const videoOpts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
    },
  };

  if (!youtubeId) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: "0.5px solid #e0e0e0" }}>
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={url}
            className="absolute inset-0 w-full h-full bg-black/5"
            allowFullScreen
            loading="lazy"
            title={title}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: "0.5px solid #e0e0e0", background: "#f1f1f1" }}>
      {!showVideo ? (
        <button
          onClick={() => setShowVideo(true)}
          className="relative w-full block group"
          style={{ paddingBottom: "56.25%" }}
          aria-label="Play video"
        >
          <img
            src={getYouTubeThumbnail(youtubeId)}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"
              style={{ background: "rgba(251,111,146,0.95)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      ) : (
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {!isReady && (
            <div className="absolute inset-0 z-10">
              <SkeletonPulse className="w-full h-full rounded-none" />
            </div>
          )}
          <div className="absolute inset-0 w-full h-full">
            <YouTube
              videoId={youtubeId}
              opts={videoOpts}
              onReady={onPlayerReady}
              className="w-full h-full"
              iframeClassName="w-full h-full"
              title={title}
            />
          </div>
        </div>
      )}
    </div>
  );
}
