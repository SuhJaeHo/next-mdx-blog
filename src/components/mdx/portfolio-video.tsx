"use client";

import * as React from "react";

interface IPortfolioVideoProps {
  src: string;
  poster: string;
  caption?: string;
  label: string;
}

export default function PortfolioVideo({ src, poster, caption, label }: IPortfolioVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const handlePlay = async () => {
    try {
      await videoRef.current?.play();
    } catch (error) {
      console.error("Failed to play portfolio video", error);
    }
  };

  return (
    <figure className="case-video" data-portfolio-video data-video-src={src} data-video-poster={poster} data-video-label={label}>
      <div className="case-video-frame">
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          poster={poster}
          aria-label={label}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          <source src={src} type="video/mp4" />
          브라우저에서 영상을 재생할 수 없습니다.
        </video>
        {!isPlaying && (
          <button type="button" className="case-video-play" onClick={handlePlay} aria-label={`${label} 재생`}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M8.4 5.7a1 1 0 0 1 1.52-.85l9.1 6.3a1 1 0 0 1 0 1.7l-9.1 6.3a1 1 0 0 1-1.52-.85V5.7Z" />
            </svg>
          </button>
        )}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
