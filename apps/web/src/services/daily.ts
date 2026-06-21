import type { DailyCall } from "@daily-co/daily-js";

function roomUrl(roomName: string): string {
  const domain = import.meta.env.VITE_DAILY_DOMAIN as string | undefined;
  return `https://${domain ?? 'meetcent'}.daily.co/${roomName}`;
}

interface JoinOptions {
  room: string;
  userName: string;
  userData: Record<string, unknown>;
  startAudioOff: boolean;
  startVideoOff: boolean;
}

export const dailyService = {
  async join(daily: DailyCall, options: JoinOptions) {
    await daily.join({
      url: roomUrl(options.room),
      userName: options.userName,
      userData: options.userData,
      startAudioOff: options.startAudioOff,
      startVideoOff: options.startVideoOff,
    });
  },

  async leave(daily: DailyCall) {
    await daily.leave();
  },
};
