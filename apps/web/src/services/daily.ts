import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { useDevicesStore } from "../states/stores.ts";

export interface JoinOptions {
  room: string;
  userId: string;
  userName: string;
}

export interface IDailyService {
  join(options: JoinOptions): Promise<void>;
  leave(): Promise<void>;
  destroy(): void;
  rebuild(): void;
}

interface DailyServiceConfig {
  domain: string;
  apiKey: string;
}

export type CallObjectChangedCallback = (callObject: DailyCall) => void;

export class DailyService implements IDailyService {
  private static instance: DailyService;
  private _callObject: DailyCall;
  private _onCallObjectChanged?: CallObjectChangedCallback;

  get callObject(): DailyCall {
    return this._callObject;
  }

  private constructor(private readonly config: DailyServiceConfig) {
    this._callObject = DailyIframe.createCallObject();
  }

  static getInstance(config?: DailyServiceConfig): DailyService {
    if (!DailyService.instance) {
      if (!config) throw new Error('DailyService not initialized. Call getInstance(config) first.');
      DailyService.instance = new DailyService(config);
    }
    return DailyService.instance;
  }

  onCallObjectChanged(cb: CallObjectChangedCallback): void {
    this._onCallObjectChanged = cb;
  }

  destroy(): void {
    this._callObject.destroy();
  }

  rebuild(): void {
    this._callObject.destroy();
    this._callObject = DailyIframe.createCallObject();
    this._onCallObjectChanged?.(this._callObject);
  }

  roomUrl(roomName: string): string {
    return `https://${this.config.domain}.daily.co/${roomName}`;
  }

  async getMeetingToken(roomName: string, userId: string): Promise<string | undefined> {
    if (!this.config.apiKey) return undefined;

    const res = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ properties: { room_name: roomName, user_id: userId } }),
    });

    if (!res.ok) {
      console.error('[Daily] failed to create meeting token:', res.status);
      return undefined;
    }

    const data = await res.json();
    return data.token;
  }

  private async ensureRoom(roomName: string): Promise<void> {
    const res = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
    });

    if (res.ok) return;

    const createRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({ name: roomName }),
    });

    if (!createRes.ok) {
      console.error('[Daily] failed to create room:', createRes.status);
    }
  }

  async join(options: JoinOptions) {
    await this.ensureRoom(options.room);
    const token = await this.getMeetingToken(options.room, options.userId);

    if (!token) {
      // Without a token, Daily never learns this participant's user_id, so
      // anything keyed on it downstream (eject-by-user-id, analytics) won't
      // recognize them. Not fatal — the call can proceed unidentified — but
      // it must be loud since it's otherwise a silent degradation.
      console.error('[Daily] joining without a meeting token — participant will have no user_id on Daily side', { room: options.room, userId: options.userId });
    }

    await this._callObject.join({
      url: this.roomUrl(options.room),
      token: token ?? undefined,
      userName: options.userName,
      startAudioOff: !useDevicesStore.getState().microphoneDailycoOn,
      startVideoOff: !useDevicesStore.getState().cameraDailycoOn,
    });
  }

  async leave() {
    await this._callObject.leave();
  }
}

