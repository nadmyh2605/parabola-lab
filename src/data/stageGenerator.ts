import { ContextTheme, CtPillar, StageConfig, StarItem, WallObstacle } from '../types/game';

export const WORLD_WIDTH = 16;
export const WORLD_HEIGHT = 10;

export interface ParabolaParams {
  a: number;
  b: number;
  c: number;
  xp: number;
  yp: number;
  discriminant: number;
}

/**
 * Computes exact quadratic coefficients f(x) = ax^2 + bx + c
 * given Y-intercept (0, c) and vertex (xp, yp).
 */
export function computeParabolaFromVertex(xp: number, yp: number, c: number): ParabolaParams {
  const safeXp = Math.abs(xp) < 0.4 ? 0.4 : xp;
  const a = (c - yp) / (safeXp * safeXp);
  const b = -2 * a * safeXp;
  const discriminant = b * b - 4 * a * c;
  return { a, b, c, xp: safeXp, yp, discriminant };
}

export function evalParabola(p: ParabolaParams, x: number): number {
  return p.a * (x - p.xp) * (x - p.xp) + p.yp;
}

export function formatSigned(num: number, decimals = 2): string {
  const rounded = Number(num.toFixed(decimals));
  if (Object.is(rounded, -0) || rounded === 0) return '+ 0';
  return rounded >= 0 ? `+ ${Math.abs(rounded).toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}` : `- ${Math.abs(rounded).toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}`;
}

