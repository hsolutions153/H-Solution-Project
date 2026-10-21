"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BrandMark } from "@h-mobility/ui";
import { prefersReducedMotion } from "./use-reveal";

/**
 * Full-screen splash shown while the session is verified. Fades in after a short delay
 * so fast checks never flash it; the bar sweeps to show the app is still working.
 */
export function PageLoader({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set(root.current, { autoAlpha: 1 });
        return;
      }
      const tl = gsap.timeline({ delay: 0.15 });
      tl.to(root.current, { autoAlpha: 1, duration: 0.3, ease: "power1.out" })
        .from(".page-loader-mark", { scale: 0.85, duration: 0.5, ease: "back.out(1.7)" }, "<");

      gsap.to(".page-loader-mark", {
        scale: 1.06,
        duration: 0.9,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 0.65,
      });
      gsap.fromTo(
        ".page-loader-bar",
        { xPercent: -100 },
        { xPercent: 250, duration: 1.1, ease: "power2.inOut", repeat: -1 },
      );
    },
    { scope: root },
  );

  return (
    <div ref={root} className="page-loader" role="status" aria-live="polite">
      <div className="page-loader-mark">
        <BrandMark size={64} />
      </div>
      <div className="page-loader-track" aria-hidden>
        <span className="page-loader-bar" />
      </div>
      <p className="page-loader-label">{label}</p>
    </div>
  );
}
