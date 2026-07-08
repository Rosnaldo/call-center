import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { MAX_CALL_DURATION_SECONDS } from "@repo/shared-types";
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
  rebuild(): Promise<void>;
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

  async rebuild(): Promise<void> {
    // daily-js only allows one live instance per page at a time, and
    // destroy() is async — creating the replacement before the old one
    // has actually torn down throws "Duplicate DailyIframe instances".
    // Callers fire-and-forget this (React effect cleanups and logout can't
    // await), so swallow destroy() failures rather than leaving an
    // unhandled rejection and no working call object.
    try {
      await this._callObject.destroy();
    } catch (err) {
      console.error('[Daily] failed to destroy call object during rebuild:', err);
    }
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
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: userId,
          // Belt-and-suspenders alongside IAM's calls:* redis TTL: even if
          // our own eject/cleanup path never runs, Daily force-ends the
          // meeting on its own after the same ceiling.
          eject_after_elapsed: MAX_CALL_DURATION_SECONDS,
        },
      }),
    });

    if (!res.ok) {
      console.error('[Daily] failed to create meeting token:', res.status);
      return undefined;
    }

    const data = await res.json();
    return data.token;
  }

  async join(options: JoinOptions) {
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

