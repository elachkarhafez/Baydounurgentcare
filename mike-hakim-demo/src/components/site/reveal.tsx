"use client";
import { motion, useReducedMotion } from "motion/react";

export function Reveal({ children, delay = 0, y = 22, className, as = "div" }: { children: React.ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li" }) {
  const reduce = useReducedMotion();
  const C = motion[as];
  return (
    <C className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </C>
  );
}
