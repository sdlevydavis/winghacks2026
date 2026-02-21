import { useEffect, useRef, useState } from 'react';

interface LoadingScreenProps {
  onFinished: () => void;
}

export function LoadingScreen({ onFinished }: LoadingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => {});
    video.onended = () => onFinished();

    const interval = setInterval(() => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [onFinished]);

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMuted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">

      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-300 to-purple-400 blur-xl opacity-40 scale-110" />
        <div className="absolute -top-4 -left-4 text-2xl animate-bounce" style={{ animationDelay: '0s' }}>✨</div>
        <div className="absolute -top-4 -right-4 text-2xl animate-bounce" style={{ animationDelay: '0.3s' }}>💸</div>
        <div className="absolute -bottom-4 -left-4 text-2xl animate-bounce" style={{ animationDelay: '0.6s' }}>📈</div>
        <div className="absolute -bottom-4 -right-4 text-2xl animate-bounce" style={{ animationDelay: '0.9s' }}>💎</div>
<video
  ref={videoRef}
  src="money_loading.mp4"
  autoPlay
  muted
  playsInline
  className="relative rounded-3xl shadow-2xl border-4 border-white"
  style={{ width: '260px', height: '260px', objectFit: 'cover' }}
/>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">TradeQuest 💅</h1>
      <p className="text-gray-400 text-xs tracking-widest uppercase mb-6">your money era starts now</p>

      {muted && (
        <button
          onClick={handleUnmute}
          className="text-xs text-pink-400 animate-pulse mb-3 hover:text-pink-600 transition-colors"
        >
          🔇 tap to unmute
        </button>
      )}

      <div className="w-40 h-1.5 bg-pink-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        onClick={onFinished}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
      >
        skip →
      </button>
    </div>
  );
}