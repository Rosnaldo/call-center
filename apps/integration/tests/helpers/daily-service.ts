import { IDailyService, JoinOptions } from '../../../web/src/services/daily';
import properties from '../../../web/src/properties';

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
            DailyCoService.instance = new DailyCoService({
                domain: properties.dailyDomain,
                apiKey: properties.dailyApiKey,
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

    destroy(): void {}

    rebuild(): void {}
}
