import { getUserModel, getCallHistoryModel, getTransactionModel } from '#models/singleton';
import logger from '#logger';

export class LoadModels {
    private readonly loadModels = (): void => {
        try {
            getUserModel();
            getCallHistoryModel();
            getTransactionModel();
        } catch (error) {
            logger.error(error, '[LoadModels.loadModels]: Error loading models')
            throw error;
        }
    };

    public readonly synchronous = (): void => this.loadModels();
};
