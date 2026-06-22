import { IDailyService, JoinOptions } from '../../../web/src/services/daily';

interface DailyCoServiceConfig {
    domain: string;
    apiKey: string;
}

export class DailyCoService implements IDailyService {
    private static instance: DailyCoService;
    readonly config: DailyCoServiceConfig;
    readonly joinCalls: JoinOptions[] = [];

    private constructor(config: DailyCoServiceConfig) {
        this.config = config;
    }

    static getInstance(): DailyCoService {
        if (!DailyCoService.instance) {
            const meta = (globalThis as any).__importMeta?.env ?? {};
            DailyCoService.instance = new DailyCoService({
                domain: meta.VITE_DAILY_DOMAIN ?? '',
                apiKey: meta.VITE_DAILY_API_KEY ?? '',
            });
        }
        return DailyCoService.instance;
    }

    static reset(): void {
        if (DailyCoService.instance) {
            DailyCoService.instance.joinCalls.length = 0;
        }
        DailyCoService.instance = undefined as any;
    }

    async join(options: JoinOptions): Promise<void> {
        this.joinCalls.push(options);
    }

    async leave(): Promise<void> {}
}
