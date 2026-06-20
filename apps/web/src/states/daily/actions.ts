import type { DailyCall } from "@daily-co/daily-js";
import { DailyStateData } from "./state.ts";

export interface DailyActions {
  initDaily: (daily: DailyCall | null) => void;
}

export const createDailyActions = (
  set: (arg: Partial<DailyStateData>) => void,
): DailyActions => ({
  initDaily: (daily) => set({ daily }),
});
