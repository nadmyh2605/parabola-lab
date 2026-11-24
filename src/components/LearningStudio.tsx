import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Cpu,
  Gamepad2,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { LEARNING_SCENARIOS } from '../data/ctContent';
import { formatNum, formatSigned } from '../data/stageGenerator';
import { CtPillar } from '../types/game';
import { sound } from '../utils/sound';

interface LearningStudioProps {
  onBack: () => void;
  onPlayArcade: () => void;
  onPlayCtSprint: () => void;
}

const PILLAR_STYLES: Record<CtPillar, { bg: string; badge: string; num: string }> = {
  Dekomposisi: {
    bg: 'bg-[#FF5A36]/5',
    badge: 'bg-[#FF5A36] text-white',
    num: '01',
  },
  'Pengenalan Pola': {
    bg: 'bg-[#1D63DC]/5',
    badge: 'bg-[#1D63DC] text-white',
    num: '02',
  },
  Abstraksi: {
    bg: 'bg-[#8B5CF6]/5',
    badge: 'bg-[#8B5CF6] text-white',
    num: '03',
  },
  Algoritma: {
    bg: 'bg-[#10B981]/5',
    badge: 'bg-[#10B981] text-white',
    num: '04',
  },
};

export const LearningStudio: React.FC<LearningStudioProps> = ({
  onBack,
  onPlayArcade,
  onPlayCtSprint,
}) => {
  const [scenarioIdx, setScenarioIdx] = useState<number>(0);
  const scenario = LEARNING_SCENARIOS[scenarioIdx];

  const [a, setA] = useState<number>(scenario.defaultA);
  const [b, setB] = useState<number>(scenario.defaultB);
  const [c, setC] = useState<number>(scenario.defaultC);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectScenario = (idx: number) => {
    sound.playClick();
    const s = LEARNING_SCENARIOS[idx];
    setScenarioIdx(idx);
    setA(s.defaultA);
    setB(s.defaultB);
    setC(s.defaultC);
  };

  const resetSliders = () => {
    sound.playClick();
    setA(scenario.defaultA);
    setB(scenario.defaultB);
    setC(scenario.defaultC);
  };

  // Compute exact Grade X Quadratic properties
  const safeA = Math.abs(a) < 0.02 ? (a >= 0 ? 0.05 : -0.05) : a;
  const xp = -b / (2 * safeA);
  const yp = safeA * xp * xp + b * xp + c;
  const disc = b * b - 4 * safeA * c;

  let rootsText = 'Tidak memotong sumbu-X (Imajiner)';
  if (Math.abs(disc) < 0.05) {
    rootsText = `Menyinggung di x = ${formatNum(xp, 2)}`;
  } else if (disc > 0) {
    const r1 = (-b - Math.sqrt(disc)) / (2 * safeA);
    const r2 = (-b + Math.sqrt(disc)) / (2 * safeA);
    const left = Math.min(r1, r2);
    const right = Math.max(r1, r2);
    rootsText = `x₁ = ${formatNum(left, 2)},  x₂ = ${formatNum(right, 2)}`;
  }

  // Animated 60fps Interactive Graph Canvas
  useEffect(() => {
    let rafId = 0;
    let t = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(280, Math.floor(rect.width));
        const h = Math.max(220, Math.floor(rect.height));
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);

          ctx.fillStyle = '#FCF9F2';
          ctx.fillRect(0, 0, w, h);

          const xMin = -1;
          const xMax = 11;
          const yMin = scenario.id === 'profit' ? -5 : -2;
          const yMax = 10;

          const padL = 38;
          const padR = 18;
          const padT = 18;
          const padB = 28;
          const pw = w - padL - padR;
          const ph = h - padT - padB;

          const mapX = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * pw;
          const mapY = (y: number) => padT + ph - ((y - yMin) / (yMax - yMin)) * ph;

          // Blueprint grid
          for (let gx = xMin; gx <= xMax; gx++) {
            const sx = mapX(gx);
            ctx.strokeStyle = gx === 0 ? '#13293D' : 'rgba(29, 99, 220, 0.12)';
            ctx.lineWidth = gx === 0 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(sx, padT);
            ctx.lineTo(sx, padT + ph);
            ctx.stroke();
          }
          for (let gy = yMin; gy <= yMax; gy++) {
            const sy = mapY(gy);
            ctx.strokeStyle = gy === 0 ? '#13293D' : 'rgba(29, 99, 220, 0.12)';
            ctx.lineWidth = gy === 0 ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(padL, sy);
            ctx.lineTo(padL + pw, sy);
            ctx.stroke();
          }

          // River strip for bridge or Profit/Loss zone shading
          const yZero = mapY(0);
          if (scenario.id === 'bridge') {
            ctx.fillStyle = 'rgba(29, 99, 220, 0.14)';
            ctx.fillRect(padL, yZero, pw, padT + ph - yZero);
            ctx.fillStyle = '#1D63DC';
            ctx.font = '700 10px "Space Grotesk", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('PERMUKAAN SUNGAI (y = 0)', padL + pw - 6, yZero + 14);
          } else if (scenario.id === 'profit') {
            // Shade green profit region where y > 0
            ctx.save();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
            ctx.beginPath();
            let inProfit = false;
            for (let x = 0; x <= xMax; x += 0.08) {
              const y = safeA * x * x + b * x + c;
              if (y > 0) {
                if (!inProfit) {
                  ctx.moveTo(mapX(x), yZero);
                  inProfit = true;
                }
                ctx.lineTo(mapX(x), mapY(Math.min(yMax, y)));
              } else if (inProfit) {
                ctx.lineTo(mapX(x), yZero);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                inProfit = false;
              }
            }
            if (inProfit) {
              ctx.lineTo(mapX(xMax), yZero);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          }

          // Axis tick labels
          ctx.fillStyle = '#526B82';
          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          for (let gx = 0; gx <= xMax; gx += 2) {
            ctx.fillText(String(gx), mapX(gx), Math.min(padT + ph + 6, yZero + 5));
          }
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          for (let gy = yMin; gy <= yMax; gy += 2) {
            if (gy === 0) continue;
            ctx.fillText(String(gy), padL - 6, mapY(gy));
          }

          // Axis of symmetry dashed line x = xp
          if (xp >= xMin && xp <= xMax) {
            ctx.save();
            ctx.strokeStyle = 'rgba(29, 99, 220, 0.4)';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(mapX(xp), padT);
            ctx.lineTo(mapX(xp), padT + ph);
            ctx.stroke();
            ctx.restore();
          }

          // Bridge vertical hangers
          if (scenario.id === 'bridge') {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.32)';
            ctx.lineWidth = 1.5;
            for (let hx = 0.5; hx <= 9.5; hx += 1) {
              const hy = safeA * hx * hx + b * hx + c;
              if (hy > 0 && hy < yMax) {
                ctx.beginPath();
                ctx.moveTo(mapX(hx), mapY(hy));
                ctx.lineTo(mapX(hx), yZero);
                ctx.stroke();
              }
            }
          }

          // Quadratic Curve
          ctx.save();
          ctx.strokeStyle = scenario.badgeColor;
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          let started = false;
          for (let x = xMin; x <= xMax; x += 0.06) {
            const y = safeA * x * x + b * x + c;
            if (y < yMin - 0.5 || y > yMax + 0.5) {
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

          // Animated moving object along the live curve (gives life to the real-world math!)
          const animX = ((t * 2.4) % 9.5);
          const animY = safeA * animX * animX + b * animX + c;
          if (animY >= yMin && animY <= yMax) {
            const ax = mapX(animX);
            const ay = mapY(animY);
            ctx.save();
            ctx.fillStyle = scenario.badgeColor;
            ctx.strokeStyle = '#13293D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ax, ay, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }

          // Highlight Y-Intercept (0, c)
          if (c >= yMin && c <= yMax) {
            const cx = mapX(0);
            const cy = mapY(c);
            ctx.fillStyle = '#10B981';
            ctx.strokeStyle = '#13293D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }

          // Highlight Roots (where y = 0)
          if (disc >= -0.04) {
            const sq = Math.sqrt(Math.max(0, disc));
            const roots = [(-b - sq) / (2 * safeA), (-b + sq) / (2 * safeA)];
            roots.forEach((r) => {
              if (r >= xMin && r <= xMax) {
                ctx.fillStyle = '#F59E0B';
                ctx.strokeStyle = '#13293D';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(mapX(r), yZero, 5.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
            });
          }

          // Highlight Vertex P(xp, yp)
          if (xp >= xMin && xp <= xMax && yp >= yMin && yp <= yMax) {
            const vx = mapX(xp);
            const vy = mapY(yp);
            ctx.fillStyle = '#FF5A36';
            ctx.strokeStyle = '#13293D';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(vx, vy, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            const tag = `P(${formatNum(xp, 1)}, ${formatNum(yp, 1)})`;
            ctx.font = '700 10px "JetBrains Mono", monospace';
            const tw = ctx.measureText(tag).width + 12;
            const ty = safeA < 0 ? Math.max(padT + 14, vy - 18) : Math.min(padT + ph - 14, vy + 18);
            ctx.fillStyle = '#13293D';
            ctx.beginPath();
            ctx.roundRect(vx - tw / 2, ty - 9, tw, 18, 5);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tag, vx, ty);
          }

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [b, c, disc, safeA, scenario.badgeColor, scenario.id, xp, yp]);

  return (
    <div className="min-h-screen blueprint-paper flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-[#FAF7F0]/95 backdrop-blur border-b-2 border-[#13293D] px-3 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                sound.playClick();
                onBack();
              }}
              className="draft-btn bg-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Menu
            </button>
            <div>
              <h1 className="font-display font-bold text-sm sm:text-lg leading-tight flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#1D63DC]" />
                Materi Kontekstual CT: Fungsi Kuadrat Kelas X
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Kurikulum SMA / SMK / MA — Pendekatan Computational Thinking dalam Kehidupan Sehari-hari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onPlayCtSprint();
              }}
              className="draft-btn bg-[#1D63DC] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" /> Mini-Game CT
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onPlayArcade();
              }}
              className="draft-btn bg-[#FF5A36] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Gamepad2 className="w-3.5 h-3.5" /> Main Game!
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-5 space-y-5">
        {/* 4 Daily-Life Scenario Selector Pills */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {LEARNING_SCENARIOS.map((sc, idx) => {
            const active = idx === scenarioIdx;
            return (
              <button
                key={sc.id}
                onClick={() => selectScenario(idx)}
                className={`draft-btn rounded-xl p-3 text-left transition-all ${
                  active ? 'bg-[#13293D] text-white' : 'bg-white text-[#13293D]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{sc.emoji}</span>
                  <span
                    className={`text-[10px] font-mono-math font-bold px-1.5 py-0.5 rounded ${
                      active ? 'bg-white/20 text-white' : 'bg-[#FAF7F0] text-slate-600'
                    }`}
                  >
                    Kasus {idx + 1}
                  </span>
                </div>
                <div className="font-display font-bold text-xs sm:text-sm mt-1.5 leading-snug">
                  {sc.title}
                </div>
                <div
                  className={`text-[11px] mt-0.5 line-clamp-1 ${
                    active ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {sc.tagline}
                </div>
              </button>
            );
          })}
        </section>

        {/* Interactive Lab: Story + Live Sliders + Live Graph */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Live Animated Canvas + Analysis Readout */}
          <div className="lg:col-span-7 draft-card rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{scenario.emoji}</span>
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg leading-tight">
                    Lab Interaktif: {scenario.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {scenario.xLabel} vs {scenario.yLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={resetSliders}
                className="draft-btn bg-[#FAF7F0] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            <div className="rounded-xl border-2 border-[#13293D] overflow-hidden h-[250px] sm:h-[290px] bg-[#FCF9F2]">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            {/* Live Legend & Computed Properties */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Sumbu Simetri</div>
                <div className="font-mono-math font-extrabold text-[#1D63DC] text-sm">
                  xp = {formatNum(xp, 2)}
                </div>
              </div>
              <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  {safeA < 0 ? 'Maksimum (yp)' : 'Minimum (yp)'}
                </div>
                <div className="font-mono-math font-extrabold text-[#FF5A36] text-sm">
                  yp = {formatNum(yp, 2)}
                </div>
              </div>
              <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Diskriminan D</div>
                <div className="font-mono-math font-extrabold text-[#13293D] text-sm">
                  D = {formatNum(disc, 2)}
                </div>
              </div>
              <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Sifat Grafik</div>
                <div className="font-bold text-[#059669] text-xs mt-0.5">
                  {safeA > 0 && disc < 0
                    ? 'Definit Positif!'
                    : safeA < 0 && disc < 0
                      ? 'Definit Negatif'
                      : disc > 0.05
                        ? 'Potong 2 Titik'
                        : 'Singgung 1 Titik'}
                </div>
              </div>
            </div>

            <div className="text-xs font-mono-math bg-[#13293D] text-white rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
              <span>
                f(x) = <strong className="text-[#FF8A70]">{formatNum(safeA, 2)}x²</strong>{' '}
                <strong className="text-[#7DD3FC]">{formatSigned(b, 2)}x</strong>{' '}
                <strong className="text-[#6EE7B7]">{formatSigned(c, 2)}</strong>
              </span>
              <span className="text-slate-300 text-[11px]">Akar: {rootsText}</span>
            </div>
          </div>

          {/* Right: Contextual Story + Tactile Sliders a, b, c */}
          <div className="lg:col-span-5 draft-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider bg-[#FAF7F0] border border-[#13293D]/25 px-2.5 py-1 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" /> Konteks Sehari-hari
              </div>
              <p className="text-sm text-[#13293D] leading-relaxed font-medium">
                {scenario.story}
              </p>
            </div>

            <div className="space-y-3.5 bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wide text-[#13293D]">
                <Sliders className="w-4 h-4 text-[#FF5A36]" /> Eksperimen Koefisien (Geser!)
              </div>

              {/* Slider a */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#FF5A36]">Koefisien a (Arah & Lebar)</span>
                  <span className="font-mono-math">{formatNum(a, 2)}</span>
                </div>
                <input
                  type="range"
                  min={scenario.minA}
                  max={scenario.maxA}
                  step={0.05}
                  value={a}
                  onChange={(e) => setA(Number(e.target.value))}
                  className="w-full accent-[#FF5A36] cursor-pointer"
                />
              </div>

              {/* Slider b */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#1D63DC]">Koefisien b (Geser Sumbu Simetri)</span>
                  <span className="font-mono-math">{formatNum(b, 2)}</span>
                </div>
                <input
                  type="range"
                  min={scenario.minB}
                  max={scenario.maxB}
                  step={0.1}
                  value={b}
                  onChange={(e) => setB(Number(e.target.value))}
                  className="w-full accent-[#1D63DC] cursor-pointer"
                />
              </div>

              {/* Slider c */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#059669]">Konstanta c (Posisi Awal di x = 0)</span>
                  <span className="font-mono-math">{formatNum(c, 2)}</span>
                </div>
                <input
                  type="range"
                  min={scenario.minC}
                  max={scenario.maxC}
                  step={0.1}
                  value={c}
                  onChange={(e) => setC(Number(e.target.value))}
                  className="w-full accent-[#10B981] cursor-pointer"
                />
              </div>
            </div>

            {/* Live Bridge Safety or Profit Insight Callout */}
            <div className="rounded-xl bg-[#1D63DC]/10 border-2 border-[#1D63DC]/30 p-3 text-xs text-[#13293D] leading-relaxed">
              <strong>Pengamatan CT Langsung:</strong>{' '}
              {scenario.id === 'bridge'
                ? yp > 0
                  ? `Tinggi terendah kabel yp = ${formatNum(yp, 2)} m (> 0) dan D < 0 → Kabel AMAN di atas permukaan sungai!`
                  : `Peringatan! yp = ${formatNum(yp, 2)} m (≤ 0) → Kabel menyentuh air sungai! Naikkan c atau ubah a.`
                : scenario.id === 'profit'
                  ? yp > 0
                    ? `Laba maksimum mencapai ${formatNum(yp, 1)} (×Rp10 rb) saat produksi x = ${formatNum(xp, 1)} (×10 paket)!`
                    : `Usaha masih merugi karena puncak yp ≤ 0! Coba naikkan b atau tekan biaya modal c.`
                  : `Puncak tertinggi terjadi pada jarak x = ${formatNum(xp, 2)} m dengan ketinggian maksimum ${formatNum(yp, 2)} m!`}
            </div>
          </div>
        </section>

        {/* 4 Pillars of Computational Thinking Applied to This Scenario */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#FF5A36]" />
            <h2 className="font-display font-bold text-lg sm:text-xl">
              Analisis 4 Pilar Computational Thinking (CT) — {scenario.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {scenario.pillars.map((item) => {
              const st = PILLAR_STYLES[item.pillar];
              return (
                <div
                  key={item.pillar}
                  className={`draft-card rounded-2xl p-4 flex flex-col justify-between gap-3 ${st.bg}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-[#13293D] ${st.badge}`}
                      >
                        {item.pillar}
                      </span>
                      <span className="font-mono-math font-extrabold text-xs text-slate-400">
                        #{st.num}
                      </span>
                    </div>
                    <p className="text-xs sm:text-[13px] text-[#13293D] leading-relaxed font-medium">
                      {item.description}
                    </p>
                  </div>
                  <div className="font-mono-math text-[11px] font-bold bg-white border border-[#13293D]/30 rounded-lg px-2.5 py-1.5 text-[#13293D]">
                    {item.formulaHint}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Formula Reference Card (Kelas X SMA/SMK/MA) */}
        <section className="draft-card rounded-2xl p-4 sm:p-5 bg-[#13293D] text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#F59E0B]">
                Rangkuman Inti Kelas X SMA/SMK/MA
              </span>
              <h3 className="font-display font-bold text-lg">
                Peta Rumus Cepat Fungsi Kuadrat
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 max-w-3xl">
              <div className="bg-white/10 border border-white/20 rounded-xl p-2.5">
                <div className="text-[10px] uppercase text-slate-300 font-bold">Bentuk Umum</div>
                <div className="font-mono-math font-bold text-xs sm:text-sm text-[#FF8A70] mt-0.5">
                  f(x) = ax²+bx+c
                </div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl p-2.5">
                <div className="text-[10px] uppercase text-slate-300 font-bold">Bentuk Puncak</div>
                <div className="font-mono-math font-bold text-xs sm:text-sm text-[#7DD3FC] mt-0.5">
                  a(x - xp)² + yp
                </div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl p-2.5">
                <div className="text-[10px] uppercase text-slate-300 font-bold">Sumbu Simetri</div>
                <div className="font-mono-math font-bold text-xs sm:text-sm text-[#6EE7B7] mt-0.5">
                  xp = -b / (2a)
                </div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl p-2.5">
                <div className="text-[10px] uppercase text-slate-300 font-bold">Diskriminan</div>
                <div className="font-mono-math font-bold text-xs sm:text-sm text-[#FDE047] mt-0.5">
                  D = b² - 4ac
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
