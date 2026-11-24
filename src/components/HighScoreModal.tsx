import React, { useState } from 'react';
import { Crown, RotateCcw, Trophy, X, Zap } from 'lucide-react';
import { getScoresByMode, resetHighScores } from '../utils/storage';
import { sound } from '../utils/sound';

interface HighScoreModalProps {
  initialTab?: 'arcade' | 'ct-sprint';
  onClose: () => void;
}

export const HighScoreModal: React.FC<HighScoreModalProps> = ({
  initialTab = 'arcade',
  onClose,
}) => {
  const [tab, setTab] = useState<'arcade' | 'ct-sprint'>(initialTab);
  const [, setRefresh] = useState<number>(0);

  const scores = getScoresByMode(tab);

  const handleReset = () => {
    sound.playClick();
    resetHighScores();
    setRefresh((r) => r + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#13293D]/65 backdrop-blur-[3px] flex items-center justify-center p-4">
      <div className="draft-card rounded-2xl max-w-lg w-full overflow-hidden animate-pop-in">
        {/* Header */}
        <div className="bg-[#13293D] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B] text-[#13293D] flex items-center justify-center border-2 border-white/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg leading-tight">Papan Skor Lokal</h2>
              <p className="text-[11px] text-slate-300">Tersimpan otomatis di perangkat ini</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="p-4 pb-2 flex gap-2 bg-[#FAF7F0] border-b-2 border-[#13293D]/10">
          <button
            onClick={() => {
              sound.playClick();
              setTab('arcade');
            }}
            className={`flex-1 draft-btn py-2 px-3 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-1.5 ${
              tab === 'arcade' ? 'bg-[#FF5A36] text-white' : 'bg-white text-[#13293D]'
            }`}
          >
            <Crown className="w-4 h-4" /> Parabola Arch!
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setTab('ct-sprint');
            }}
            className={`flex-1 draft-btn py-2 px-3 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center justify-center gap-1.5 ${
              tab === 'ct-sprint' ? 'bg-[#1D63DC] text-white' : 'bg-white text-[#13293D]'
            }`}
          >
            <Zap className="w-4 h-4" /> Dekode CT Sprint
          </button>
        </div>

        {/* Score List */}
        <div className="p-4 bg-white max-h-[340px] overflow-y-auto space-y-2">
          {scores.map((entry, idx) => {
            const medalBg =
              idx === 0
                ? 'bg-[#F59E0B] text-[#13293D]'
                : idx === 1
                  ? 'bg-slate-300 text-[#13293D]'
                  : idx === 2
                    ? 'bg-[#D97706] text-white'
                    : 'bg-[#FAF7F0] text-slate-600';

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border-2 ${
                  idx === 0
                    ? 'border-[#13293D] bg-[#FFFBEB]'
                    : 'border-[#13293D]/15 bg-[#FAF7F0]/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 shrink-0 rounded-lg border border-[#13293D] font-mono-math font-extrabold text-xs flex items-center justify-center ${medalBg}`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#13293D] truncate">{entry.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span className="font-semibold text-[#1D63DC]">{entry.stageOrAccuracy}</span>
                      <span>•</span>
                      <span>{entry.date}</span>
                    </div>
                  </div>
                </div>
                <div className="font-mono-math font-extrabold text-base sm:text-lg text-[#13293D] shrink-0">
                  {entry.score}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#FAF7F0] border-t-2 border-[#13293D]/15 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-xs font-bold text-slate-500 hover:text-[#E11D48] flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset ke Default
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="draft-btn bg-[#13293D] text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
