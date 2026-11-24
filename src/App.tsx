import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Cpu,
  Gamepad2,
  Play,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ParabolaGame } from './components/ParabolaGame';
import { CtMiniGame } from './components/CtMiniGame';
import { LearningStudio } from './components/LearningStudio';
import { HighScoreModal } from './components/HighScoreModal';
import { AppScreen } from './types/game';
import { sound } from './utils/sound';
import { getBestScore } from './utils/storage';

const StartHeroCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    let t = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(300, Math.floor(rect.width));
        const h = Math.max(200, Math.floor(rect.height));
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, w, h);

          // Draw 3 playful animated real-world parabolas drifting across the drafting canvas
          const curves = [
            {
              color: '#FF5A36',
              dash: [8, 6],
              xp: 0.48 + Math.sin(t * 0.7) * 0.06,
              yp: 0.22 + Math.cos(t * 0.9) * 0.05,
              startY: 0.84,
              speed: 0.38,
              phase: 0,
            },
            {
              color: '#1D63DC',
              dash: [6, 6],
              xp: 0.56 + Math.cos(t * 0.6) * 0.05,
              yp: 0.34 + Math.sin(t * 0.8) * 0.05,
              startY: 0.9,
              speed: 0.31,
              phase: 0.33,
            },
            {
              color: '#10B981',
              dash: [5, 5],
              xp: 0.5,
              yp: 0.76 + Math.sin(t * 0.75) * 0.04,
              startY: 0.28,
              speed: 0.27,
              phase: 0.66,
            },
          ];

          curves.forEach((c) => {
            const x0 = w * 0.04;
            const xEnd = w * 0.96;
            const xpPx = w * c.xp;
            const ypPx = h * c.yp;
            const y0 = h * c.startY;
            const dx0 = x0 - xpPx;
            const a = (y0 - ypPx) / (dx0 * dx0);

            // Curve stroke
            ctx.save();
            ctx.strokeStyle = c.color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 2.5;
            ctx.setLineDash(c.dash);
            ctx.lineDashOffset = -(t * 22);
            ctx.beginPath();
            for (let x = x0; x <= xEnd; x += 6) {
              const y = a * (x - xpPx) * (x - xpPx) + ypPx;
              if (x === x0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();

            // Vertex marker dot
            ctx.save();
            ctx.fillStyle = c.color;
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.arc(xpPx, ypPx, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Moving projectile orb along the exact parabola
            const u = (t * c.speed + c.phase) % 1;
            const ox = x0 + (xEnd - x0) * u;
            const oy = a * (ox - xpPx) * (ox - xpPx) + ypPx;
            ctx.save();
            ctx.fillStyle = c.color;
            ctx.strokeStyle = '#13293D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ox, oy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          });

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
    />
  );
};

export function App() {
  const [screen, setScreen] = useState<AppScreen>('start');
  const [scoreModalTab, setScoreModalTab] = useState<'arcade' | 'ct-sprint' | null>(null);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());

  const bestArcade = getBestScore('arcade');
  const bestSprint = getBestScore('ct-sprint');

  if (screen === 'arcade') {
    return (
      <>
        <ParabolaGame
          onBack={() => setScreen('start')}
          onOpenMateri={() => setScreen('materi')}
          onShowScores={() => setScoreModalTab('arcade')}
        />
        {scoreModalTab && (
          <HighScoreModal
            initialTab={scoreModalTab}
            onClose={() => setScoreModalTab(null)}
          />
        )}
      </>
    );
  }

  if (screen === 'ct-sprint') {
    return (
      <>
        <CtMiniGame
          onBack={() => setScreen('start')}
          onShowScores={() => setScoreModalTab('ct-sprint')}
        />
        {scoreModalTab && (
          <HighScoreModal
            initialTab={scoreModalTab}
            onClose={() => setScoreModalTab(null)}
          />
        )}
      </>
    );
  }

  if (screen === 'materi') {
    return (
      <LearningStudio
        onBack={() => setScreen('start')}
        onPlayArcade={() => setScreen('arcade')}
        onPlayCtSprint={() => setScreen('ct-sprint')}
      />
    );
  }

  // ================== START SCREEN ==================
  return (
    <div className="min-h-screen blueprint-paper flex flex-col justify-between relative overflow-hidden">
      {/* Top Navbar */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#FF5A36] border-2 border-[#13293D] shadow-[3px_3px_0px_#13293D] flex items-center justify-center font-mono-math font-extrabold text-white text-base">
            x²
          </div>
          <div>
            <div className="font-display font-bold text-base sm:text-lg leading-none">
              PARABOLA LAB
            </div>
            <div className="text-[11px] font-semibold text-slate-500">
              Matematika Kelas X SMA/SMK/MA
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setScoreModalTab('arcade');
            }}
            className="draft-btn bg-white px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5"
          >
            <Trophy className="w-4 h-4 text-[#F59E0B]" />
            <span>Papan Skor</span>
          </button>
          <button
            onClick={() => setMuted(sound.toggleMute())}
            className="draft-btn bg-white p-2 rounded-xl"
            aria-label="Toggle suara"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-slate-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#13293D]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Hero & Mode Cards */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Interactive Sunlit Drafting Hero Banner */}
        <section className="relative draft-card rounded-3xl overflow-hidden bg-[#FCF9F2] p-6 sm:p-10">
          <StartHeroCanvas />

          <div className="relative z-10 max-w-2xl space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-[#13293D] text-white text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                <Cpu className="w-3.5 h-3.5 text-[#F59E0B]" /> Berbasis Computational Thinking
              </span>
              <span className="inline-flex items-center gap-1 bg-white border-2 border-[#13293D] text-xs font-mono-math font-bold px-2.5 py-0.5 rounded-full text-[#1D63DC]">
                f(x) = ax² + bx + c
              </span>
            </div>

            <div className="space-y-2.5">
              <h1 className="font-display font-bold text-3xl sm:text-5xl tracking-tight text-[#13293D] leading-[1.08]">
                Taklukkan{' '}
                <span className="text-[#FF5A36] underline decoration-[#13293D] decoration-4 underline-offset-4">
                  Fungsi Kuadrat
                </span>{' '}
                di Dunia Nyata!
              </h1>
              <p className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed max-w-xl">
                Bentuk lintasan parabola lemparan basket, air mancur taman, hingga kabel jembatan
                gantung (<span className="font-mono-math font-bold text-[#059669]">a &gt; 0</span>{' '}
                &amp; <span className="font-mono-math font-bold text-[#FF5A36]">a &lt; 0</span>).
                Belajar konsep kontekstual Kelas X dengan 4 Pilar CT sambil kejar skor tertinggi!
              </p>
            </div>

            {/* Primary Instant-Play Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => {
                  sound.playClick();
                  setScreen('arcade');
                }}
                className="draft-btn pulse-cta bg-[#FF5A36] hover:bg-[#F04B27] text-white font-display font-bold text-base sm:text-lg px-7 py-3.5 rounded-2xl flex items-center gap-2.5"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>MAIN PARABOLA ARCH!</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setScreen('ct-sprint');
                }}
                className="draft-btn bg-[#1D63DC] hover:bg-[#1754BD] text-white font-display font-bold text-sm sm:text-base px-5 py-3.5 rounded-2xl flex items-center gap-2"
              >
                <Zap className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                <span>Mini-Game Dekode CT</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setScreen('materi');
                }}
                className="draft-btn bg-white hover:bg-[#FAF7F0] text-[#13293D] font-display font-bold text-sm sm:text-base px-5 py-3.5 rounded-2xl flex items-center gap-2"
              >
                <BookOpen className="w-5 h-5 text-[#10B981]" />
                <span>Materi CT &amp; Lab</span>
              </button>
            </div>
          </div>
        </section>

        {/* 3 Feature / Mode Entry Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Arcade Game */}
          <button
            onClick={() => {
              sound.playClick();
              setScreen('arcade');
            }}
            className="draft-card rounded-2xl p-5 text-left hover:-translate-y-1 transition-transform flex flex-col justify-between gap-4 group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#FF5A36] border-2 border-[#13293D] text-white flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <span className="font-mono-math text-xs font-extrabold bg-[#FAF7F0] border border-[#13293D]/25 px-2.5 py-1 rounded-lg">
                  Rekor: {bestArcade}
                </span>
              </div>
              <h2 className="font-display font-bold text-lg group-hover:text-[#FF5A36] transition-colors">
                1. Parabola Arch! (Arcade)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Geser titik puncak <strong className="font-mono-math text-[#13293D]">P(xp, yp)</strong>{' '}
                pakai sentuhan atau keyboard! Tembak ring basket, air mancur, dan bentuk jembatan{' '}
                <strong className="font-mono-math text-[#059669]">a &gt; 0</strong>.
              </p>
            </div>
            <div className="text-xs font-extrabold text-[#FF5A36] flex items-center gap-1">
              Mainkan Langsung →
            </div>
          </button>

          {/* Card 2: Simple CT Mini-Game */}
          <button
            onClick={() => {
              sound.playClick();
              setScreen('ct-sprint');
            }}
            className="draft-card rounded-2xl p-5 text-left hover:-translate-y-1 transition-transform flex flex-col justify-between gap-4 group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#1D63DC] border-2 border-[#13293D] text-white flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="font-mono-math text-xs font-extrabold bg-[#FAF7F0] border border-[#13293D]/25 px-2.5 py-1 rounded-lg">
                  Rekor: {bestSprint}
                </span>
              </div>
              <h2 className="font-display font-bold text-lg group-hover:text-[#1D63DC] transition-colors">
                2. Dekode CT Sprint (60 Detik)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Game sederhana cepat berbasis 4 Pilar CT! Baca pola grafik kuadrat, tebak tanda{' '}
                <strong className="font-mono-math text-[#13293D]">a, D, xp, yp</strong> &amp; kejar
                bonus waktu streak!
              </p>
            </div>
            <div className="text-xs font-extrabold text-[#1D63DC] flex items-center gap-1">
              Mulai Tantangan 60 Detik →
            </div>
          </button>

          {/* Card 3: Contextual Learning Studio */}
          <button
            onClick={() => {
              sound.playClick();
              setScreen('materi');
            }}
            className="draft-card rounded-2xl p-5 text-left hover:-translate-y-1 transition-transform flex flex-col justify-between gap-4 group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#10B981] border-2 border-[#13293D] text-white flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-extrabold bg-[#10B981]/15 text-[#047857] border border-[#10B981]/40 px-2.5 py-1 rounded-lg">
                  4 Kasus Nyata
                </span>
              </div>
              <h2 className="font-display font-bold text-lg group-hover:text-[#059669] transition-colors">
                3. Materi Kontekstual CT
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Pelajari Fungsi Kuadrat Kelas X lewat Basket, Air Mancur, Jembatan Gantung, &amp;
                Laba Kantin lengkap dengan slider grafik interaktif &amp; 4 Pilar CT!
              </p>
            </div>
            <div className="text-xs font-extrabold text-[#059669] flex items-center gap-1">
              Buka Lab Pembelajaran →
            </div>
          </button>
        </section>

        {/* 4 CT Pillars Strip */}
        <section className="draft-card rounded-2xl px-4 py-3 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-display font-bold text-[#13293D] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#F59E0B]" /> 4 Pilar Computational Thinking:
          </div>
          <div className="flex flex-wrap items-center gap-2 font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-[#FF5A36]/12 text-[#C23B1E]">
              1. Dekomposisi (a, b, c)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#1D63DC]/12 text-[#1D63DC]">
              2. Pengenalan Pola (D &amp; Simetri)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#8B5CF6]/12 text-[#6D28D9]">
              3. Abstraksi (Model Nyata)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#10B981]/12 text-[#047857]">
              4. Algoritma (xp, yp, Akar)
            </span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-3 px-4 text-[11px] font-semibold text-slate-500">
        Parabola Lab • Fungsi Kuadrat Kelas X SMA/SMK/MA • Kontrol Keyboard (WASD/Panah/Spasi) &amp;
        Sentuh Layar
      </footer>

      {scoreModalTab && (
        <HighScoreModal
          initialTab={scoreModalTab}
          onClose={() => setScoreModalTab(null)}
        />
      )}
    </div>
  );
}

export default App;
