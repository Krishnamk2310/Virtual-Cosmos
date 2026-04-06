import { useState } from 'react';

const HINTS = [
  'Explorer', 'Wanderer', 'Voyager', 'Pioneer', 'Navigator',
  'Astronaut', 'Stargazer', 'Cosmonaut',
];

const SPRITES = [
  { id: 'human-1', label: 'Classic', color: '#6366f1' },
  { id: 'human-2', label: 'Azure', color: '#3b82f6' },
  { id: 'human-3', label: 'Emerald', color: '#10b981' },
  { id: 'robot-1', label: 'Cyborg', color: '#94a3b8' },
  { id: 'alien-1', label: 'Martian', color: '#a855f7' },
];

export default function LoginScreen({ onJoin }) {
  const [username, setUsername] = useState('');
  const [selectedSprite, setSelectedSprite] = useState(SPRITES[0].id);
  const placeholder = HINTS[Math.floor(Math.random() * HINTS.length)];

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (name.length < 1) return;
    onJoin(name, selectedSprite);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0b0d14]">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 40%, #1e3a5f 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, #2d1b4e 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6">
        <div className="text-center">
          <div className="text-6xl mb-4 select-none">🌌</div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Virtual Cosmos
          </h1>
          <p className="text-white/40 mt-1 text-sm font-light">
            Pick your character and enter the space
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-3">
             <label className="text-white/30 text-[10px] font-bold uppercase tracking-widest px-1">
               Choose Avatar
             </label>
             <div className="grid grid-cols-5 gap-2">
                {SPRITES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSprite(s.id)}
                    className={`aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedSprite === s.id 
                        ? 'border-white/40 bg-white/10 ring-2 ring-white/10' 
                        : 'border-white/5 bg-white/5 hover:bg-white/8 hover:border-white/10'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded-lg shadow-sm" 
                      style={{ background: s.color }}
                    />
                    <span className="text-[8px] text-white/40 font-bold uppercase truncate w-full text-center px-1">
                       {s.label}
                    </span>
                  </button>
                ))}
             </div>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={placeholder}
              maxLength={24}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/5 text-white placeholder-white/20 border border-white/10 focus:border-white/25 focus:outline-none text-sm transition-all"
            />
            <button
              type="submit"
              disabled={!username.trim()}
              className="py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-xl active:scale-[0.98]"
              style={{
                background: username.trim()
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.06)',
                opacity: username.trim() ? 1 : 0.5,
                cursor: username.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Enter Cosmos
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-1.5 text-white/25 text-xs">
          <p>
            <span className="text-white/40 font-medium">WASD</span> or{' '}
            <span className="text-white/40 font-medium">Arrow Keys</span> to move
          </p>
        </div>
      </div>
    </div>
  );
}
