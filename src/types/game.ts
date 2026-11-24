export type AppScreen = 'start' | 'arcade' | 'ct-sprint' | 'materi';

export type ContextTheme = 'basket' | 'fountain' | 'bridge' | 'rocket' | 'profit';

export type CtPillar = 'Dekomposisi' | 'Pengenalan Pola' | 'Abstraksi' | 'Algoritma';

export interface StarItem {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  isVertexStar?: boolean;
}

export interface WallObstacle {
  x: number;
  width: number;
  yBottom: number;
  yTop: number;
  label?: string;
}

export interface StageConfig {
  level: number;
  theme: ContextTheme;
  title: string;
  subtitle: string;
  ctTip: string;
  ctPillar: CtPillar;
  /** 'down' means a < 0 (parabola opens down: basket, fountain, rocket, profit). 'up' means a > 0 (suspension cable bridge). */
  curveMode: 'down' | 'up';
  launchX: number;
  launchY: number; // default c
  allowAdjustC: boolean;
  minC: number;
  maxC: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
  targetMoving?: {
    axis: 'x' | 'y';
    amplitude: number;
    speed: number;
  };
  walls: WallObstacle[];
  stars: StarItem[];
  /** After higher levels, hide dashed preview past x = xp so student applies symmetry CT */
  symmetryBlind: boolean;
  /** Initial handle position (xp, yp) for player convenience */
  initialXp: number;
  initialYp: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  shape: 'circle' | 'square' | 'star' | 'ring';
  gravity: number;
  rotation: number;
  vRot: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface CtQuestion {
  id: string;
  pillar: CtPillar;
  theme: ContextTheme;
  prompt: string;
  contextBadge: string;
  /** Optional graph parameters drawn live on canvas */
  graph?: {
    a: number;
    b: number;
    c: number;
    highlightVertex?: boolean;
    highlightRoots?: boolean;
    highlightYIntercept?: boolean;
    hideEquation?: boolean;
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
  };
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface HighScoreEntry {
  id: string;
  name: string;
  score: number;
  mode: 'arcade' | 'ct-sprint';
  stageOrAccuracy: string;
  date: string;
}

export interface LearningScenario {
  id: ContextTheme;
  title: string;
  tagline: string;
  emoji: string;
  badgeColor: string;
  story: string;
  equationLabel: string;
  defaultA: number;
  defaultB: number;
  defaultC: number;
  minA: number;
  maxA: number;
  minB: number;
  maxB: number;
  minC: number;
  maxC: number;
  xLabel: string;
  yLabel: string;
  pillars: {
    pillar: CtPillar;
    description: string;
    formulaHint: string;
  }[];
}
