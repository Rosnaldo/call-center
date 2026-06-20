import type { DailyCall } from "@daily-co/daily-js";

export interface DailyStateData {
  daily: DailyCall | null;
}

export const initialDailyState: DailyStateData = {
  daily: null,
};
