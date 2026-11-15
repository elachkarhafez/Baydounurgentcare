"use client";
import { useSyncExternalStore } from "react";
import { getState, subscribe } from "@/lib/store";
import type { DemoState } from "@/lib/types";

const serverSnapshot = () => null;

/** Returns null during SSR/hydration, then the live demo state. */
export function useDemoState(): DemoState | null {
  return useSyncExternalStore(subscribe, getState, serverSnapshot);
}
