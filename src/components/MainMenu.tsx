"use client";

interface MainMenuProps {
  unlockedWorlds: number;
  onStartWorld: (world: number) => void;
}

const WORLD_LABELS: Record<number, string> = {
  1: "Wereld 1: Het Fundament",
  2: "Wereld 2",
  3: "Wereld 3",
  4: "Wereld 4",
  5: "Wereld 5",
  6: "Wereld 6",
  7: "Wereld 7",
  8: "Wereld 8",
};

export function MainMenu({ unlockedWorlds, onStartWorld }: MainMenuProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 font-opendyslexic">
      <h1 className="mb-12 text-center text-4xl font-bold text-white md:text-5xl">
        Doolwijs
      </h1>
      <p className="mb-10 text-slate-300">Kies een wereld</p>
      <div className="grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((world) => {
          const unlocked = world <= unlockedWorlds;
          return (
            <button
              key={world}
              type="button"
              onClick={() => unlocked && onStartWorld(world)}
              disabled={!unlocked}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl px-4 py-6 text-xl font-bold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                unlocked
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-400"
                  : "cursor-not-allowed bg-slate-600 text-slate-400"
              }`}
            >
              <span className="text-center leading-tight">
                {WORLD_LABELS[world]}
              </span>
              {!unlocked && (
                <span className="text-2xl" aria-hidden>
                  🔒
                </span>
              )}
              {!unlocked && (
                <span className="text-sm font-normal">Locked</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
