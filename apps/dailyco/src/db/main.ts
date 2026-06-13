import mongoose, { type Connection } from 'mongoose';
import _ from 'lodash';

import Properties from '#properties';
import { MongoMemoryServer, MongoMemoryReplSet } from 'mongodb-memory-server';

interface Props {
    testTransaction?: boolean;
}

export class MainConnection {
    public connection: Connection | undefined;
    private mongoServer: MongoMemoryServer | undefined;
    private replSet: MongoMemoryReplSet | undefined;
    
    public readonly get = (): Connection => {
        if (_.isNil(this.connection)) throw new Error('Connection não encontrado');
        if (!this.checkIsConnected(this.connection)) 
            throw new Error('MongoConnectionService: conexão não inicializada. Chame connect() antes.');
        return this.connection;
    }

    public readonly connect = async (props: Props = {}): Promise<Connection> => {
        if (this.checkIsConnected(this.connection)) return this.connection;
        const connection = await this.createConnection(props);
        this.connection = connection;

        // connection.on('connected', () => console.log('[mongo] conectado:', Properties.mongoUri));
        // connection.on('error', (err) => console.error('[mongo] erro:', err));
        // connection.on('disconnected', () => console.log('[mongo] desconectado'));

        return connection.asPromise();
    };

    private readonly createConnection = async ({ testTransaction = false }: Props): Promise<Connection> => {
        const testEnv = ['test', 'e2e'];
        if (testEnv.includes(Properties.nodeEnv) && testTransaction) {
            this.replSet = await MongoMemoryReplSet.create({
                replSet: { count: 1 }, // mínimo para transactions
            });

            const uri = this.replSet.getUri();
            return mongoose.createConnection(uri);
        }
        if (testEnv.includes(Properties.nodeEnv)) {
            this.mongoServer = await MongoMemoryServer.create();
            const uri = this.mongoServer.getUri();
            return mongoose.createConnection(uri, { maxPoolSize: 5 });
        }

        return mongoose.createConnection(Properties.mongoUri, {
            authSource: 'admin',
            authMechanism: mongoose.mongo.AuthMechanism.MONGODB_SCRAM_SHA1
        });
    }

    private readonly checkIsConnected = (connection: Connection | undefined): connection is Connection => connection?.readyState === 1;

    public readonly disconnect = async (): Promise<void> => {
        if (this.checkIsConnected(this.connection)) {
            await this.connection.close();
            this.connection = undefined;
        }

        if (this.mongoServer) {
            await this.mongoServer.stop();
            this.mongoServer = undefined;
        }

        if (this.replSet) {
            await this.replSet.stop();
            this.replSet = undefined;
        }
    };
};
