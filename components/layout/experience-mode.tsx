"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ExperienceMode = "easy" | "advanced";

const ExperienceModeContext = createContext<{
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
}>({ mode: "easy", setMode: () => undefined });

export function ExperienceModeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mode, setModeState] = useState<ExperienceMode>("easy");

  useEffect(() => {
    const saved = window.localStorage.getItem("concierge-experience-mode");
    if (saved === "advanced") setModeState("advanced");
  }, []);

  function setMode(nextMode: ExperienceMode) {
    setModeState(nextMode);
    window.localStorage.setItem("concierge-experience-mode", nextMode);
  }

  return (
    <ExperienceModeContext.Provider value={{ mode, setMode }}>
      <div className="contents" data-experience-mode={mode}>{children}</div>
    </ExperienceModeContext.Provider>
  );
}

export function useExperienceMode() {
  return useContext(ExperienceModeContext);
}

export function ExperienceModeToggle() {
  const { mode, setMode } = useExperienceMode();

  return (
    <div className="flex h-10 shrink-0 items-center rounded-md border border-champagne-700/40 bg-ink-900/80 p-1" aria-label="Experience mode">
      <button
        type="button"
        aria-pressed={mode === "easy"}
        onClick={() => setMode("easy")}
        className={cn("flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium text-muted-foreground transition", mode === "easy" && "bg-champagne-500 text-ink-900")}
      >
        <Sparkles className="size-3.5" />
        Easy
      </button>
      <button
        type="button"
        aria-pressed={mode === "advanced"}
        onClick={() => setMode("advanced")}
        className={cn("flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium text-muted-foreground transition", mode === "advanced" && "bg-champagne-500 text-ink-900")}
      >
        <SlidersHorizontal className="size-3.5" />
        Advanced
      </button>
    </div>
  );
}
