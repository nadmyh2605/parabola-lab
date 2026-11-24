import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Flame,
  Heart,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  computeParabolaFromVertex,
  evalParabola,
  formatNum,
  formatSigned,
  generateStage,
  ParabolaParams,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../data/stageGenerator';
import { buildShuffledQuestions } from '../data/ctContent';
import { CtQuestion, FloatingText, Particle, StageConfig } from '../types/game';
import { sound } from '../utils/sound';
import { getBestScore, isTopScore, saveHighScore } from '../utils/storage';

interface ParabolaGameProps {
  onBack: () => void;
  onOpenMateri: () => void;
  onShowScores: () => void;
}

type GamePhase = 'aiming' | 'flying' | 'celebrating' | 'ct-gate' | 'paused' | 'gameover';

interface HudState {
  score: number;
  bestScore: number;
  level: number;
  lives: number;
  maxLives: number;
  combo: number;
  bestCombo: number;
  ctSolved: number;
  phase: GamePhase;
  stage: StageConfig;
  parabola: ParabolaParams;
  attemptsOnStage: number;
  muted: boolean;
}

const MAX_LIVES = 3;

export const ParabolaGame: React.FC<ParabolaGameProps> = ({
  onBack,
  onOpenMateri,
  onShowScores,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Core mutable engine state kept in refs for silky 60fps with zero React lag
  const stageRef = useRef<StageConfig>(generateStage(1));
  const phaseRef = useRef<GamePhase>('aiming');
  const prevPhaseBeforePauseRef = useRef<GamePhase>('aiming');

  const xpRef = useRef<number>(stageRef.current.initialXp);
  const ypRef = useRef<number>(stageRef.current.initialYp);
  const cRef = useRef<number>(stageRef.current.launchY);

  const ghostRef = useRef<{ xp: number; yp: number; c: number } | null>(null);

  const scoreRef = useRef<number>(0);
  const livesRef = useRef<number>(MAX_LIVES);
  const comboRef = useRef<number>(0);
  const bestComboRef = useRef<number>(0);
  const ctSolvedRef = useRef<number>(0);
  const attemptsRef = useRef<number>(0);

  // Projectile flight state
  const projRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    vx: number;
    angle: number;
    spin: number;
    params: ParabolaParams;
    trail: { x: number; y: number }[];
    starsHitThisShot: number;
  }>({
    active: false,
    x: 0,
    y: 2,
    vx: 8.5,
    angle: 0,
    spin: 0,
    params: computeParabolaFromVertex(4.5, 5.4, 2),
    trail: [],
    starsHitThisShot: 0,
  });

  // Timers & Juice
  const timeRef = useRef<number>(0);
  const celebrateTimerRef = useRef<number>(0);
  const hitStopRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Input refs
  const keysRef = useRef<Record<string, boolean>>({});
  const dragModeRef = useRef<'none' | 'vertex' | 'launch'>('none');

  // CT Flash Gate state
  const ctDeckRef = useRef<CtQuestion[]>(buildShuffledQuestions());
  const ctDeckIdxRef = useRef<number>(0);
  const [activeCtGate, setActiveCtGate] = useState<CtQuestion | null>(null);
  const [ctChoiceIdx, setCtChoiceIdx] = useState<number | null>(null);

  // High-score form state on Game Over
  const [playerName, setPlayerName] = useState<string>('');
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);
  const [showControlsHint, setShowControlsHint] = useState<boolean>(false);

  // HUD snapshot state synced on meaningful events or throttled during aim
  const [hud, setHud] = useState<HudState>(() => {
    const s = stageRef.current;
    return {
      score: 0,
      bestScore: getBestScore('arcade'),
      level: s.level,
      lives: MAX_LIVES,
      maxLives: MAX_LIVES,
      combo: 0,
      bestCombo: 0,
      ctSolved: 0,
      phase: 'aiming',
      stage: s,
      parabola: computeParabolaFromVertex(s.initialXp, s.initialYp, s.launchY),
      attemptsOnStage: 0,
      muted: sound.isMuted(),
    };
  });

  const syncHud = useCallback(() => {
    setHud({
      score: scoreRef.current,
      bestScore: Math.max(getBestScore('arcade'), scoreRef.current),
      level: stageRef.current.level,
      lives: livesRef.current,
      maxLives: MAX_LIVES,
      combo: comboRef.current,
      bestCombo: bestComboRef.current,
      ctSolved: ctSolvedRef.current,
      phase: phaseRef.current,
      stage: stageRef.current,
      parabola: computeParabolaFromVertex(xpRef.current, ypRef.current, cRef.current),
      attemptsOnStage: attemptsRef.current,
      muted: sound.isMuted(),
    });
  }, []);

  // Coordinate mapping helper stored in ref so pointer events match canvas transform exactly
  const layoutRef = useRef({
    width: 800,
    height: 500,
    padLeft: 44,
    padRight: 20,
    padTop: 22,
    padBottom: 34,
  });

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const { width, height, padLeft, padRight, padTop, padBottom } = layoutRef.current;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const sx = padLeft + (wx / WORLD_WIDTH) * plotW;
    const sy = padTop + plotH - (wy / WORLD_HEIGHT) * plotH;
    return { sx, sy };
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { width, height, padLeft, padRight, padTop, padBottom } = layoutRef.current;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const wx = ((sx - padLeft) / plotW) * WORLD_WIDTH;
    const wy = ((padTop + plotH - sy) / plotH) * WORLD_HEIGHT;
    return { wx, wy };
  }, []);

  const clampVertex = useCallback((wx: number, wy: number, stage: StageConfig, currentC: number) => {
    const nx = Math.max(1.8, Math.min(12.8, wx));
    let ny = wy;
    if (stage.curveMode === 'down') {
      ny = Math.max(currentC + 0.65, Math.min(9.55, wy));
    } else {
      ny = Math.max(0.75, Math.min(currentC - 0.8, wy));
    }
    return { nx, ny };
  }, []);

  const spawnBurst = useCallback(
    (
      wx: number,
      wy: number,
      count: number,
      colors: string[],
      speedScale = 4.5,
      gravity = -8,
      ring = false
    ) => {
      const list = particlesRef.current;
      if (ring) {
        list.push({
          x: wx,
          y: wy,
          vx: 0,
          vy: 0,
          size: 0.25,
          color: colors[0],
          life: 0.45,
          maxLife: 0.45,
          shape: 'ring',
          gravity: 0,
          rotation: 0,
          vRot: 0,
        });
      }
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = (0.45 + Math.random() * 0.85) * speedScale;
        const shapes: Particle['shape'][] = ['circle', 'square', 'star'];
        list.push({
          x: wx,
          y: wy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 0.1 + Math.random() * 0.16,
          color: colors[i % colors.length],
          life: 0.45 + Math.random() * 0.45,
          maxLife: 0.9,
          shape: shapes[i % shapes.length],
          gravity,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 10,
        });
      }
    },
    []
  );

  const spawnFloatingText = useCallback(
    (wx: number, wy: number, text: string, color: string, subtext?: string, scale = 1) => {
      floatingTextsRef.current.push({
        x: wx,
        y: wy,
        text,
        subtext,
        color,
        life: 1.25,
        maxLife: 1.25,
        scale,
      });
    },
    []
  );

  const loadLevel = useCallback(
    (levelNum: number) => {
      const nextStage = generateStage(levelNum);
      stageRef.current = nextStage;
      xpRef.current = nextStage.initialXp;
      ypRef.current = nextStage.initialYp;
      cRef.current = nextStage.launchY;
      ghostRef.current = null;
      attemptsRef.current = 0;
      projRef.current.active = false;
      projRef.current.trail = [];
      phaseRef.current = 'aiming';
      syncHud();
    },
    [syncHud]
  );

  const restartGame = useCallback(() => {
    sound.playClick();
    scoreRef.current = 0;
    livesRef.current = MAX_LIVES;
    comboRef.current = 0;
    bestComboRef.current = 0;
    ctSolvedRef.current = 0;
    particlesRef.current = [];
    floatingTextsRef.current = [];
    setActiveCtGate(null);
    setCtChoiceIdx(null);
    setScoreSaved(false);
    loadLevel(1);
  }, [loadLevel]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'gameover' || phaseRef.current === 'ct-gate') return;
    sound.playClick();
    if (phaseRef.current === 'paused') {
      phaseRef.current = prevPhaseBeforePauseRef.current;
    } else {
      prevPhaseBeforePauseRef.current = phaseRef.current;
      phaseRef.current = 'paused';
    }
    syncHud();
  }, [syncHud]);

  const launchShot = useCallback(() => {
    if (phaseRef.current !== 'aiming') return;
    const stage = stageRef.current;
    const params = computeParabolaFromVertex(xpRef.current, ypRef.current, cRef.current);

    // Reset star collection for this shot
    stage.stars.forEach((st) => {
      st.collected = false;
    });

    attemptsRef.current += 1;
    phaseRef.current = 'flying';

    // Horizontal speed tuned so flight lasts an exciting ~1.15 - 1.5 seconds
    const vx = stage.curveMode === 'up' ? 8.2 : 8.8;
    const slope0 = 2 * params.a * 0 + params.b;

    projRef.current = {
      active: true,
      x: 0.05,
      y: evalParabola(params, 0.05),
      vx,
      angle: Math.atan2(slope0, 1),
      spin: 0,
      params,
      trail: [{ x: 0.05, y: evalParabola(params, 0.05) }],
      starsHitThisShot: 0,
    };

    sound.playLaunch(stage.curveMode === 'up');
    spawnBurst(0.2, cRef.current, 10, ['#FF5A36', '#F59E0B', '#1D63DC'], 3.2, -4, false);
    syncHud();
  }, [spawnBurst, syncHud]);

  const getCurrentTargetPos = useCallback((stage: StageConfig, t: number) => {
    let tx = stage.targetX;
    let ty = stage.targetY;
    if (stage.targetMoving) {
      const offset = Math.sin(t * stage.targetMoving.speed) * stage.targetMoving.amplitude;
      if (stage.targetMoving.axis === 'y') {
        ty = Math.max(1.2, Math.min(8.8, ty + offset));
      } else {
        tx = Math.max(stage.initialXp + 2.5, Math.min(14.8, tx + offset));
      }
    }
    return { tx, ty };
  }, []);

  const triggerMiss = useCallback(
    (wx: number, wy: number, reasonText: string) => {
      sound.playBounce();
      shakeRef.current = 11;
      spawnBurst(wx, wy, 18, ['#FF5A36', '#13293D', '#94A3B8'], 4.2, -9, true);
      spawnFloatingText(wx, Math.min(8.6, Math.max(1.5, wy + 0.5)), reasonText, '#E11D48', '-1 Energi', 1.0);

      // Save ghost parabola so player can visually debug & iterate (CT Algorithm!)
      ghostRef.current = {
        xp: xpRef.current,
        yp: ypRef.current,
        c: cRef.current,
      };

      projRef.current.active = false;
      comboRef.current = 0;
      livesRef.current -= 1;

      if (livesRef.current <= 0) {
        phaseRef.current = 'gameover';
        sound.playGameOver();
      } else {
        phaseRef.current = 'aiming';
      }
      syncHud();
    },
    [spawnBurst, spawnFloatingText, syncHud]
  );

  const triggerHit = useCallback(
    (tx: number, ty: number) => {
      const stage = stageRef.current;
      projRef.current.active = false;
      phaseRef.current = 'celebrating';
      celebrateTimerRef.current = 1.12;
      hitStopRef.current = 0.045;
      shakeRef.current = 10;

      comboRef.current += 1;
      if (comboRef.current > bestComboRef.current) {
        bestComboRef.current = comboRef.current;
      }

      const basePts = 100;
      const firstTryBonus = attemptsRef.current === 1 ? 75 : 0;
      const starBonus = projRef.current.starsHitThisShot * 50;
      const blindBonus = stage.symmetryBlind ? 80 : 0;
      const multiplier = Math.min(4, 1 + Math.floor((comboRef.current - 1) / 2));
      const gained = (basePts + firstTryBonus + starBonus + blindBonus) * multiplier;

      scoreRef.current += gained;
      sound.playTargetHit(comboRef.current);

      const themePalette: Record<StageConfig['theme'], string[]> = {
        basket: ['#FF5A36', '#F59E0B', '#10B981', '#1D63DC'],
        fountain: ['#1D63DC', '#38BDF8', '#10B981', '#F59E0B'],
        bridge: ['#10B981', '#F59E0B', '#1D63DC', '#FF5A36'],
        rocket: ['#FF5A36', '#F59E0B', '#6366F1', '#10B981'],
        profit: ['#F59E0B', '#10B981', '#FF5A36', '#1D63DC'],
      };

      spawnBurst(tx, ty, 36, themePalette[stage.theme], 6.4, -7.5, true);

      const subParts: string[] = [];
      if (firstTryBonus > 0) subParts.push('1ST TRY!');
      if (multiplier > 1) subParts.push(`COMBO x${multiplier}!`);
      if (blindBonus > 0) subParts.push('SIMETRI CT!');

      const mainLabel =
        stage.theme === 'basket'
          ? `SWISH! +${gained}`
          : stage.theme === 'bridge'
            ? `KABEL AMAN! +${gained}`
            : `TEPAT! +${gained}`;

      spawnFloatingText(
        Math.min(13.2, tx),
        Math.min(8.4, ty + 0.9),
        mainLabel,
        '#059669',
        subParts.join(' • '),
        1.15
      );
      syncHud();
    },
    [spawnBurst, spawnFloatingText, syncHud]
  );

  // Advance after celebration -> maybe trigger CT Flash Gate every 3 levels
  const finishCelebration = useCallback(() => {
    const completedLevel = stageRef.current.level;
    if (completedLevel % 3 === 0) {
      // Pull next CT question
      if (ctDeckIdxRef.current >= ctDeckRef.current.length) {
        ctDeckRef.current = buildShuffledQuestions();
        ctDeckIdxRef.current = 0;
      }
      const nextQ = ctDeckRef.current[ctDeckIdxRef.current++];
      phaseRef.current = 'ct-gate';
      setCtChoiceIdx(null);
      setActiveCtGate(nextQ);
      syncHud();
    } else {
      loadLevel(completedLevel + 1);
    }
  }, [loadLevel, syncHud]);

  const handleCtGateAnswer = useCallback(
    (choiceIndex: number) => {
      if (!activeCtGate || ctChoiceIdx !== null) return;
      setCtChoiceIdx(choiceIndex);
      const isRight = choiceIndex === activeCtGate.correctIndex;
      if (isRight) {
        sound.playCtCorrect();
        scoreRef.current += 150;
        ctSolvedRef.current += 1;
        if (livesRef.current < MAX_LIVES) {
          livesRef.current += 1;
        }
        spawnBurst(8, 5, 28, ['#10B981', '#F59E0B', '#1D63DC'], 6, -5, true);
      } else {
        sound.playCtWrong();
      }
      syncHud();
    },
    [activeCtGate, ctChoiceIdx, spawnBurst, syncHud]
  );

  const continueFromCtGate = useCallback(() => {
    sound.playClick();
    const nextLvl = stageRef.current.level + 1;
    setActiveCtGate(null);
    setCtChoiceIdx(null);
    loadLevel(nextLvl);
  }, [loadLevel]);

  // Keyboard Listeners (WASD / Arrows / Q-E / Space / P / R / 1-4 for CT Gate)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't hijack typing in high-score name input
      if (document.activeElement?.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter'].includes(key)
      ) {
        e.preventDefault();
      }

      if (phaseRef.current === 'ct-gate' && activeCtGate) {
        if (ctChoiceIdx === null && ['1', '2', '3', '4'].includes(key)) {
          handleCtGateAnswer(Number(key) - 1);
        } else if (ctChoiceIdx !== null && (key === ' ' || key === 'enter')) {
          continueFromCtGate();
        }
        return;
      }

      if (key === 'p' || key === 'escape') {
        togglePause();
        return;
      }

      if (key === 'r' && (phaseRef.current === 'aiming' || phaseRef.current === 'paused' || phaseRef.current === 'gameover')) {
        restartGame();
        return;
      }

      if (phaseRef.current === 'gameover' && key === 'enter') {
        restartGame();
        return;
      }

      if ((key === ' ' || key === 'enter') && phaseRef.current === 'aiming') {
        launchShot();
        return;
      }

      keysRef.current[key] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [activeCtGate, ctChoiceIdx, continueFromCtGate, handleCtGateAnswer, launchShot, restartGame, togglePause]);

  // Pointer (Mouse + Touch) Handlers for super tactile direct curve sculpting
  const getCanvasLocalPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { sx: 0, sy: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      sx: clientX - rect.left,
      sy: clientY - rect.top,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phaseRef.current !== 'aiming') return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const { sx, sy } = getCanvasLocalPos(e.clientX, e.clientY);
      const { wx, wy } = screenToWorld(sx, sy);
      const stage = stageRef.current;

      // Check if grabbing launch height c handle near x = 0
      if (stage.allowAdjustC && wx < 1.3 && Math.abs(wy - cRef.current) < 1.35) {
        dragModeRef.current = 'launch';
        const nextC = Math.max(stage.minC, Math.min(stage.maxC, wy));
        cRef.current = nextC;
        const clamped = clampVertex(xpRef.current, ypRef.current, stage, nextC);
        xpRef.current = clamped.nx;
        ypRef.current = clamped.ny;
        sound.playAimTick(nextC / WORLD_HEIGHT);
        syncHud();
        return;
      }

      // Otherwise grab/sculpt the vertex directly!
      dragModeRef.current = 'vertex';
      const clamped = clampVertex(wx, wy, stage, cRef.current);
      xpRef.current = clamped.nx;
      ypRef.current = clamped.ny;
      sound.playAimTick(clamped.ny / WORLD_HEIGHT);
      syncHud();
    },
    [clampVertex, getCanvasLocalPos, screenToWorld, syncHud]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (dragModeRef.current === 'none' || phaseRef.current !== 'aiming') return;
      const { sx, sy } = getCanvasLocalPos(e.clientX, e.clientY);
      const { wx, wy } = screenToWorld(sx, sy);
      const stage = stageRef.current;

      if (dragModeRef.current === 'launch' && stage.allowAdjustC) {
        const nextC = Math.max(stage.minC, Math.min(stage.maxC, wy));
        if (Math.abs(nextC - cRef.current) > 0.04) {
          cRef.current = nextC;
          const clamped = clampVertex(xpRef.current, ypRef.current, stage, nextC);
          xpRef.current = clamped.nx;
          ypRef.current = clamped.ny;
          sound.playAimTick(nextC / WORLD_HEIGHT);
        }
      } else if (dragModeRef.current === 'vertex') {
        const clamped = clampVertex(wx, wy, stage, cRef.current);
        if (Math.hypot(clamped.nx - xpRef.current, clamped.ny - ypRef.current) > 0.05) {
          xpRef.current = clamped.nx;
          ypRef.current = clamped.ny;
          sound.playAimTick(clamped.ny / WORLD_HEIGHT);
        }
      }
    },
    [clampVertex, getCanvasLocalPos, screenToWorld]
  );

  const handlePointerUp = useCallback(() => {
    if (dragModeRef.current !== 'none') {
      dragModeRef.current = 'none';
      syncHud();
    }
  }, [syncHud]);

  // Main 60fps Game Loop (Update + Render)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(220, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      layoutRef.current = {
        width: w,
        height: h,
        padLeft: w < 520 ? 32 : 44,
        padRight: w < 520 ? 14 : 22,
        padTop: w < 520 ? 18 : 22,
        padBottom: w < 520 ? 28 : 34,
      };
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const drawStar = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      outerR: number,
      innerR: number,
      fill: string,
      stroke: string,
      rot = 0
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = stroke;
      ctx.stroke();
      ctx.restore();
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const phase = phaseRef.current;
      const stage = stageRef.current;

      // Update simulation when not paused
      if (phase !== 'paused') {
        if (hitStopRef.current > 0) {
          hitStopRef.current -= dt;
        } else {
          timeRef.current += dt;
          shakeRef.current = Math.max(0, shakeRef.current - dt * 36);

          // Keyboard vertex steering during aiming
          if (phase === 'aiming') {
            const keys = keysRef.current;
            const fine = keys['shift'] ? 0.35 : 1;
            const speed = 5.4 * fine;
            let moved = false;

            let nx = xpRef.current;
            let ny = ypRef.current;
            let nc = cRef.current;

            if (keys['arrowleft'] || keys['a']) {
              nx -= speed * dt;
              moved = true;
            }
            if (keys['arrowright'] || keys['d']) {
              nx += speed * dt;
              moved = true;
            }
            if (keys['arrowup'] || keys['w']) {
              ny += speed * dt;
              moved = true;
            }
            if (keys['arrowdown'] || keys['s']) {
              ny -= speed * dt;
              moved = true;
            }
            if (stage.allowAdjustC) {
              if (keys['e']) {
                nc = Math.min(stage.maxC, nc + 3.2 * fine * dt);
                moved = true;
              }
              if (keys['q']) {
                nc = Math.max(stage.minC, nc - 3.2 * fine * dt);
                moved = true;
              }
            }

            if (moved) {
              cRef.current = nc;
              const clamped = clampVertex(nx, ny, stage, nc);
              xpRef.current = clamped.nx;
              ypRef.current = clamped.ny;
              sound.playAimTick(clamped.ny / WORLD_HEIGHT);
            }

            // Periodically sync HUD formula numbers while dragging or holding keys
            hudSyncAccum += dt;
            if ((moved || dragModeRef.current !== 'none') && hudSyncAccum > 0.065) {
              hudSyncAccum = 0;
              syncHud();
            }
          }

          // Update flying projectile along exact analytical parabola!
          if (phase === 'flying' && projRef.current.active) {
            const p = projRef.current;
            // Substep 3 times per frame for razor-accurate collision checks against stars, walls & target
            const substeps = 3;
            const subDt = dt / substeps;
            let resolved = false;

            for (let s = 0; s < substeps && !resolved; s++) {
              p.x += p.vx * subDt;
              p.y = evalParabola(p.params, p.x);
              const slope = 2 * p.params.a * p.x + p.params.b;
              p.angle = Math.atan2(slope, 1);
              p.spin += subDt * 9;

              if (s === substeps - 1) {
                p.trail.push({ x: p.x, y: p.y });
                if (p.trail.length > 36) p.trail.shift();

                // Emit subtle crisp trail particle
                if (Math.random() < 0.65) {
                  const trailColor =
                    stage.theme === 'fountain'
                      ? '#38BDF8'
                      : stage.theme === 'bridge'
                        ? '#10B981'
                        : stage.theme === 'profit'
                          ? '#F59E0B'
                          : '#FF5A36';
                  particlesRef.current.push({
                    x: p.x,
                    y: p.y,
                    vx: (Math.random() - 0.5) * 0.9,
                    vy: (Math.random() - 0.5) * 0.9,
                    size: 0.07 + Math.random() * 0.06,
                    color: trailColor,
                    life: 0.32,
                    maxLife: 0.32,
                    shape: 'circle',
                    gravity: -1.5,
                    rotation: 0,
                    vRot: 0,
                  });
                }
              }

              // 1. Check Bonus Stars pickup
              for (const star of stage.stars) {
                if (!star.collected && Math.hypot(p.x - star.x, p.y - star.y) < 0.78) {
                  star.collected = true;
                  p.starsHitThisShot += 1;
                  sound.playStar(p.starsHitThisShot - 1);
                  spawnBurst(star.x, star.y, 14, ['#F59E0B', '#FDE047', '#FFFFFF'], 4.0, -4, true);
                  spawnFloatingText(
                    star.x,
                    star.y + 0.5,
                    star.isVertexStar ? 'PUNCAK +50!' : 'BINTANG +50!',
                    '#D97706',
                    undefined,
                    0.95
                  );
                }
              }

              // 2. Check Target Hit
              const { tx, ty } = getCurrentTargetPos(stage, timeRef.current);
              if (Math.hypot(p.x - tx, p.y - ty) <= stage.targetRadius) {
                triggerHit(tx, ty);
                resolved = true;
                break;
              }

              // 3. Check Wall Obstacles
              for (const w of stage.walls) {
                const hitR = 0.24;
                if (
                  p.x + hitR > w.x &&
                  p.x - hitR < w.x + w.width &&
                  p.y + hitR > w.yBottom &&
                  p.y - hitR < w.yTop
                ) {
                  const msg =
                    stage.theme === 'bridge'
                      ? 'TERKENA KAPAL! Naikkan yp!'
                      : 'TERHALANG! Naikkan Puncak!';
                  triggerMiss(p.x, p.y, msg);
                  resolved = true;
                  break;
                }
              }
              if (resolved) break;

              // 4. Out-of-bounds checks
              if (p.y < 0.05) {
                triggerMiss(
                  Math.min(15.2, Math.max(0.8, p.x)),
                  0.3,
                  stage.theme === 'bridge' ? 'KABEL SENTUH SUNGAI (D ≥ 0)!' : 'JATUH KE TANAH!'
                );
                resolved = true;
                break;
              }
              if (p.x > WORLD_WIDTH + 0.3 || p.y > WORLD_HEIGHT + 1.4) {
                triggerMiss(Math.min(15.2, p.x), Math.min(9.0, Math.max(1.2, p.y)), 'MELESET!');
                resolved = true;
                break;
              }
            }
          }

          // Celebration countdown
          if (phase === 'celebrating') {
            celebrateTimerRef.current -= dt;
            if (celebrateTimerRef.current <= 0) {
              finishCelebration();
            }
          }

          // Update particles
          const parts = particlesRef.current;
          for (let i = parts.length - 1; i >= 0; i--) {
            const pt = parts[i];
            pt.life -= dt;
            if (pt.life <= 0) {
              parts.splice(i, 1);
              continue;
            }
            if (pt.shape === 'ring') {
              pt.size += dt * 4.4;
            } else {
              pt.vy += pt.gravity * dt;
              pt.x += pt.vx * dt;
              pt.y += pt.vy * dt;
              pt.rotation += pt.vRot * dt;
            }
          }

          // Update floating texts
          const fts = floatingTextsRef.current;
          for (let i = fts.length - 1; i >= 0; i--) {
            const ft = fts[i];
            ft.life -= dt;
            ft.y += dt * 0.95;
            if (ft.life <= 0) fts.splice(i, 1);
          }
        }
      }

      // ================== RENDER 60FPS CANVAS ==================
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = canvas.width / layoutRef.current.width;
          const { width, height, padLeft, padRight, padTop, padBottom } = layoutRef.current;
          const plotW = width - padLeft - padRight;
          const plotH = height - padTop - padBottom;
          const pxPerX = plotW / WORLD_WIDTH;
          const pxPerY = plotH / WORLD_HEIGHT;

          ctx.save();
          ctx.scale(dpr, dpr);

          // Apply screen shake offset
          if (shakeRef.current > 0.2) {
            const sxOff = (Math.random() - 0.5) * shakeRef.current;
            const syOff = (Math.random() - 0.5) * shakeRef.current;
            ctx.translate(sxOff, syOff);
          }

          // 1. Warm Sunlit Architectural Drafting Paper Background
          ctx.fillStyle = '#FCF9F2';
          ctx.fillRect(0, 0, width, height);

          // Soft ambient thematic top glow
          const skyGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
          if (stage.theme === 'bridge') {
            skyGrad.addColorStop(0, 'rgba(16, 185, 129, 0.06)');
            skyGrad.addColorStop(0.84, 'rgba(252, 249, 242, 0)');
            skyGrad.addColorStop(1, 'rgba(29, 99, 220, 0.14)');
          } else if (stage.theme === 'fountain') {
            skyGrad.addColorStop(0, 'rgba(29, 99, 220, 0.06)');
            skyGrad.addColorStop(1, 'rgba(56, 189, 248, 0.05)');
          } else if (stage.theme === 'profit') {
            skyGrad.addColorStop(0, 'rgba(245, 158, 11, 0.06)');
            skyGrad.addColorStop(1, 'rgba(16, 185, 129, 0.04)');
          } else {
            skyGrad.addColorStop(0, 'rgba(255, 90, 54, 0.05)');
            skyGrad.addColorStop(1, 'rgba(245, 158, 11, 0.03)');
          }
          ctx.fillStyle = skyGrad;
          ctx.fillRect(padLeft, padTop, plotW, plotH);

          // 2. Blueprint Coordinate Gridlines
          ctx.lineWidth = 1;
          for (let gx = 0; gx <= WORLD_WIDTH; gx++) {
            const { sx } = worldToScreen(gx, 0);
            ctx.strokeStyle = gx % 2 === 0 ? 'rgba(29, 99, 220, 0.15)' : 'rgba(29, 99, 220, 0.06)';
            ctx.beginPath();
            ctx.moveTo(sx, padTop);
            ctx.lineTo(sx, padTop + plotH);
            ctx.stroke();
          }
          for (let gy = 0; gy <= WORLD_HEIGHT; gy++) {
            const { sy } = worldToScreen(0, gy);
            ctx.strokeStyle = gy % 2 === 0 ? 'rgba(29, 99, 220, 0.15)' : 'rgba(29, 99, 220, 0.06)';
            ctx.beginPath();
            ctx.moveTo(padLeft, sy);
            ctx.lineTo(padLeft + plotW, sy);
            ctx.stroke();
          }

          // 3. Thematic Ground / River Strip at y = 0
          const groundY = worldToScreen(0, 0).sy;
          if (stage.theme === 'bridge') {
            // Animated wavy river at y = 0..0.6
            ctx.fillStyle = 'rgba(29, 99, 220, 0.16)';
            ctx.beginPath();
            ctx.moveTo(padLeft, groundY);
            for (let x = 0; x <= plotW; x += 12) {
              const wave = Math.sin(x * 0.05 + timeRef.current * 3.2) * 3.5;
              ctx.lineTo(padLeft + x, groundY - 8 + wave);
            }
            ctx.lineTo(padLeft + plotW, groundY);
            ctx.closePath();
            ctx.fill();
          } else if (stage.theme === 'basket') {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
            ctx.fillRect(padLeft, groundY - 6, plotW, 6);
          }

          // 4. Bold Drafting Axes (X and Y) with tick labels
          ctx.strokeStyle = '#13293D';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(padLeft, padTop);
          ctx.lineTo(padLeft, groundY);
          ctx.lineTo(padLeft + plotW, groundY);
          ctx.stroke();

          ctx.fillStyle = '#47627A';
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          for (let gx = 0; gx <= WORLD_WIDTH; gx += 2) {
            const { sx } = worldToScreen(gx, 0);
            ctx.fillText(String(gx), sx, groundY + 7);
          }
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          for (let gy = 0; gy <= WORLD_HEIGHT; gy += 2) {
            const { sy } = worldToScreen(0, gy);
            ctx.fillText(String(gy), padLeft - 8, sy);
          }

          // Axis name badges
          ctx.fillStyle = '#13293D';
          ctx.font = '800 10px "Space Grotesk", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('x', padLeft + plotW - 2, groundY + 18);
          ctx.textAlign = 'left';
          ctx.fillText('y', padLeft + 6, padTop + 4);

          // 5. Ghost Trajectory from previous missed shot (CT debugging visual!)
          if (ghostRef.current) {
            const gp = computeParabolaFromVertex(
              ghostRef.current.xp,
              ghostRef.current.yp,
              ghostRef.current.c
            );
            ctx.save();
            ctx.strokeStyle = 'rgba(225, 29, 72, 0.25)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            let started = false;
            for (let wx = 0; wx <= WORLD_WIDTH; wx += 0.15) {
              const wy = evalParabola(gp, wx);
              if (wy < -0.2 || wy > WORLD_HEIGHT + 0.8) {
                if (started) break;
                continue;
              }
              const { sx, sy } = worldToScreen(wx, wy);
              if (!started) {
                ctx.moveTo(sx, sy);
                started = true;
              } else {
                ctx.lineTo(sx, sy);
              }
            }
            ctx.stroke();
            ctx.restore();
          }

          // 6. Live Parabola Preview Curve + Axis of Symmetry
          const curParams = computeParabolaFromVertex(xpRef.current, ypRef.current, cRef.current);
          const vScreen = worldToScreen(curParams.xp, curParams.yp);

          // Sumbu Simetri vertical dashed line x = xp & horizontal guide y = yp
          ctx.save();
          ctx.strokeStyle = 'rgba(29, 99, 220, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(vScreen.sx, padTop);
          ctx.lineTo(vScreen.sx, groundY);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 90, 54, 0.28)';
          ctx.beginPath();
          ctx.moveTo(padLeft, vScreen.sy);
          ctx.lineTo(vScreen.sx, vScreen.sy);
          ctx.stroke();
          ctx.restore();

          // Sumbu Simetri label chip
          ctx.save();
          ctx.fillStyle = 'rgba(29, 99, 220, 0.12)';
          const symText = `x = ${formatNum(curParams.xp, 1)}`;
          ctx.font = '700 10px "JetBrains Mono", monospace';
          const symW = ctx.measureText(symText).width + 10;
          ctx.beginPath();
          ctx.roundRect(vScreen.sx - symW / 2, padTop + 4, symW, 16, 4);
          ctx.fill();
          ctx.fillStyle = '#1D63DC';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(symText, vScreen.sx, padTop + 12);
          ctx.restore();

          // Profit Mode subtle area-under-curve shading
          if (stage.theme === 'profit') {
            ctx.save();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
            ctx.beginPath();
            ctx.moveTo(padLeft, groundY);
            const maxDrawX = stage.symmetryBlind ? curParams.xp + 0.8 : WORLD_WIDTH;
            for (let wx = 0; wx <= maxDrawX; wx += 0.15) {
              const wy = Math.max(0, Math.min(WORLD_HEIGHT, evalParabola(curParams, wx)));
              const { sx, sy } = worldToScreen(wx, wy);
              ctx.lineTo(sx, sy);
            }
            const endScreen = worldToScreen(maxDrawX, 0);
            ctx.lineTo(endScreen.sx, groundY);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Dashed live preview curve (in Symmetry Blind mode, fades smoothly past xp!)
          const curveColor = stage.curveMode === 'up' ? '#10B981' : '#1D63DC';
          ctx.save();
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          const stepX = 0.12;
          const dashOffset = -(timeRef.current * 24) % 16;
          ctx.setLineDash([7, 7]);
          ctx.lineDashOffset = dashOffset;

          if (!stage.symmetryBlind) {
            ctx.strokeStyle = curveColor;
            ctx.beginPath();
            let started = false;
            for (let wx = 0; wx <= WORLD_WIDTH; wx += stepX) {
              const wy = evalParabola(curParams, wx);
              if (wy < -0.1 || wy > WORLD_HEIGHT + 0.6) {
                if (started) break;
                continue;
              }
              const { sx, sy } = worldToScreen(wx, wy);
              if (!started) {
                ctx.moveTo(sx, sy);
                started = true;
              } else {
                ctx.lineTo(sx, sy);
              }
            }
            ctx.stroke();
          } else {
            // Left half solid preview up to xp + 0.6, then fades out so player uses symmetry CT!
            const fadeEnd = curParams.xp + 1.8;
            for (let wx = 0; wx < fadeEnd; wx += stepX) {
              const wy1 = evalParabola(curParams, wx);
              const wy2 = evalParabola(curParams, wx + stepX);
              if (wy1 < 0 || wy1 > WORLD_HEIGHT + 0.4) continue;
              const alpha =
                wx <= curParams.xp
                  ? 0.9
                  : Math.max(0, 0.9 * (1 - (wx - curParams.xp) / 1.8));
              const p1 = worldToScreen(wx, wy1);
              const p2 = worldToScreen(wx + stepX, wy2);
              ctx.strokeStyle =
                stage.curveMode === 'up'
                  ? `rgba(16, 185, 129, ${alpha})`
                  : `rgba(29, 99, 220, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.sx, p1.sy);
              ctx.lineTo(p2.sx, p2.sy);
              ctx.stroke();
            }
          }
          ctx.restore();

          // In Bridge Mode (a > 0), draw vertical suspension hanger cables down to road deck!
          if (stage.theme === 'bridge') {
            ctx.save();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.28)';
            ctx.lineWidth = 1.5;
            const limitX = stage.symmetryBlind ? curParams.xp + 0.6 : stage.targetX;
            for (let wx = 1; wx <= limitX; wx += 1.2) {
              const wy = evalParabola(curParams, wx);
              if (wy > 0.2 && wy < WORLD_HEIGHT) {
                const top = worldToScreen(wx, wy);
                const bot = worldToScreen(wx, Math.max(0.4, curParams.yp - 0.1));
                ctx.beginPath();
                ctx.moveTo(top.sx, top.sy);
                ctx.lineTo(bot.sx, bot.sy);
                ctx.stroke();
              }
            }
            ctx.restore();
          }

          // 7. Draw Obstacles (Walls / Patung / Kapal / Menara)
          for (const w of stage.walls) {
            const tl = worldToScreen(w.x, w.yTop);
            const br = worldToScreen(w.x + w.width, w.yBottom);
            const rw = br.sx - tl.sx;
            const rh = br.sy - tl.sy;

            if (stage.theme === 'bridge' && w.label === 'Kapal') {
              // Cute river cargo boat under the bridge cable
              ctx.save();
              ctx.fillStyle = '#FF5A36';
              ctx.strokeStyle = '#13293D';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(tl.sx - 6, br.sy - rh * 0.45);
              ctx.lineTo(br.sx + 6, br.sy - rh * 0.45);
              ctx.lineTo(br.sx - 4, br.sy);
              ctx.lineTo(tl.sx + 4, br.sy);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              // Boat cabin
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(tl.sx + rw * 0.22, tl.sy + 2, rw * 0.56, rh * 0.52);
              ctx.strokeRect(tl.sx + rw * 0.22, tl.sy + 2, rw * 0.56, rh * 0.52);

              // Cabin window
              ctx.fillStyle = '#38BDF8';
              ctx.fillRect(tl.sx + rw * 0.34, tl.sy + 8, rw * 0.32, Math.max(6, rh * 0.2));
              ctx.restore();
            } else {
              // Architectural drafting obstacle pillar with diagonal hatch lines
              ctx.save();
              ctx.fillStyle = '#E2E8F0';
              ctx.strokeStyle = '#13293D';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(tl.sx, tl.sy, rw, rh, [5, 5, 0, 0]);
              ctx.fill();
              ctx.clip();

              // Diagonal hazard stripes
              ctx.strokeStyle = 'rgba(19, 41, 61, 0.14)';
              ctx.lineWidth = 2;
              for (let d = -rh; d < rw + rh; d += 10) {
                ctx.beginPath();
                ctx.moveTo(tl.sx + d, tl.sy);
                ctx.lineTo(tl.sx + d - rh, tl.sy + rh);
                ctx.stroke();
              }
              ctx.restore();

              // Outer crisp border + cap
              ctx.strokeStyle = '#13293D';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(tl.sx, tl.sy, rw, rh, [5, 5, 0, 0]);
              ctx.stroke();

              ctx.fillStyle = '#FF5A36';
              ctx.fillRect(tl.sx - 2, tl.sy, rw + 4, 6);
              ctx.strokeRect(tl.sx - 2, tl.sy, rw + 4, 6);

              if (w.label && rh > 34) {
                ctx.save();
                ctx.fillStyle = '#13293D';
                ctx.font = '700 9px "Space Grotesk", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(w.label.toUpperCase(), tl.sx + rw / 2, tl.sy + rh / 2 + 4);
                ctx.restore();
              }
            }
          }

          // 8. Bonus Stars along the ideal parabola
          for (const st of stage.stars) {
            if (st.collected) continue;
            const sp = worldToScreen(st.x, st.y);
            const bob = Math.sin(timeRef.current * 4 + st.id * 1.4) * 3;
            const pulse = 1 + Math.sin(timeRef.current * 5 + st.id) * 0.08;
            drawStar(
              ctx,
              sp.sx,
              sp.sy + bob,
              (st.isVertexStar ? 13 : 11) * pulse,
              (st.isVertexStar ? 6 : 5) * pulse,
              st.isVertexStar ? '#F59E0B' : '#FDE047',
              '#13293D',
              Math.sin(timeRef.current * 2 + st.id) * 0.25
            );
          }

          // 9. Target Object (Hoop / Fountain Basin / Bridge Pylon / Landing Zone)
          const { tx, ty } = getCurrentTargetPos(stage, timeRef.current);
          const tScreen = worldToScreen(tx, ty);
          const tRadiusPx = stage.targetRadius * ((pxPerX + pxPerY) * 0.5);

          ctx.save();
          // Pulsing target ring halo
          const haloPulse = 1 + Math.sin(timeRef.current * 4.5) * 0.08;
          ctx.beginPath();
          ctx.arc(tScreen.sx, tScreen.sy, tRadiusPx * haloPulse, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#10B981';
          ctx.setLineDash([5, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          if (stage.theme === 'basket') {
            // Backboard + Orange Rim + Crisp Net
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#13293D';
            ctx.lineWidth = 2;
            ctx.fillRect(tScreen.sx + tRadiusPx * 0.55, tScreen.sy - 26, 7, 42);
            ctx.strokeRect(tScreen.sx + tRadiusPx * 0.55, tScreen.sy - 26, 7, 42);

            // Net mesh
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 1.5;
            const rimLeft = tScreen.sx - tRadiusPx * 0.65;
            const rimRight = tScreen.sx + tRadiusPx * 0.55;
            ctx.beginPath();
            ctx.moveTo(rimLeft, tScreen.sy);
            ctx.lineTo(rimLeft + 6, tScreen.sy + 22);
            ctx.lineTo(rimRight - 6, tScreen.sy + 22);
            ctx.lineTo(rimRight, tScreen.sy);
            ctx.moveTo(rimLeft + 5, tScreen.sy);
            ctx.lineTo(rimRight - 10, tScreen.sy + 22);
            ctx.moveTo(rimRight - 5, tScreen.sy);
            ctx.lineTo(rimLeft + 10, tScreen.sy + 22);
            ctx.stroke();

            // Rim bar
            ctx.strokeStyle = '#FF5A36';
            ctx.lineWidth = 4.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(rimLeft, tScreen.sy);
            ctx.lineTo(rimRight, tScreen.sy);
            ctx.stroke();
          } else if (stage.theme === 'fountain') {
            // Receiving fountain basin
            ctx.fillStyle = '#38BDF8';
            ctx.strokeStyle = '#13293D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(tScreen.sx, tScreen.sy + 6, tRadiusPx * 0.85, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '800 10px "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('KOLAM', tScreen.sx, tScreen.sy - 10);
          } else if (stage.theme === 'bridge') {
            // Far suspension tower pylon
            ctx.fillStyle = '#13293D';
            ctx.fillRect(tScreen.sx - 6, tScreen.sy, 12, groundY - tScreen.sy);
            ctx.fillStyle = '#10B981';
            ctx.strokeStyle = '#13293D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(tScreen.sx, tScreen.sy, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else {
            // Bullseye target ring (Rocket / Profit)
            ctx.fillStyle = '#10B981';
            ctx.strokeStyle = '#13293D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(tScreen.sx, tScreen.sy, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(tScreen.sx, tScreen.sy, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Coordinate tag under target
          ctx.fillStyle = '#13293D';
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            `(${formatNum(tx, 1)}, ${formatNum(ty, 1)})`,
            tScreen.sx,
            Math.min(groundY - 8, tScreen.sy + tRadiusPx + 12)
          );
          ctx.restore();

          // 10. Launcher / Tower at (0, c)
          const launchScreen = worldToScreen(0, cRef.current);
          ctx.save();
          // Vertical pedestal down to ground
          ctx.fillStyle = stage.theme === 'bridge' ? '#13293D' : '#CBD5E1';
          ctx.strokeStyle = '#13293D';
          ctx.lineWidth = 2;
          ctx.fillRect(launchScreen.sx - 5, launchScreen.sy, 10, groundY - launchScreen.sy);
          ctx.strokeRect(launchScreen.sx - 5, launchScreen.sy, 10, groundY - launchScreen.sy);

          // Launch barrel / anchor node
          const slope0 = 2 * curParams.a * 0 + curParams.b;
          const aimAngle = Math.atan2(-slope0 * pxPerY, pxPerX);
          ctx.translate(launchScreen.sx, launchScreen.sy);
          if (stage.theme !== 'bridge') {
            ctx.save();
            ctx.rotate(aimAngle);
            ctx.fillStyle = '#13293D';
            ctx.beginPath();
            ctx.roundRect(0, -6, 22, 12, 4);
            ctx.fill();
            ctx.fillStyle = '#FF5A36';
            ctx.fillRect(15, -6, 5, 12);
            ctx.restore();
          }
          ctx.fillStyle = stage.allowAdjustC ? '#10B981' : '#FF5A36';
          ctx.strokeStyle = '#13293D';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, stage.allowAdjustC ? 11 : 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // c label
          ctx.fillStyle = '#13293D';
          ctx.font = '800 10px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`c=${formatNum(cRef.current, 1)}`, 14, -12);
          ctx.restore();

          // 11. Interactive Draggable Vertex Handle P(xp, yp)
          if (phase === 'aiming' || phase === 'paused') {
            const vPulse = 1 + Math.sin(timeRef.current * 5) * 0.12;
            ctx.save();
            ctx.beginPath();
            ctx.arc(vScreen.sx, vScreen.sy, 18 * vPulse, 0, Math.PI * 2);
            ctx.fillStyle =
              dragModeRef.current === 'vertex'
                ? 'rgba(255, 90, 54, 0.28)'
                : 'rgba(255, 90, 54, 0.14)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(vScreen.sx, vScreen.sy, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#FF5A36';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#13293D';
            ctx.stroke();

            // Inner dot
            ctx.beginPath();
            ctx.arc(vScreen.sx, vScreen.sy, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();

            // Crisp floating coordinate badge above/below vertex
            const labelY =
              stage.curveMode === 'down'
                ? Math.max(padTop + 28, vScreen.sy - 24)
                : Math.min(groundY - 18, vScreen.sy + 26);
            const vTag = `P(${formatNum(curParams.xp, 1)}, ${formatNum(curParams.yp, 1)})`;
            ctx.font = '700 11px "JetBrains Mono", monospace';
            const tagW = ctx.measureText(vTag).width + 14;
            ctx.fillStyle = '#13293D';
            ctx.beginPath();
            ctx.roundRect(vScreen.sx - tagW / 2, labelY - 11, tagW, 22, 6);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(vTag, vScreen.sx, labelY);
            ctx.restore();
          }

          // 12. Flying Projectile + Ink Trail
          if (projRef.current.active) {
            const p = projRef.current;

            // Smooth ribbon trail
            if (p.trail.length > 1) {
              ctx.save();
              ctx.strokeStyle =
                stage.theme === 'fountain'
                  ? 'rgba(29, 99, 220, 0.65)'
                  : stage.theme === 'bridge'
                    ? 'rgba(16, 185, 129, 0.7)'
                    : 'rgba(255, 90, 54, 0.6)';
              ctx.lineWidth = 4;
              ctx.lineCap = 'round';
              ctx.beginPath();
              p.trail.forEach((pt, idx) => {
                const spt = worldToScreen(pt.x, pt.y);
                if (idx === 0) ctx.moveTo(spt.sx, spt.sy);
                else ctx.lineTo(spt.sx, spt.sy);
              });
              ctx.stroke();
              ctx.restore();
            }

            const ps = worldToScreen(p.x, p.y);
            ctx.save();
            ctx.translate(ps.sx, ps.sy);

            if (stage.theme === 'basket') {
              // Spinning ribbed basketball
              ctx.rotate(p.spin);
              ctx.fillStyle = '#FF5A36';
              ctx.strokeStyle = '#13293D';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, 11, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(-11, 0);
              ctx.lineTo(11, 0);
              ctx.moveTo(0, -11);
              ctx.lineTo(0, 11);
              ctx.stroke();
            } else if (stage.theme === 'fountain') {
              // Glowing water orb
              ctx.fillStyle = '#38BDF8';
              ctx.strokeStyle = '#1D63DC';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, 10, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(-3, -3, 3, 0, Math.PI * 2);
              ctx.fill();
            } else if (stage.theme === 'bridge') {
              // Suspension cable tram tilted along tangent derivative!
              const screenAngle = Math.atan2(-Math.sin(p.angle) * pxPerY, Math.cos(p.angle) * pxPerX);
              ctx.rotate(screenAngle);
              ctx.fillStyle = '#F59E0B';
              ctx.strokeStyle = '#13293D';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.roundRect(-13, -7, 26, 14, 4);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(-7, -4, 6, 6);
              ctx.fillRect(2, -4, 6, 6);
            } else if (stage.theme === 'rocket') {
              // Water rocket tilted along trajectory tangent!
              const screenAngle = Math.atan2(-Math.sin(p.angle) * pxPerY, Math.cos(p.angle) * pxPerX);
              ctx.rotate(screenAngle);
              ctx.fillStyle = '#FFFFFF';
              ctx.strokeStyle = '#13293D';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(14, 0);
              ctx.lineTo(-9, -7);
              ctx.lineTo(-6, 0);
              ctx.lineTo(-9, 7);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#FF5A36';
              ctx.beginPath();
              ctx.arc(3, 0, 3, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Golden profit coin
              ctx.fillStyle = '#F59E0B';
              ctx.strokeStyle = '#13293D';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, 11, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#FFFFFF';
              ctx.font = '800 11px "JetBrains Mono", monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('Rp', 0, 1);
            }
            ctx.restore();
          }

          // 13. Particles
          for (const pt of particlesRef.current) {
            const alpha = Math.max(0, pt.life / pt.maxLife);
            const sp = worldToScreen(pt.x, pt.y);
            const sizePx = pt.size * ((pxPerX + pxPerY) * 0.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            if (pt.shape === 'ring') {
              ctx.strokeStyle = pt.color;
              ctx.lineWidth = 3 * alpha;
              ctx.beginPath();
              ctx.arc(sp.sx, sp.sy, sizePx, 0, Math.PI * 2);
              ctx.stroke();
            } else if (pt.shape === 'square') {
              ctx.translate(sp.sx, sp.sy);
              ctx.rotate(pt.rotation);
              ctx.fillStyle = pt.color;
              ctx.fillRect(-sizePx / 2, -sizePx / 2, sizePx, sizePx);
            } else if (pt.shape === 'star') {
              drawStar(ctx, sp.sx, sp.sy, sizePx, sizePx * 0.45, pt.color, '#13293D', pt.rotation);
            } else {
              ctx.fillStyle = pt.color;
              ctx.beginPath();
              ctx.arc(sp.sx, sp.sy, sizePx * 0.65, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          // 14. Floating Score Popups
          for (const ft of floatingTextsRef.current) {
            const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.4);
            const sp = worldToScreen(ft.x, ft.y);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `800 ${Math.round(16 * ft.scale)}px "Space Grotesk", sans-serif`;
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeText(ft.text, sp.sx, sp.sy);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, sp.sx, sp.sy);

            if (ft.subtext) {
              ctx.font = '700 11px "JetBrains Mono", monospace';
              ctx.strokeText(ft.subtext, sp.sx, sp.sy + 18);
              ctx.fillStyle = '#13293D';
              ctx.fillText(ft.subtext, sp.sx, sp.sy + 18);
            }
            ctx.restore();
          }

          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    clampVertex,
    finishCelebration,
    getCurrentTargetPos,
    spawnBurst,
    spawnFloatingText,
    syncHud,
    triggerHit,
    triggerMiss,
    worldToScreen,
  ]);

  // Helper to nudge launch height c from touch controls
  const adjustLaunchC = (delta: number) => {
    if (phaseRef.current !== 'aiming') return;
    const stage = stageRef.current;
    if (!stage.allowAdjustC) return;
    const nextC = Math.max(stage.minC, Math.min(stage.maxC, Number((cRef.current + delta).toFixed(1))));
    cRef.current = nextC;
    const clamped = clampVertex(xpRef.current, ypRef.current, stage, nextC);
    xpRef.current = clamped.nx;
    ypRef.current = clamped.ny;
    sound.playAimTick(nextC / WORLD_HEIGHT);
    syncHud();
  };

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (scoreSaved) return;
    saveHighScore({
      name: playerName || 'Siswa Kelas X',
      score: hud.score,
      mode: 'arcade',
      stageOrAccuracy: `Level ${hud.level}`,
    });
    sound.playCtCorrect();
    setScoreSaved(true);
    syncHud();
  };

  const p = hud.parabola;
  const discLabel =
    Math.abs(p.discriminant) < 0.08
      ? 'D = 0 (1 Singgung)'
      : p.discriminant > 0
        ? `D = ${formatNum(p.discriminant, 1)} > 0 (2 Akar)`
        : `D = ${formatNum(p.discriminant, 1)} < 0 (Definit!)`;

  return (
    <div className="min-h-screen blueprint-paper flex flex-col">
      {/* Compact Top Arcade HUD Bar */}
      <header className="sticky top-0 z-20 bg-[#FAF7F0]/95 backdrop-blur border-b-2 border-[#13293D] px-3 sm:px-5 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onBack();
              }}
              className="draft-btn bg-white px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5"
              title="Kembali ke Menu"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
            </button>
            <div className="bg-[#13293D] text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                Lv.{hud.level}
              </span>
              <span className="text-xs sm:text-sm font-display font-bold truncate max-w-[140px] sm:max-w-[230px]">
                {hud.stage.title}
              </span>
            </div>
          </div>

          {/* Score, Combo & Hearts */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hearts */}
            <div className="draft-card-sm px-2.5 py-1 rounded-lg flex items-center gap-1" title="Energi Percobaan">
              {Array.from({ length: hud.maxLives }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 transition-transform duration-200 ${
                    i < hud.lives
                      ? 'fill-[#FF5A36] text-[#13293D] scale-100'
                      : 'fill-slate-200 text-slate-400 scale-90'
                  }`}
                />
              ))}
            </div>

            {/* Combo pill */}
            {hud.combo >= 2 && (
              <div className="bg-[#FF5A36] text-white border-2 border-[#13293D] px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 animate-pop-in">
                <Flame className="w-3.5 h-3.5 fill-yellow-300 text-yellow-200" />
                <span>{hud.combo}x</span>
              </div>
            )}

            {/* Score */}
            <div className="draft-card-sm px-3 py-1 rounded-lg flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#F59E0B]" />
              <span className="font-mono-math font-extrabold text-sm sm:text-base text-[#13293D]">
                {hud.score}
              </span>
            </div>

            {/* Sound & Pause & Help */}
            <button
              onClick={() => {
                sound.toggleMute();
                syncHud();
              }}
              className="draft-btn bg-white p-1.5 sm:p-2 rounded-lg"
              aria-label="Suara"
            >
              {hud.muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setShowControlsHint((v) => !v);
              }}
              className="draft-btn bg-white p-1.5 sm:p-2 rounded-lg"
              title="Panduan Kontrol"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={togglePause}
              className="draft-btn bg-[#F59E0B] text-[#13293D] p-1.5 sm:p-2 rounded-lg"
              title="Jeda (P)"
            >
              {hud.phase === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Playfield Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-5 py-3 flex flex-col gap-3">
        {/* Contextual Mission + Live Grade X Math Equation Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
          {/* Live Quadratic Formula Blueprint */}
          <div className="lg:col-span-7 draft-card rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#13293D] text-white px-2 py-0.5 rounded">
                f(x)
              </span>
              <div className="font-mono-math text-sm sm:text-base font-extrabold tracking-tight">
                <span className="text-[#FF5A36]">{formatNum(p.a, 2)}x²</span>{' '}
                <span className="text-[#1D63DC]">{formatSigned(p.b, 2)}x</span>{' '}
                <span className="text-[#059669]">{formatSigned(p.c, 1)}</span>
              </div>
              <span className="hidden sm:inline text-slate-300">|</span>
              <div className="font-mono-math text-xs text-slate-600">
                Puncak:{' '}
                <strong className="text-[#13293D]">
                  ({formatNum(p.xp, 1)}, {formatNum(p.yp, 1)})
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[11px] font-mono-math font-bold px-2 py-0.5 rounded border ${
                  p.a < 0
                    ? 'bg-[#FF5A36]/10 text-[#C23B1E] border-[#FF5A36]/30'
                    : 'bg-[#10B981]/10 text-[#047857] border-[#10B981]/30'
                }`}
              >
                {p.a < 0 ? 'a < 0 (∩)' : 'a > 0 (∪)'}
              </span>
              <span className="text-[11px] font-mono-math font-bold px-2 py-0.5 rounded bg-[#1D63DC]/10 text-[#1D63DC] border border-[#1D63DC]/30">
                {discLabel}
              </span>
            </div>
          </div>

          {/* Contextual CT Mission Hint Pill */}
          <div className="lg:col-span-5 draft-card rounded-xl px-3.5 py-2 flex items-center gap-2.5 bg-[#FFFDF8]">
            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md bg-[#1D63DC] text-white">
              CT: {hud.stage.ctPillar}
            </span>
            <p className="text-xs sm:text-[13px] font-medium text-[#13293D] leading-snug">
              {hud.stage.subtitle}
            </p>
          </div>
        </div>

        {/* Interactive 60FPS Canvas Stage */}
        <div className="relative draft-card rounded-2xl overflow-hidden bg-[#FCF9F2]">
          <div
            ref={containerRef}
            className="w-full h-[330px] sm:h-[430px] lg:h-[470px] relative select-none"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-full block cursor-crosshair touch-none"
            />

            {/* Symmetry Blind Mode Badge */}
            {hud.stage.symmetryBlind && hud.phase === 'aiming' && (
              <div className="absolute top-3 right-3 bg-[#13293D] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 pointer-events-none shadow">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                Mode Simetri CT: Prediksi Paruh Kanan!
              </div>
            )}

            {/* Quick Controls Popover */}
            {showControlsHint && (
              <div className="absolute top-3 left-3 z-20 draft-card rounded-xl p-3.5 max-w-xs text-xs space-y-2 animate-pop-in">
                <div className="flex items-center justify-between font-display font-bold text-sm">
                  <span>Kontrol Cepat</span>
                  <button
                    onClick={() => setShowControlsHint(false)}
                    className="text-slate-400 hover:text-[#13293D] font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
                <ul className="space-y-1 text-slate-700">
                  <li>
                    <strong>Sentuh / Seret:</strong> Geser langsung titik puncak merah{' '}
                    <span className="font-mono-math font-bold text-[#FF5A36]">P(xp, yp)</span>
                  </li>
                  <li>
                    <strong>Keyboard:</strong> <kbd className="px-1 bg-slate-100 border rounded">WASD</kbd> /{' '}
                    <kbd className="px-1 bg-slate-100 border rounded">↑↓←→</kbd> geser puncak (+Shift untuk halus)
                  </li>
                  <li>
                    <strong>Tinggi Awal c:</strong> <kbd className="px-1 bg-slate-100 border rounded">Q</kbd> /{' '}
                    <kbd className="px-1 bg-slate-100 border rounded">E</kbd> (saat terbuka di Lv.4+)
                  </li>
                  <li>
                    <strong>Tembak:</strong> <kbd className="px-1 bg-slate-100 border rounded">Spasi</kbd> / tombol{' '}
                    <strong>TEMBAK!</strong>
                  </li>
                </ul>
              </div>
            )}

            {/* PAUSE OVERLAY */}
            {hud.phase === 'paused' && (
              <div className="absolute inset-0 z-30 bg-[#13293D]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
                <div className="draft-card rounded-2xl p-6 max-w-sm w-full text-center space-y-4 animate-pop-in">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#F59E0B] border-2 border-[#13293D] mx-auto">
                    <Pause className="w-6 h-6 text-[#13293D]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold">Permainan Dijeda</h2>
                    <p className="text-xs text-slate-600 mt-1">{hud.stage.ctTip}</p>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={togglePause}
                      className="draft-btn bg-[#10B981] text-white font-display font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" /> Lanjutkan (P)
                    </button>
                    <button
                      onClick={restartGame}
                      className="draft-btn bg-[#FAF7F0] text-[#13293D] font-display font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Ulangi dari Level 1 (R)
                    </button>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onOpenMateri();
                      }}
                      className="draft-btn bg-[#1D63DC] text-white font-display font-bold py-2.5 rounded-xl text-sm"
                    >
                      Buka Materi CT Fungsi Kuadrat
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

            {/* CT FLASH GATE BONUS OVERLAY (Every 3 Levels!) */}
            {hud.phase === 'ct-gate' && activeCtGate && (
              <div className="absolute inset-0 z-30 bg-[#13293D]/70 backdrop-blur-[3px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
                <div className="draft-card rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-3.5 animate-pop-in my-auto">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#F59E0B] text-[#13293D] border-2 border-[#13293D] text-xs font-extrabold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> GERBANG BONUS CT!
                      </span>
                      <span className="text-xs font-bold text-[#1D63DC] bg-[#1D63DC]/10 px-2 py-0.5 rounded">
                        {activeCtGate.pillar}
                      </span>
                    </div>
                    <span className="text-xs font-mono-math font-bold text-[#059669]">
                      +150 Skor & +1 ❤️
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-bold text-[#13293D] leading-snug">
                    {activeCtGate.prompt}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeCtGate.options.map((opt, idx) => {
                      const answered = ctChoiceIdx !== null;
                      const isSelected = ctChoiceIdx === idx;
                      const isCorrect = idx === activeCtGate.correctIndex;
                      let style = 'bg-white hover:bg-[#FAF7F0] text-[#13293D]';
                      if (answered) {
                        if (isCorrect) style = 'bg-[#10B981] text-white';
                        else if (isSelected) style = 'bg-[#FF5A36] text-white';
                        else style = 'bg-slate-100 text-slate-400';
                      }
                      return (
                        <button
                          key={idx}
                          disabled={answered}
                          onClick={() => handleCtGateAnswer(idx)}
                          className={`draft-btn rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm font-bold flex items-start gap-2 ${style}`}
                        >
                          <span className="font-mono-math opacity-75">{idx + 1}.</span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {ctChoiceIdx !== null && (
                    <div className="rounded-xl bg-[#FAF7F0] border-2 border-[#13293D] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-pop-in">
                      <p className="text-xs text-[#13293D] leading-relaxed">
                        <strong
                          className={
                            ctChoiceIdx === activeCtGate.correctIndex
                              ? 'text-[#059669]'
                              : 'text-[#E11D48]'
                          }
                        >
                          {ctChoiceIdx === activeCtGate.correctIndex
                            ? 'Tepat Sekali! (+150 & +1 ❤️) '
                            : 'Hampir tepat! '}
                        </strong>
                        {activeCtGate.explanation}
                      </p>
                      <button
                        onClick={continueFromCtGate}
                        className="shrink-0 draft-btn bg-[#1D63DC] text-white text-xs sm:text-sm font-display font-bold px-4 py-2 rounded-xl"
                      >
                        Lanjut Lv.{hud.level + 1} →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* GAME OVER OVERLAY */}
            {hud.phase === 'gameover' && (
              <div className="absolute inset-0 z-30 bg-[#13293D]/70 backdrop-blur-[3px] flex items-center justify-center p-4 overflow-y-auto">
                <div className="draft-card rounded-2xl p-5 sm:p-6 max-w-md w-full text-center space-y-4 animate-pop-in my-auto">
                  <div>
                    <span className="inline-block text-xs font-extrabold uppercase tracking-wider bg-[#FF5A36] text-white px-2.5 py-0.5 rounded-full border border-[#13293D]">
                      Energi Habis
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold mt-1.5">
                      Sesi Selesai!
                    </h2>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2.5">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Skor Akhir</div>
                      <div className="font-mono-math text-xl font-extrabold text-[#FF5A36]">
                        {hud.score}
                      </div>
                    </div>
                    <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2.5">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Level</div>
                      <div className="font-mono-math text-xl font-extrabold text-[#1D63DC]">
                        {hud.level}
                      </div>
                    </div>
                    <div className="bg-[#FAF7F0] border-2 border-[#13293D] rounded-xl p-2.5">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Combo Max</div>
                      <div className="font-mono-math text-xl font-extrabold text-[#059669]">
                        {hud.bestCombo}x
                      </div>
                    </div>
                  </div>

                  {/* Save to Local High-Score Table */}
                  {isTopScore('arcade', hud.score) && !scoreSaved ? (
                    <form onSubmit={handleSaveScore} className="space-y-2 text-left">
                      <label className="text-xs font-bold text-[#059669] flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" /> Rekor Baru! Simpan ke Papan Skor Lokal:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={18}
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="Nama / Kelas (mis. Budi X-1)"
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
                      Skor berhasil tersimpan di Papan Skor Lokal!
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      onClick={restartGame}
                      className="flex-1 draft-btn bg-[#FF5A36] text-white font-display font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-base"
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
          </div>
        </div>

        {/* Bottom Tactile Arcade Control Bar (Desktop & Touch-Friendly!) */}
        <div className="draft-card rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Contextual CT Insight & Optional c Height Control */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[220px]">
            {hud.stage.allowAdjustC ? (
              <div className="flex items-center gap-1.5 bg-[#10B981]/10 border-2 border-[#13293D] rounded-xl px-2.5 py-1.5">
                <span className="text-xs font-extrabold text-[#047857] font-mono-math">
                  c = {formatNum(p.c, 1)}
                </span>
                <button
                  onClick={() => adjustLaunchC(-0.4)}
                  disabled={hud.phase !== 'aiming'}
                  className="draft-btn bg-white w-7 h-7 rounded-lg font-mono-math font-extrabold text-sm flex items-center justify-center"
                  title="Turunkan c (Q)"
                >
                  −
                </button>
                <button
                  onClick={() => adjustLaunchC(0.4)}
                  disabled={hud.phase !== 'aiming'}
                  className="draft-btn bg-white w-7 h-7 rounded-lg font-mono-math font-extrabold text-sm flex items-center justify-center"
                  title="Naikkan c (E)"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FF5A36] border border-[#13293D]" />
                <span>
                  Geser titik <strong className="text-[#13293D]">P(xp, yp)</strong> di grafik atau pakai{' '}
                  <strong className="text-[#13293D]">WASD / Panah</strong>
                </span>
              </div>
            )}

            <p className="hidden md:block text-xs text-slate-500 border-l-2 border-slate-200 pl-3">
              💡 {hud.stage.ctTip}
            </p>
          </div>

          {/* Right: Big Juicy Launch CTA */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={restartGame}
              className="draft-btn bg-[#FAF7F0] text-[#13293D] px-3 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5"
              title="Mulai Ulang (R)"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Ulang</span>
            </button>
            <button
              onClick={launchShot}
              disabled={hud.phase !== 'aiming'}
              className={`flex-1 sm:flex-none draft-btn bg-[#FF5A36] hover:bg-[#F04B27] text-white font-display font-bold text-base sm:text-lg px-7 py-3 rounded-xl flex items-center justify-center gap-2 ${
                hud.phase === 'aiming' ? 'pulse-cta' : ''
              }`}
            >
              <Play className="w-5 h-5 fill-white" />
              <span>
                {hud.stage.curveMode === 'up' ? 'LUNCURKAN KERETA!' : 'TEMBAK!'}
              </span>
              <span className="hidden sm:inline text-xs font-mono-math bg-black/20 px-1.5 py-0.5 rounded">
                SPASI
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
