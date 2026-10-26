'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LandingVideo } from '@/lib/tamani/landing';

/** The play button over the poster; until the video exists it says it is coming. */
export function FilmPlayer({ video, poster }: { video: LandingVideo | null; poster: ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const [soon, setSoon] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (playing) void videoRef.current?.play();
  }, [playing]);

  useEffect(() => {
    if (!soon) return;
    const t = setTimeout(() => setSoon(false), 2600);
    return () => clearTimeout(t);
  }, [soon]);

  if (video && playing) {
    return (
      <video ref={videoRef} src={video.src} controls playsInline preload="none">
        {video.captions && (
          <track kind="captions" srcLang="fr" label="Français" src={video.captions} default />
        )}
      </video>
    );
  }

  return (
    <>
      {poster}
      <button
        type="button"
        className="lp-film__play"
        aria-label="Lancer la vidéo de présentation, 1 minute 30"
        onClick={() => (video ? setPlaying(true) : setSoon(true))}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M1.5 0.8v10.4L11 6z" />
        </svg>
      </button>
      <p className="lp-film__time" aria-hidden="true">
        1 min 30
      </p>
      <p className="lp-film__soon" role="status" data-on={soon ? 'true' : 'false'}>
        {soon ? 'La vidéo de présentation arrive très bientôt.' : ''}
      </p>
    </>
  );
}
