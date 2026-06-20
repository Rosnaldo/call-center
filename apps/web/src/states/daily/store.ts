import { create } from "zustand";
import { DailyStateData, initialDailyState } from "./state.ts";
import { DailyActions, createDailyActions } from "./actions.ts";

export const useDailyStore = create<DailyStateData & DailyActions>((set) => ({
  ...initialDailyState,
  ...createDailyActions(set),
}));
