import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { buildShuffledQuestions } from '../data/ctContent';
import { formatNum } from '../data/stageGenerator';
import { CtPillar, CtQuestion, Particle } from '../types/game';
import { sound } from '../utils/sound';
import { isTopScore, saveHighScore } from '../utils/storage';

interface CtMiniGameProps {
  onBack: () => void;
  onShowScores: () => void;
}

const TOTAL_TIME = 60;

const PILLAR_COLORS: Record<CtPillar, string> = {
  Dekomposisi: 'bg-[#FF5A36] text-white',
  'Pengenalan Pola': 'bg-[#1D63DC] text-white',
  Abstraksi: 'bg-[#8B5CF6] text-white',
  Algoritma: 'bg-[#10B981] text-white',
};

export const CtMiniGame: React.FC<CtMiniGameProps> = ({ onBack, onShowScores }) => {
  const [questions, setQuestions] = useState<CtQuestion[]>(() => buildShuffledQuestions());
  const [qIdx, setQIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_TIME);
  const [status, setStatus] = useState<'playing' | 'paused' | 'gameover'>('playing');
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    ok: boolean;
    text: string;
    bonus?: string;
  } | null>(null);
  const [muted, setMuted] = useState<boolean>(sound.isMuted());
  const [playerName, setPlayerName] = useState<string>('');
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<number>(0);
  const traceProgressRef = useRef<number>(0);
  const nextTimeoutRef = useRef<number | null>(null);

  const currentQ = questions[qIdx % questions.length];

  const triggerParticles = useCallback((ok: boolean) => {
    const colors = ok
      ? ['#10B981', '#F59E0B', '#1D63DC', '#38BDF8']
      : ['#FF5A36', '#E11D48', '#13293D'];
    const count = ok ? 30 : 14;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = 80 + Math.random() * 190;
      particlesRef.current.push({
        x: 0.5,
        y: 0.5,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - (ok ? 60 : 10),
        size: 5 + Math.random() * 6,
        color: colors[i % colors.length],
        life: 0.55 + Math.random() * 0.35,
        maxLife: 0.9,
        shape: i % 2 === 0 ? 'square' : 'circle',
        gravity: 320,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 10,
      });
    }
    shakeRef.current = ok ? 6 : 11;
  }, []);

  const advanceQuestion = useCallback(() => {
    setSelectedOpt(null);
    setFeedbackBanner(null);
    traceProgressRef.current = 0;
    setQIdx((prev) => {
      const next = prev + 1;
      if (next >= questions.length) {
        setQuestions(buildShuffledQuestions());
        return 0;
      }
      return next;
    });
  }, [questions.length]);

  const restartSprint = useCallback(() => {
    if (nextTimeoutRef.current) window.clearTimeout(nextTimeoutRef.current);
    sound.playClick();
    setQuestions(buildShuffledQuestions());
    setQIdx(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setTimeLeft(TOTAL_TIME);
    setSelectedOpt(null);
    setFeedbackBanner(null);
    setScoreSaved(false);
    setStatus('playing');
    traceProgressRef.current = 0;
    particlesRef.current = [];
  }, []);

  const handleSelectOption = useCallback(
    (idx: number) => {
      if (status !== 'playing' || selectedOpt !== null) return;
      setSelectedOpt(idx);
      setAnsweredCount((c) => c + 1);
      const isRight = idx === currentQ.correctIndex;

      if (isRight) {
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setBestStreak((b) => Math.max(b, nextStreak));
        setCorrectCount((c) => c + 1);

        const mult = Math.min(4, 1 + Math.floor((nextStreak - 1) / 2));
        const pts = 100 * mult;
        setScore((s) => s + pts);

        let bonusStr: string | undefined;
        if (nextStreak % 3 === 0) {
          setTimeLeft((t) => Math.min(TOTAL_TIME, t + 3));
          bonusStr = '+3 Detik Bonus!';
        }

        sound.playCtCorrect();
        triggerParticles(true);
        setFeedbackBanner({
          ok: true,
          text: `+${pts} Poin! ${currentQ.explanation}`,
          bonus: bonusStr,
        });
      } else {
        setStreak(0);
        setTimeLeft((t) => Math.max(0, t - 2));
        sound.playCtWrong();
        triggerParticles(false);
        setFeedbackBanner({
          ok: false,
          text: currentQ.explanation,
          bonus: '-2 Detik',
        });
      }

      if (nextTimeoutRef.current) window.clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = window.setTimeout(() => {
        advanceQuestion();
      }, isRight ? 1050 : 1850);
    },
    [advanceQuestion, currentQ, selectedOpt, status, streak, triggerParticles]
  );

  // Timer loop
  useEffect(() => {
    if (status !== 'playing') return;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          if (nextTimeoutRef.current) window.clearTimeout(nextTimeoutRef.current);
          sound.playGameOver();
          setStatus('gameover');
          return 0;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [status]);

  // Cleanup pending advance timeout on unmount
  useEffect(() => {
    return () => {
      if (nextTimeoutRef.current) window.clearTimeout(nextTimeoutRef.current);
    };
  }, []);

  // Keyboard shortcuts (1-4 answer, P pause, R restart)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'p' || k === 'escape') {
        if (status === 'playing') {
          sound.playClick();
          setStatus('paused');
        } else if (status === 'paused') {
          sound.playClick();
          setStatus('playing');
        }
        return;
      }
      if (k === 'r') {
        restartSprint();
        return;
      }
      if (status === 'playing' && selectedOpt === null && ['1', '2', '3', '4'].includes(k)) {
        handleSelectOption(Number(k) - 1);
      } else if (status === 'playing' && selectedOpt !== null && (k === ' ' || k === 'enter')) {
        e.preventDefault();
        if (nextTimeoutRef.current) window.clearTimeout(nextTimeoutRef.current);
        advanceQuestion();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advanceQuestion, handleSelectOption, restartSprint, selectedOpt, status]);

  // Live Animated Parabola Graph Canvas (60fps)
  useEffect(() => {
    let rafId = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (status === 'playing') {
        traceProgressRef.current = Math.min(1, traceProgressRef.current + dt * 2.1);
        shakeRef.current = Math.max(0, shakeRef.current - dt * 36);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(260, Math.floor(rect.width));
        const h = Math.max(170, Math.floor(rect.height));
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);

          if (shakeRef.current > 0.2) {
            ctx.translate(
              (Math.random() - 0.5) * shakeRef.current,
              (Math.random() - 0.5) * shakeRef.current
            );
          }

          ctx.fillStyle = '#FCF9F2';
          ctx.fillRect(0, 0, w, h);

          const g = currentQ.graph || { a: -0.5, b: 3, c: 1, xMin: -1, xMax: 8, yMin: -2, yMax: 7 };
          const xMin = g.xMin ?? -1;
          const xMax = g.xMax ?? 8;
          const yMin = g.yMin ?? -2;
          const yMax = g.yMax ?? 8;

          const padL = 32;
          const padR = 16;
          const padT = 16;
          const padB = 24;
          const pw = w - padL - padR;
          const ph = h - padT - padB;

          const mapX = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * pw;
          const mapY = (y: number) => padT + ph - ((y - yMin) / (yMax - yMin)) * ph;

          // Grid lines
          ctx.lineWidth = 1;
          for (let gx = Math.ceil(xMin); gx <= Math.floor(xMax); gx++) {
            const sx = mapX(gx);
            ctx.strokeStyle = gx === 0 ? '#13293D' : 'rgba(29, 99, 220, 0.12)';
            ctx.lineWidth = gx === 0 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(sx, padT);
            ctx.lineTo(sx, padT + ph);
            ctx.stroke();
          }
          for (let gy = Math.ceil(yMin); gy <= Math.floor(yMax); gy++) {
            const sy = mapY(gy);
            ctx.strokeStyle = gy === 0 ? '#13293D' : 'rgba(29, 99, 220, 0.12)';
            ctx.lineWidth = gy === 0 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(padL, sy);
            ctx.lineTo(padL + pw, sy);
            ctx.stroke();
          }

          // Axis numbers along x=0 and y=0
          ctx.fillStyle = '#5B738A';
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const axisY0 = Math.min(padT + ph - 12, Math.max(padT + 2, mapY(0)));
          for (let gx = Math.ceil(xMin); gx <= Math.floor(xMax); gx += 2) {
            if (gx === 0) continue;
            ctx.fillText(String(gx), mapX(gx), axisY0 + 4);
          }

          // Vertex & Axis of symmetry
          const xp = -g.b / (2 * g.a);
          const yp = g.a * xp * xp + g.b * xp + g.c;

          if (g.highlightVertex) {
            ctx.save();
            ctx.strokeStyle = 'rgba(29, 99, 220, 0.35)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(mapX(xp), padT);
            ctx.lineTo(mapX(xp), padT + ph);
            ctx.stroke();
            ctx.restore();
          }

          // Animated Quadratic Curve Sweep
          const drawMaxX = xMin + (xMax - xMin) * traceProgressRef.current;
          ctx.save();
          ctx.strokeStyle = g.a > 0 ? '#10B981' : '#1D63DC';
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          let started = false;
          for (let x = xMin; x <= drawMaxX; x += 0.06) {
            const y = g.a * x * x + g.b * x + g.c;
            if (y < yMin - 1 || y > yMax + 1) {
              started = false;
              continue;
            }
            const sx = mapX(x);
            const sy = mapY(y);
            if (!started) {
              ctx.moveTo(sx, sy);
              started = true;
            } else {
              ctx.lineTo(sx, sy);
            }
          }
          ctx.stroke();
          ctx.restore();

          // Highlight key points
          if (traceProgressRef.current > 0.65) {
            if (g.highlightVertex && yp >= yMin && yp <= yMax) {
              const vx = mapX(xp);
              const vy = mapY(yp);
              ctx.fillStyle = '#FF5A36';
              ctx.strokeStyle = '#13293D';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(vx, vy, 6.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              if (!g.hideEquation) {
                ctx.fillStyle = '#13293D';
                ctx.font = '700 10px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`P(${formatNum(xp, 1)}, ${formatNum(yp, 1)})`, vx, vy - 13);
              }
            }

            if (g.highlightYIntercept && g.c >= yMin && g.c <= yMax) {
              const cx = mapX(0);
              const cy = mapY(g.c);
              ctx.fillStyle = '#10B981';
              ctx.strokeStyle = '#13293D';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }

            if (g.highlightRoots) {
              const disc = g.b * g.b - 4 * g.a * g.c;
              if (disc >= -0.001) {
                const sqrtD = Math.sqrt(Math.max(0, disc));
                const r1 = (-g.b - sqrtD) / (2 * g.a);
                const r2 = (-g.b + sqrtD) / (2 * g.a);
                [r1, r2].forEach((r) => {
                  if (r >= xMin && r <= xMax) {
                    ctx.fillStyle = '#F59E0B';
                    ctx.strokeStyle = '#13293D';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(mapX(r), mapY(0), 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                  }
                });
              }
            }
          }

          // Update & draw burst particles in pixel coordinates
          const parts = particlesRef.current;
          for (let i = parts.length - 1; i >= 0; i--) {
            const pt = parts[i];
            if (pt.x <= 1 && pt.y <= 1) {
              pt.x = w * 0.5;
              pt.y = h * 0.5;
            }
            pt.life -= dt;
            if (pt.life <= 0) {
              parts.splice(i, 1);
              continue;
            }
            pt.vy += pt.gravity * dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.rotation += pt.vRot * dt;

            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.rotation);
            ctx.fillStyle = pt.color;
            if (pt.shape === 'square') {
              ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
            } else {
              ctx.beginPath();
              ctx.arc(0, 0, pt.size * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [currentQ, status]);

  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (scoreSaved) return;
    saveHighScore({
      name: playerName || 'Master CT X',
      score,
      mode: 'ct-sprint',
      stageOrAccuracy: `${accuracy}% Akurat`,
    });
    sound.playCtCorrect();
    setScoreSaved(true);
  };

  const timerPct = Math.max(0, Math.min(100, (timeLeft / TOTAL_TIME) * 100));

  return (
    <div className="min-h-screen blueprint-paper flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-[#FAF7F0]/95 backdrop-blur border-b-2 border-[#13293D] px-3 sm:px-5 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onBack();
              }}
              className="draft-btn bg-white px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
            </button>
            <div className="bg-[#1D63DC] text-white border-2 border-[#13293D] px-3 py-1 rounded-lg flex items-center gap-1.5 font-display font-bold text-xs sm:text-sm">
              <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300" />
              DEKODE CT SPRINT
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streak >= 2 && (
              <div className="bg-[#FF5A36] text-white border-2 border-[#13293D] px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 animate-pop-in">
                <Flame className="w-3.5 h-3.5 fill-yellow-300" /> {streak}x
              </div>
            )}
            <div className="draft-card-sm px-3 py-1 rounded-lg flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#F59E0B]" />
              <span className="font-mono-math font-extrabold text-sm sm:text-base">{score}</span>
            </div>
            <button
              onClick={() => {
                setMuted(sound.toggleMute());
              }}
              className="draft-btn bg-white p-1.5 sm:p-2 rounded-lg"
            >
              {muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                if (status === 'gameover') return;
                sound.playClick();
                setStatus((s) => (s === 'paused' ? 'playing' : 'paused'));
              }}
              className="draft-btn bg-[#F59E0B] p-1.5 sm:p-2 rounded-lg"
              title="Jeda (P)"
            >
              {status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-5 py-4 flex flex-col gap-3.5 relative">
        {/* Juicy 60s Timer Bar */}
        <div className="draft-card rounded-xl p-2.5 flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono-math font-extrabold text-sm min-w-[68px]">
            <Clock
              className={`w-4 h-4 ${
                timeLeft <= 12 ? 'text-[#FF5A36] animate-bounce' : 'text-[#1D63DC]'
              }`}
            />
            <span className={timeLeft <= 12 ? 'text-[#FF5A36]' : 'text-[#13293D]'}>
              {timeLeft.toFixed(1)}s
            </span>
          </div>
          <div className="flex-1 h-3.5 bg-slate-200 rounded-full border-2 border-[#13293D] overflow-hidden">
            <div
              className={`h-full transition-all duration-100 rounded-full ${
                timeLeft <= 12 ? 'bg-[#FF5A36]' : timeLeft <= 25 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
              }`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
          <div className="text-[11px] font-bold text-slate-500 hidden sm:block">
            3 Streak = <span className="text-[#059669]">+3 detik!</span>
          </div>
        </div>

        {/* Main Problem Card with Live Animated Parabola */}
        <div className="draft-card rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border-2 border-[#13293D] ${
                  PILLAR_COLORS[currentQ.pillar]
                }`}
              >
                Pilar CT: {currentQ.pillar}
              </span>
              <span className="text-xs font-bold bg-[#FAF7F0] border border-[#13293D]/25 px-2.5 py-1 rounded-lg">
                {currentQ.contextBadge}
              </span>
            </div>
            <span className="text-xs font-mono-math font-bold text-slate-500">
              Soal #{answeredCount + (selectedOpt === null ? 1 : 0)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Live Graph Preview */}
            <div className="md:col-span-5 rounded-xl border-2 border-[#13293D] overflow-hidden bg-[#FCF9F2] h-[185px] sm:h-[215px]">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            {/* Question Prompt & Options */}
            <div className="md:col-span-7 space-y-3">
              <h2 className="text-base sm:text-lg font-display font-bold text-[#13293D] leading-snug">
                {currentQ.prompt}
              </h2>

              <div className="grid grid-cols-1 gap-2">
                {currentQ.options.map((opt, idx) => {
                  const answered = selectedOpt !== null;
                  const isCorrect = idx === currentQ.correctIndex;
                  const isChosen = idx === selectedOpt;
                  let btnClass = 'bg-white hover:bg-[#FAF7F0] text-[#13293D]';
                  if (answered) {
                    if (isCorrect) btnClass = 'bg-[#10B981] text-white';
                    else if (isChosen) btnClass = 'bg-[#FF5A36] text-white';
                    else btnClass = 'bg-slate-100 text-slate-400';
                  }

                  return (
                    <button
                      key={idx}
                      disabled={answered || status !== 'playing'}
                      onClick={() => handleSelectOption(idx)}
                      className={`draft-btn rounded-xl px-3.5 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center gap-2.5 ${btnClass}`}
                    >
                      <span className="shrink-0 w-6 h-6 rounded-md bg-black/10 font-mono-math text-xs font-extrabold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Instant CT Explanation Feedback */}
          {feedbackBanner && (
            <div
              className={`rounded-xl border-2 border-[#13293D] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-semibold animate-pop-in ${
                feedbackBanner.ok
                  ? 'bg-[#10B981]/15 text-[#065F46]'
                  : 'bg-[#FF5A36]/15 text-[#9F1239]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                {feedbackBanner.text}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {feedbackBanner.bonus && (
                  <span className="font-mono-math font-extrabold px-2 py-0.5 rounded bg-white border border-[#13293D]">
                    {feedbackBanner.bonus}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (nextTimeoutRef.current) window.clearTimeout(nextTimeoutRef.current);
                    sound.playClick();
                    advanceQuestion();
                  }}
                  className="draft-btn bg-white text-[#13293D] text-xs font-extrabold px-2.5 py-1 rounded-lg"
                >
                  Lanjut →
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          Tips cepat: Gunakan tombol angka <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono-math">1</kbd>–
          <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono-math">4</kbd> di keyboard untuk menjawab super kilat!
        </p>

        {/* PAUSE MODAL */}
        {status === 'paused' && (
          <div className="fixed inset-0 z-40 bg-[#13293D]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="draft-card rounded-2xl p-6 max-w-sm w-full text-center space-y-4 animate-pop-in">
              <h2 className="text-2xl font-display font-bold">Dekode CT Dijeda</h2>
              <p className="text-xs text-slate-600">
                Latih 4 Pilar Computational Thinking: Dekomposisi, Pengenalan Pola, Abstraksi, & Algoritma!
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    sound.playClick();
                    setStatus('playing');
                  }}
                  className="draft-btn bg-[#10B981] text-white font-display font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" /> Lanjutkan
                </button>
                <button
                  onClick={restartSprint}
                  className="draft-btn bg-[#FAF7F0] text-[#13293D] font-display font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Ulangi 60 Detik
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onBack();
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-[#13293D] pt-1"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GAME OVER MODAL */}
        {status === 'gameover' && (
          <div className="fixed inset-0 z-40 bg-[#13293D]/70 backdrop-blur-[3px] flex items-center justify-center p-4">
            <div className="draft-card rounded-2xl p-6 max-w-md w-full text-center space-y-4 animate-pop-in">
              <div>
                <span className="inline-block text-xs font-extrabold uppercase tracking-wider bg-[#1D63DC] text-white px-2.5 py-0.5 rounded-full border border-[#13293D]">
                  Waktu Habis!
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-bold mt-1.5">
                  Hasil Dekode CT
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2.5">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Skor</div>
                  <div className="font-mono-math text-xl font-extrabold text-[#1D63DC]">{score}</div>
                </div>
                <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2.5">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Akurasi</div>
                  <div className="font-mono-math text-xl font-extrabold text-[#059669]">
                    {accuracy}%
                  </div>
                </div>
                <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2.5">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Streak Max</div>
                  <div className="font-mono-math text-xl font-extrabold text-[#FF5A36]">
                    {bestStreak}x
                  </div>
                </div>
              </div>

              {isTopScore('ct-sprint', score) && !scoreSaved ? (
                <form onSubmit={handleSaveScore} className="space-y-2 text-left">
                  <label className="text-xs font-bold text-[#059669] flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> Rekor Baru Dekode CT! Simpan namamu:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={18}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Nama / Kelas (mis. Dina X-3)"
                      className="flex-1 px-3 py-2 text-sm font-semibold rounded-xl border-2 border-[#13293D] bg-white focus:outline-none focus:ring-2 focus:ring-[#1D63DC]"
                    />
                    <button
                      type="submit"
                      className="draft-btn bg-[#10B981] text-white font-bold text-xs px-3.5 py-2 rounded-xl"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              ) : scoreSaved ? (
                <div className="text-xs font-bold text-[#059669] bg-[#10B981]/10 border border-[#10B981]/40 rounded-xl py-2 px-3">
                  Skor berhasil dicatat di Papan Skor Lokal!
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  onClick={restartSprint}
                  className="flex-1 draft-btn bg-[#1D63DC] text-white font-display font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> MAIN LAGI!
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onShowScores();
                  }}
                  className="draft-btn bg-[#FAF7F0] text-[#13293D] font-display font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 text-sm"
                >
                  <Trophy className="w-4 h-4 text-[#F59E0B]" /> Papan Skor
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
