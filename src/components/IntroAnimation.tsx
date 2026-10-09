"use client";
// Intro: a traveller reaches a gap, starts to fall, a bridge forms, they cross, and the bridge becomes the Bridgecom mark.
// Skippable (button, Escape, click), plays once per session, and is replaced by a still frame for reduced-motion users.
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "./Logo";
import { useBridge } from "./ProfileProvider";

const SEEN = "bridgecom.intro.seen";
const DURATION = 5200;

export function IntroAnimation({ force = false, onDone }: { force?: boolean; onDone?: () => void }) {
  const { tr } = useBridge();
  const [show, setShow] = useState(false);
  const [reduced, setReduced] = useState(false);
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === "1"; } catch {}
    if (seen && !force) return;
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(rm);
    setShow(true);
    const timer = setTimeout(() => close(), rm ? 1600 : DURATION);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [force]);

  useEffect(() => {
    if (!show) return;
    skipRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function close() {
    try { sessionStorage.setItem(SEEN, "1"); } catch {}
    setShow(false);
    onDone?.();
  }

  if (!show) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={tr("Bridgecom introduction", "مقدمة بريدجكوم")}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ivory"
      style={{ animation: reduced ? undefined : `bc-fade-out .5s ease-in ${DURATION - 500}ms forwards` }}
      onClick={close}>
      <style>{`
        @keyframes bc-move { 0% { transform: translateX(0) } 32% { transform: translateX(118px) } 46% { transform: translateX(132px) } 100% { transform: translateX(440px) } }
        @keyframes bc-fall { 0%,32% { transform: translateY(0) rotate(0) } 42% { transform: translateY(34px) rotate(-18deg) } 52% { transform: translateY(-4px) rotate(4deg) } 58%,100% { transform: translateY(0) rotate(0) } }
        @keyframes bc-scene-out { 0%,72% { opacity: 1; transform: scale(1) } 86%,100% { opacity: 0; transform: scale(.92) } }
        @keyframes bc-logo-in { 0%,74% { opacity: 0; transform: scale(.6) } 90%,100% { opacity: 1; transform: scale(1) } }
        .bc-scene { animation: bc-scene-out 4.4s ease-in-out forwards; transform-origin: center; }
        .bc-traveller { animation: bc-move 3.2s cubic-bezier(.45,.05,.4,1) forwards; }
        .bc-body { animation: bc-fall 3.2s ease-in-out forwards; transform-box: fill-box; transform-origin: 50% 100%; }
        .bc-leg-a, .bc-leg-b { transform-box: fill-box; transform-origin: 50% 0; animation: bc-legs .45s ease-in-out 7; }
        .bc-leg-b { animation-direction: reverse; }
        .bc-plank { opacity: 0; transform-box: fill-box; transform-origin: 50% 100%; animation: bc-plank .28s ease-out forwards; }
        .bc-arch { stroke-dasharray: 600; stroke-dashoffset: 600; animation: bc-draw .7s ease-out 1.15s forwards; }
        .bc-logo { opacity: 0; animation: bc-logo-in 4.6s ease-out forwards; }
      `}</style>

      <div className="relative w-full max-w-[640px] px-4" aria-hidden="true">
        {reduced ? (
          <div className="flex flex-col items-center gap-4 py-10">
            <LogoMark size={96} />
            <span className="text-3xl font-bold text-teal">Bridge<span className="text-sage-600">com</span></span>
          </div>
        ) : (
          <>
            <svg viewBox="0 0 640 300" className="bc-scene w-full">
              <path d="M0 300 L0 190 Q90 150 205 170 L205 300 Z" fill="#6F9C94" />
              <path d="M640 300 L640 190 Q550 150 435 170 L435 300 Z" fill="#6F9C94" />
              <path d="M0 300 L0 230 Q120 205 205 225 L205 300 Z" fill="#264653" opacity=".18" />
              <path d="M640 300 L640 230 Q520 205 435 225 L435 300 Z" fill="#264653" opacity=".18" />
              {/* bridge */}
              <path className="bc-arch" d="M205 170 Q320 70 435 170" fill="none" stroke="#264653" strokeWidth="6" strokeLinecap="round" />
              {Array.from({ length: 10 }).map((_, i) => (
                <rect key={i} className="bc-plank" x={205 + i * 23} y={166} width={22} height={8} rx={2} fill="#264653" style={{ animationDelay: `${0.95 + i * 0.05}s` }} />
              ))}
              {[250, 290, 320, 350, 390].map((x, i) => (
                <line key={x} className="bc-plank" x1={x} x2={x} y1={166} y2={x === 320 ? 121 : x === 290 || x === 350 ? 127 : 145} stroke="#264653" strokeWidth="3" style={{ animationDelay: `${1.25 + i * 0.05}s` }} />
              ))}
              {/* traveller */}
              <g className="bc-traveller">
                <g transform="translate(70 120)"><g className="bc-body">
                  <circle cx="10" cy="8" r="8" fill="none" stroke="#1f2a2e" strokeWidth="3.5" />
                  <line x1="10" y1="16" x2="10" y2="34" stroke="#1f2a2e" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="10" y1="22" x2="0" y2="29" stroke="#1f2a2e" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="10" y1="22" x2="20" y2="28" stroke="#1f2a2e" strokeWidth="3.5" strokeLinecap="round" />
                  <line className="bc-leg-a" x1="10" y1="34" x2="10" y2="48" stroke="#1f2a2e" strokeWidth="3.5" strokeLinecap="round" />
                  <line className="bc-leg-b" x1="10" y1="34" x2="10" y2="48" stroke="#1f2a2e" strokeWidth="3.5" strokeLinecap="round" />
                </g></g>
              </g>
              <circle cx="560" cy="60" r="14" fill="#D2A679" opacity=".85" />
            </svg>
            <div className="bc-logo absolute inset-0 flex flex-col items-center justify-center gap-4">
              <LogoMark size={96} />
              <span className="text-3xl font-bold text-teal">Bridge<span className="text-sage-600">com</span></span>
            </div>
          </>
        )}
      </div>
      <p className="mt-2 text-muted bc-rise">{tr("Every gap can be crossed with the right bridge.", "كل فجوة يمكن عبورها بالجسر المناسب.")}</p>
      <button ref={skipRef} type="button" onClick={(e) => { e.stopPropagation(); close(); }}
        className="btn-secondary absolute bottom-8 end-8">{tr("Skip intro", "تخطَّ المقدمة")}</button>
    </div>
  );
}
