"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fade + slide in every element matching `selector` inside the returned scope, in DOM order.
 * Elements that already played are tagged `data-revealed`, so re-renders (polling, data
 * arriving later) only animate the newly mounted ones instead of replaying the page.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  dependencies: unknown[] = [],
  selector = "[data-reveal]",
) {
  const scope = useRef<T>(null);

  useGSAP(
    () => {
      const targets = gsap.utils
        .toArray<HTMLElement>(selector, scope.current)
        .filter((el) => !el.hasAttribute("data-revealed"));
      if (!targets.length) return;
      targets.forEach((el) => el.setAttribute("data-revealed", ""));
      // Runs on unmount (and Strict Mode's double mount) so a remount plays the entrance again.
      const cleanup = () => targets.forEach((el) => el.removeAttribute("data-revealed"));
      if (prefersReducedMotion()) return cleanup;

      // Cards carry CSS transitions on transform; pause them so they don't fight the tween.
      gsap.set(targets, { transition: "none" });
      gsap.from(targets, {
        autoAlpha: 0,
        y: 18,
        duration: 0.55,
        ease: "power3.out",
        stagger: 0.07,
        clearProps: "opacity,visibility,transform,transition",
      });
      return cleanup;
    },
    { scope, dependencies },
  );

  return scope;
}
