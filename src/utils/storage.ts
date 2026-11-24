import { HighScoreEntry } from '../types/game';

const STORAGE_KEY = 'parabola_lab_highscores_v1';

const DEFAULT_SCORES: HighScoreEntry[] = [
  {
    id: 'seed-1',
    name: 'Nadia X-IPA 1',
    score: 1450,
    mode: 'arcade',
    stageOrAccuracy: 'Level 8',
    date: 'Rekor Kelas',
  },
  {
    id: 'seed-2',
    name: 'Raka SMK-RPL',
    score: 1080,
    mode: 'arcade',
    stageOrAccuracy: 'Level 6',
    date: 'Rekor Kelas',
  },
  {
    id: 'seed-3',
    name: 'Alya MA-X',
    score: 720,
    mode: 'arcade',
    stageOrAccuracy: 'Level 4',
    date: 'Rekor Kelas',
  },
  {
    id: 'seed-ct-1',
    name: 'Dimas X-2',
    score: 1350,
    mode: 'ct-sprint',
    stageOrAccuracy: '92% Akurat',
    date: 'Rekor Kelas',
  },
  {
    id: 'seed-ct-2',
    name: 'Salsa X-TKJ',
    score: 980,
    mode: 'ct-sprint',
    stageOrAccuracy: '85% Akurat',
    date: 'Rekor Kelas',
  },
  {
    id: 'seed-ct-3',
    name: 'Bima MA-1',
    score: 640,
    mode: 'ct-sprint',
    stageOrAccuracy: '78% Akurat',
    date: 'Rekor Kelas',
  },
];

export function loadHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
      return DEFAULT_SCORES;
    }
    const parsed = JSON.parse(raw) as HighScoreEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_SCORES;
    }
    return parsed;
  } catch {
    return DEFAULT_SCORES;
  }
}

export function getScoresByMode(mode: 'arcade' | 'ct-sprint'): HighScoreEntry[] {
  return loadHighScores()
    .filter((entry) => entry.mode === mode)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function saveHighScore(entry: Omit<HighScoreEntry, 'id' | 'date'>): HighScoreEntry[] {
  const all = loadHighScores();
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
  const newEntry: HighScoreEntry = {
    ...entry,
    name: entry.name.trim() || 'Pemain Kelas X',
    id: `hs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: dateStr,
  };

  const modeScores = [...all.filter((s) => s.mode === entry.mode), newEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const otherScores = all.filter((s) => s.mode !== entry.mode);
  const combined = [...modeScores, ...otherScores];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
  } catch {
    // ignore storage quota errors
  }

  return modeScores;
}

export function isTopScore(mode: 'arcade' | 'ct-sprint', score: number): boolean {
  if (score <= 0) return false;
  const current = getScoresByMode(mode);
  if (current.length < 8) return true;
  return score > current[current.length - 1].score;
}

export function getBestScore(mode: 'arcade' | 'ct-sprint'): number {
  const scores = getScoresByMode(mode);
  return scores.length > 0 ? scores[0].score : 0;
}

export function resetHighScores(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
  } catch {
    // ignore
  }
}