export function formatNum(num: number, decimals = 2): string {
  const rounded = Number(num.toFixed(decimals));
  if (Object.is(rounded, -0)) return '0';
  return rounded.toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function makeStars(sol: ParabolaParams, targetX: number, extraMid: boolean): StarItem[] {
  const stars: StarItem[] = [
    {
      id: 1,
      x: Number(sol.xp.toFixed(2)),
      y: Number(sol.yp.toFixed(2)),
      collected: false,
      isVertexStar: true,
    },
  ];
  if (extraMid) {
    const midX = (sol.xp + targetX) * 0.52;
    const midY = evalParabola(sol, midX);
    if (midY > 0.9 && midY < 9.2) {
      stars.push({
        id: 2,
        x: Number(midX.toFixed(2)),
        y: Number(midY.toFixed(2)),
        collected: false,
      });
    }
  }
  return stars;
}

/**
 * Generates mathematically guaranteed-solvable stages.
 * Levels 1-5 are curated to introduce each daily-life context & CT concept within the first minute!
 */
export function generateStage(level: number): StageConfig {
  // Stage 1: Instant fun! Wide basketball hoop, gentle arc, instant intuition within 5 seconds
  if (level === 1) {
    const c = 2.0;
    const sol = computeParabolaFromVertex(6.0, 7.2, c);
    const targetX = 11.5;
    const targetY = evalParabola(sol, targetX);
    return {
      level: 1,
      theme: 'basket',
      title: 'Lemparan 3-Poin Basket',
      subtitle: 'Tarik Titik Puncak (xp, yp) agar bola melengkung masuk ring!',
      ctTip: 'Dekomposisi: Puncak (xp, yp) menentukan lengkungan a < 0 dan arah tembakan.',
      ctPillar: 'Dekomposisi',
      curveMode: 'down',
      launchX: 0,
      launchY: c,
      allowAdjustC: false,
      minC: c,
      maxC: c,
      targetX,
      targetY,
      targetRadius: 0.95,
      walls: [],
      stars: makeStars(sol, targetX, true),
      symmetryBlind: false,
      initialXp: 4.5,
      initialYp: 5.4,
    };
  }

  // Stage 2: Air Mancur Taman — Wall obstacle teaches raising vertex yp!
  if (level === 2) {
    const c = 1.2;
    const sol = computeParabolaFromVertex(6.5, 7.8, c);
    const targetX = 12.6;
    const targetY = evalParabola(sol, targetX);
    const wallX = 6.2;
    const safeH = evalParabola(sol, wallX);
    return {
      level: 2,
      theme: 'fountain',
      title: 'Air Mancur Taman Kota',
      subtitle: 'Lewati patung taman dan arahkan semburan tepat ke kolam!',
      ctTip: 'Pengenalan Pola: Semakin tinggi yp, lengkungan melewati tembok & tetap simetris di x = xp.',
      ctPillar: 'Pengenalan Pola',
      curveMode: 'down',
      launchX: 0,
      launchY: c,
      allowAdjustC: false,
      minC: c,
      maxC: c,
      targetX,
      targetY,
      targetRadius: 0.9,
      walls: [
        {
          x: wallX,
          width: 0.75,
          yBottom: 0,
          yTop: Math.min(safeH - 1.4, 5.8),
          label: 'Patung',
        },
      ],
      stars: makeStars(sol, targetX, true),
      symmetryBlind: false,
      initialXp: 5.0,
      initialYp: 4.8,
    };
  }

  // Stage 3: Jembatan Kabel Gantung — a > 0 (Upward-opening parabola!)
  if (level === 3) {
    const c = 7.6;
    const sol = computeParabolaFromVertex(6.8, 2.4, c);
    const targetX = 13.4;
    const targetY = evalParabola(sol, targetX);
    return {
      level: 3,
      theme: 'bridge',
      title: 'Kabel Jembatan Gantung',
      subtitle: 'Mode a > 0! Bentuk kabel terbuka ke ATAS melewati atas kapal sungai!',
      ctTip: 'Pengenalan Pola: a > 0 & D < 0 (Definit Positif) → titik terendah kabel aman di atas sungai!',
      ctPillar: 'Pengenalan Pola',
      curveMode: 'up',
      launchX: 0,
      launchY: c,
      allowAdjustC: false,
      minC: c,
      maxC: c,
      targetX,
      targetY,
      targetRadius: 0.95,
      walls: [
        {
          x: 6.4,
          width: 1.5,
          yBottom: 0,
          yTop: 1.4,
          label: 'Kapal',
        },
      ],
      stars: makeStars(sol, targetX, true),
      symmetryBlind: false,
      initialXp: 6.0,
      initialYp: 4.6,
    };
  }

  // Stage 4: Roket Air IPA — Introduces adjusting launch height c (Q/E or slider)!
  if (level === 4) {
    const c = 2.6;
    const sol = computeParabolaFromVertex(7.2, 8.2, c);
    const targetX = 13.6;
    const targetY = evalParabola(sol, targetX);
    const wallX = 9.2;
    const safeH = evalParabola(sol, wallX);
    return {
      level: 4,
      theme: 'rocket',
      title: 'Roket Air Ekskul IPA',
      subtitle: 'Atur titik puncak & tinggi awal c (Q/E atau slider c) melewati menara!',
      ctTip: 'Abstraksi: Mengubah tinggi peluncur c menggeser titik potong sumbu-Y secara langsung.',
      ctPillar: 'Abstraksi',
      curveMode: 'down',
      launchX: 0,
      launchY: 1.5, // player can adjust c OR still solve from 1.5
      allowAdjustC: true,
      minC: 0.8,
      maxC: 4.5,
      targetX,
      targetY,
      targetRadius: 0.88,
      walls: [
        {
          x: wallX,
          width: 0.8,
          yBottom: 0,
          yTop: Math.min(safeH - 1.35, 6.0),
          label: 'Menara',
        },
      ],
      stars: makeStars(sol, targetX, true),
      symmetryBlind: false,
      initialXp: 5.5,
      initialYp: 6.0,
    };
  }

  // Stage 5: Laba Kantin Sekolah — Moving target zone!
  if (level === 5) {
    const c = 1.6;
    const sol = computeParabolaFromVertex(6.8, 7.6, c);
    const targetX = 12.8;
    const targetY = evalParabola(sol, targetX);
    return {
      level: 5,
      theme: 'profit',
      title: 'Target Laba Kantin SMK',
      subtitle: 'Zona target bergerak naik-turun! Hitung waktu peluncuran yang pas.',
      ctTip: 'Algoritma: Amati ritme target, posisikan kurva, lalu luncurkan pada timing tepat!',
      ctPillar: 'Algoritma',
      curveMode: 'down',
      launchX: 0,
      launchY: c,
      allowAdjustC: true,
      minC: 0.6,
      maxC: 4.0,
      targetX,
      targetY,
      targetRadius: 0.9,
      targetMoving: {
        axis: 'y',
        amplitude: 1.05,
        speed: 1.5,
      },
      walls: [
        {
          x: 6.5,
          width: 0.7,
          yBottom: 0,
          yTop: 4.8,
          label: 'Biaya',
        },
      ],
      stars: makeStars(sol, targetX, true),
      symmetryBlind: false,
      initialXp: 5.5,
      initialYp: 5.8,
    };
  }

  // Procedural Escalating Stages (Level 6+)
  const themes: ContextTheme[] = ['basket', 'fountain', 'bridge', 'rocket', 'profit'];
  const theme = themes[(level - 1) % themes.length];
  const isBridge = theme === 'bridge';

  const pillars: CtPillar[] = ['Dekomposisi', 'Pengenalan Pola', 'Abstraksi', 'Algoritma'];
  const ctPillar = pillars[level % pillars.length];

  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const symmetryBlind = level >= 7 && level % 2 === 1;

  if (isBridge) {
    const c = Number(rand(6.8, 8.4).toFixed(1));
    const solXp = Number(rand(5.8, 8.0).toFixed(1));
    const solYp = Number(rand(1.8, 3.3).toFixed(1));
    const sol = computeParabolaFromVertex(solXp, solYp, c);
    let targetX = Number(rand(solXp + 4.4, Math.min(14.5, solXp * 2 + 0.5)).toFixed(1));
    let targetY = evalParabola(sol, targetX);
    if (targetY > 8.6) {
      targetX = Number((solXp * 1.92).toFixed(1));
      targetY = evalParabola(sol, targetX);
    }
    const safeShipTop = Math.max(0.8, solYp - 0.95);
    const walls: WallObstacle[] = [
      {
        x: solXp - 0.6,
        width: 1.4,
        yBottom: 0,
        yTop: Math.min(safeShipTop, 2.2),
        label: 'Kapal',
      },
    ];

    return {
      level,
      theme: 'bridge',
      title: `Jembatan Gantung Lv.${level}`,
      subtitle: symmetryBlind
        ? 'Mode Simetri CT! Paruh kanan tersembunyi—gunakan simetri x = xp!'
        : 'Bentuk kabel terbuka ke atas (a > 0) menuju menara seberang!',
      ctTip: symmetryBlind
        ? 'Pengenalan Pola: Jarak dari puncak xp ke menara kanan simetris dengan sisi kiri!'
        : 'Dekomposisi: Titik terendah (xp, yp) harus di atas kapal sungai agar aman (D < 0).',
      ctPillar: symmetryBlind ? 'Pengenalan Pola' : ctPillar,
      curveMode: 'up',
      launchX: 0,
      launchY: c,
      allowAdjustC: level >= 8,
      minC: 5.5,
      maxC: 8.8,
      targetX,
      targetY: Math.max(2.2, Math.min(8.5, targetY)),
      targetRadius: Math.max(0.72, 0.92 - level * 0.015),
      targetMoving:
        level >= 9
          ? { axis: 'y', amplitude: 0.75, speed: Math.min(2.3, 1.3 + level * 0.08) }
          : undefined,
      walls,
      stars: makeStars(sol, targetX, true),
      symmetryBlind,
      initialXp: 6.2,
      initialYp: 4.8,
    };
  }

  // Projectile (downward parabola, a < 0)
  const c = Number(rand(1.0, 3.2).toFixed(1));
  const solXp = Number(rand(5.4, 8.2).toFixed(1));
  const solYp = Number(rand(6.6, 8.8).toFixed(1));
  const sol = computeParabolaFromVertex(solXp, solYp, c);

  // Pick a targetX where targetY is nicely inside [1.6, 6.2]
  let targetX = Number(rand(solXp + 3.6, Math.min(14.6, solXp * 2.05)).toFixed(1));
  let targetY = evalParabola(sol, targetX);
  while ((targetY < 1.5 || targetY > 6.5) && targetX > solXp + 2.5) {
    targetX -= 0.4;
    targetY = evalParabola(sol, targetX);
  }
  targetY = Math.max(1.5, Math.min(6.8, targetY));

  // Build 1 or 2 guaranteed-passable walls
  const walls: WallObstacle[] = [];
  const wall1X = Number(rand(Math.max(3.5, solXp - 2.2), Math.min(targetX - 2.2, solXp + 2.2)).toFixed(1));
  const safe1 = evalParabola(sol, wall1X);
  if (safe1 > 2.6) {
    walls.push({
      x: wall1X,
      width: 0.75,
      yBottom: 0,
      yTop: Number(Math.min(safe1 - 1.3, 6.4).toFixed(2)),
      label: theme === 'basket' ? 'Bek' : theme === 'fountain' ? 'Tembok' : theme === 'rocket' ? 'Menara' : 'Biaya',
    });
  }

  if (level >= 8 && targetX - solXp > 4.2) {
    const wall2X = Number((targetX - 2.0).toFixed(1));
    if (Math.abs(wall2X - wall1X) > 2.2) {
      const safe2 = evalParabola(sol, wall2X);
      if (safe2 > 2.5) {
        walls.push({
          x: wall2X,
          width: 0.65,
          yBottom: 0,
          yTop: Number(Math.min(safe2 - 1.35, 5.2).toFixed(2)),
          label: 'Pagar',
        });
      }
    }
  }

  const titleMap: Record<ContextTheme, string> = {
    basket: `Tembakan Basket Lv.${level}`,
    fountain: `Air Mancur Taman Lv.${level}`,
    bridge: `Jembatan Gantung Lv.${level}`,
    rocket: `Roket Air IPA Lv.${level}`,
    profit: `Optimasi Laba Lv.${level}`,
  };

  return {
    level,
    theme,
    title: titleMap[theme],
    subtitle: symmetryBlind
      ? 'Mode Simetri CT! Garis bantu kanan tersembunyi—prediksi titik jatuh dengan simetri!'
      : 'Rancang fungsi kuadrat melewati penghalang dan kumpulkan bintang puncak!',
    ctTip: symmetryBlind
      ? 'Pengenalan Pola: Jika x puncak = xp, kurva turun dengan kecepatan cermin dari sisi naiknya!'
      : 'Algoritma: Sesuaikan puncak (xp, yp) dan tinggi awal c agar kurva melewati bintang & target.',
    ctPillar: symmetryBlind ? 'Pengenalan Pola' : ctPillar,
    curveMode: 'down',
    launchX: 0,
    launchY: c,
    allowAdjustC: level >= 4,
    minC: 0.6,
    maxC: 4.5,
    targetX,
    targetY,
    targetRadius: Math.max(0.7, 0.9 - level * 0.014),
    targetMoving:
      level >= 6 && level % 2 === 0
        ? {
            axis: level % 4 === 0 ? 'x' : 'y',
            amplitude: level % 4 === 0 ? 0.9 : 1.0,
            speed: Math.min(2.4, 1.35 + level * 0.09),
          }
        : undefined,
    walls,
    stars: makeStars(sol, targetX, true),
    symmetryBlind,
    initialXp: 5.0,
    initialYp: Math.min(8.5, c + 3.2),
  };
}
