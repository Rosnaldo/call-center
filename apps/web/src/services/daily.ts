import type { DailyCall } from "@daily-co/daily-js";

function roomUrl(roomName: string): string {
  const domain = import.meta.env.VITE_DAILY_DOMAIN as string | undefined;
  return `https://${domain ?? 'meetcent'}.daily.co/${roomName}`;
}

export const dailyService = {
  async join(daily: DailyCall, room: string) {
    await daily.join({ url: roomUrl(room) });
  },

  async leave(daily: DailyCall) {
    await daily.leave();
  },
};
