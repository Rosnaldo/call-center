import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

interface JoinOptions {
  room: string;
  userName: string;
  userData: Record<string, unknown>;
  startAudioOff: boolean;
  startVideoOff: boolean;
}

interface DailyServiceConfig {
  domain: string;
  apiKey: string;
}

export class DailyService {
  private static instance: DailyService;
  readonly callObject: DailyCall;

  private constructor(private readonly config: DailyServiceConfig) {
    this.callObject = DailyIframe.createCallObject();
  }

  static getInstance(config?: DailyServiceConfig): DailyService {
    if (!DailyService.instance) {
      if (!config) throw new Error('DailyService not initialized. Call getInstance(config) first.');
      DailyService.instance = new DailyService(config);
    }
    return DailyService.instance;
  }

  roomUrl(roomName: string): string {
    return `https://${this.config.domain}.daily.co/${roomName}`;
  }

  async getMeetingToken(roomName: string): Promise<string | undefined> {
    if (!this.config.apiKey) return undefined;

    const res = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ properties: { room_name: roomName } }),
    });

    if (!res.ok) {
      console.error('[Daily] failed to create meeting token:', res.status);
      return undefined;
    }

    const data = await res.json();
    return data.token;
  }

  async join(options: JoinOptions) {
    const token = await this.getMeetingToken(options.room);

    await this.callObject.join({
      url: this.roomUrl(options.room),
      token: token ?? undefined,
      userName: options.userName,
      userData: options.userData,
      startAudioOff: options.startAudioOff,
      startVideoOff: options.startVideoOff,
    });
  }

  async leave() {
    await this.callObject.leave();
  }
}

