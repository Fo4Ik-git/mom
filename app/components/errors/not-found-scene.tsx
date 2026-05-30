"use client";

import type { CSSProperties } from "react";

const ORBITS = [
  { symbol: "+", radius: 88, duration: 14, delay: 0 },
  { symbol: "−", radius: 112, duration: 18, delay: -2 },
  { symbol: "×", radius: 136, duration: 22, delay: -5 },
  { symbol: "÷", radius: 160, duration: 26, delay: -8 },
  { symbol: "7", radius: 184, duration: 30, delay: -3 },
  { symbol: "=", radius: 96, duration: 16, delay: -6 },
  { symbol: "π", radius: 148, duration: 24, delay: -11 },
  { symbol: "%", radius: 172, duration: 28, delay: -4 },
] as const;

export function NotFoundScene() {
  return (
    <div
      className="not-found-scene relative mx-auto flex aspect-square w-full max-w-[min(100%,22rem)] items-center justify-center sm:max-w-md"
      aria-hidden
    >
      <div className="not-found-glow absolute inset-[12%] rounded-full bg-accent/20 blur-3xl" />
      <div className="not-found-ring absolute inset-[8%] rounded-full border border-accent/20" />
      <div className="not-found-ring not-found-ring--slow absolute inset-[2%] rounded-full border border-dashed border-accent/15" />

      {ORBITS.map((item) => (
        <span
          key={`${item.symbol}-${item.radius}`}
          className="not-found-orbit absolute left-1/2 top-1/2 font-mono text-sm font-semibold text-accent/80 sm:text-base"
          style={
            {
              "--orbit-r": `${item.radius}px`,
              "--orbit-d": `${item.duration}s`,
              "--orbit-delay": `${item.delay}s`,
            } as CSSProperties
          }
        >
          <span className="not-found-orbit-body">{item.symbol}</span>
        </span>
      ))}

      <div className="not-found-glitch relative z-10 select-none text-center">
        <span className="not-found-code block font-mono text-[clamp(4.5rem,22vw,7.5rem)] font-bold leading-none tracking-tighter text-foreground">
          4
          <span className="not-found-zero inline-block text-accent">0</span>
          4
        </span>
      </div>

      <div className="not-found-scan absolute inset-x-[15%] top-1/2 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
    </div>
  );
}
