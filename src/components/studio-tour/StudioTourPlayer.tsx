"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const VIDEO_DURATION_SECONDS = 27.3;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const rounded = Math.max(0, Math.floor(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

export default function StudioTourPlayer() {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean | null>(null);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(VIDEO_DURATION_SECONDS);

  const playVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = true;
      await video.play();
      setPlaybackFailed(false);
    } catch {
      // Browsers may reject autoplay even for muted video. The visible play
      // button remains available so the visitor can start it themselves.
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
      if (mediaQuery.matches) {
        videoRef.current?.pause();
        setUserPaused(true);
      }
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || prefersReducedMotion === null) return;

    if (!inView) {
      video.pause();
      return;
    }

    if (!prefersReducedMotion && !userPaused && !playbackFailed) {
      void playVideo();
    }
  }, [inView, playbackFailed, playVideo, prefersReducedMotion, userPaused]);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setUserPaused(false);
      setPlaybackFailed(false);
      void playVideo();
    } else {
      setUserPaused(true);
      video.pause();
    }
  }

  function replay() {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setCurrentTime(0);
    setUserPaused(false);
    setPlaybackFailed(false);
    void playVideo();
  }

  return (
    <div id="walkthrough" className="scroll-mt-24">
      <div
        ref={frameRef}
        className="overflow-hidden rounded-[12px] border border-[#d9d4c7] bg-[#222420] shadow-[0_26px_70px_rgba(25,27,24,.18)]"
      >
        <div className="flex h-10 items-center gap-2 border-b border-white/15 bg-[#272a27] px-4 text-white/70">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ba6b64]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#dba74c]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#719a79]" />
          <span className="mx-auto max-w-[55%] truncate rounded-md bg-white/10 px-4 py-1 text-[11px] text-white/70 sm:text-xs">
            feedsport.co.zw/studio
          </span>
          <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-white/50 sm:inline">
            Real Studio session
          </span>
        </div>

        <div className="relative aspect-video w-full overflow-hidden bg-[#faf8f3]">
          <video
            ref={videoRef}
            data-testid="studio-tour-video"
            className="block h-full w-full object-contain"
            width={1600}
            height={900}
            poster="/videos/studio-walkthrough-poster.jpg"
            preload="metadata"
            muted
            loop
            playsInline
            aria-label="Actual FeedSport Studio walkthrough"
            aria-describedby="walkthrough-description walkthrough-cost-note"
            onCanPlay={() => setPlaybackFailed(false)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onError={() => {
              setPlaybackFailed(true);
              setIsPlaying(false);
            }}
          >
            <source src="/videos/studio-walkthrough.webm" type="video/webm" />
            <source src="/videos/studio-walkthrough.mp4" type="video/mp4" />
            Your browser does not support HTML5 video. You can download the{" "}
            <a href="/videos/studio-walkthrough.mp4">FeedSport Studio walkthrough</a> instead.
          </video>

          {playbackFailed && (
            <div className="absolute inset-0 grid place-items-center bg-[#222420]/90 p-6 text-center text-white" role="alert">
              <p className="m-0 max-w-md text-sm leading-6">
                The walkthrough could not play in this browser. Try the{" "}
                <a className="font-semibold text-[#f0c778] underline underline-offset-4" href="/videos/studio-walkthrough.mp4">
                  MP4 version
                </a>{" "}
                or the{" "}
                <a className="font-semibold text-[#f0c778] underline underline-offset-4" href="/videos/studio-walkthrough.webm">
                  WebM version
                </a>
                .
              </p>
            </div>
          )}
        </div>

        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 bg-[#222420] px-3 py-2.5 text-white sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isPlaying ? "Pause Studio walkthrough" : "Play Studio walkthrough"}
              onClick={togglePlayback}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3aa45]"
            >
              {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              aria-label="Replay Studio walkthrough from the beginning"
              onClick={replay}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3aa45]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Replay
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#d0cdc3]">
            <span aria-live="polite">{isPlaying ? "Playing" : "Paused"}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 py-6 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)] md:items-start">
        <div>
          <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-[#2f5a3f]">
            Actual Studio walkthrough · 27 seconds
          </p>
          <h3 className="mb-2 text-[clamp(24px,3vw,36px)] font-bold leading-tight tracking-[-.025em]">
            From feeding stage to saved formulation
          </h3>
          <p id="walkthrough-description" className="m-0 max-w-[680px] text-[15px] leading-7 text-[#4f524b]">
            Watch a real FeedSport Studio session select a 47–74 kg grower pig stage, use suggested ingredients, formulate a
            1-tonne simpler recipe, review its nutrition and advisories, then name and save it.
          </p>
        </div>
        <p
          id="walkthrough-cost-note"
          className="m-0 rounded-lg border border-[#dfc98e] bg-[#fff8e8] px-4 py-3 text-[13px] leading-6 text-[#5c4b25]"
        >
          <strong className="font-semibold text-[#3f341d]">Cost shown is partial.</strong> The $444.83/t result excludes the
          unpriced Caremix premix, so it is not the complete feed cost. Planning prices are indicative; review the nutrient
          analysis, missing premix documentation and advisories before manufacturing.
        </p>
      </div>
    </div>
  );
}
