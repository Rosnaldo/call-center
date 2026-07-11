process.env.NODE_ENV = 'test';
process.env.RUNTIME = 'ts';

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    testMatch: ['**/?(*.)+(spec|test).[tj]s'],
    testTimeout: 60000,
    maxWorkers: 1,
    forceExit: true,
    setupFiles: ['<rootDir>/src/setup-properties.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.json',
            // NOTE: tried enabling this (it would've caught the dead
            // updateCallParticipant export and the missing syncActiveCall
            // mock impl. from the last debugging pass at compile time
            // instead of at runtime) but web/src/properties.ts's
            // `import.meta` usage fails type-checking before the
            // import-meta.ts AST transformer below gets a chance to rewrite
            // it — ts-jest runs diagnostics against the pre-transform AST.
            // That's a separate, pre-existing tooling gap; fixing it isn't
            // in scope here, so this stays off.
            diagnostics: false,
            astTransformers: {
                before: [{ path: '<rootDir>/src/transforms/import-meta.ts' }],
            },
        }],
    },
    moduleNameMapper: {
        // ESM-only packages that must be stubbed for Jest CJS
        '^@keycloak/keycloak-admin-client$': '<rootDir>/src/mocks/keycloak-client.ts',
        '^keycloak-js$': '<rootDir>/src/mocks/keycloak-js.ts',

        // realtime websocket paths
        '^#websocket/(.*)$': '<rootDir>/../realtime/src/websocket/$1',

        // realtime service layer — real modules, not hand-written mocks. They
        // only need Properties.override({ iamUri }) (see
        // tests/helpers/realtime-server.ts) to hit the ephemeral test IAM
        // server for real; no per-function mock file to keep in sync.
        '^src/services/users$': '<rootDir>/../realtime/src/services/users.ts',
        '^src/services/calls$': '<rootDir>/../realtime/src/services/calls.ts',
        '^src/services/chat$': '<rootDir>/../realtime/src/services/chat.ts',
        '^src/services/realtime_events$': '<rootDir>/../realtime/src/services/realtime_events.ts',
        '^src/webhooks/daily_manager$': '<rootDir>/../realtime/src/webhooks/daily_manager.ts',
        '^src/helpers/(.*)$': '<rootDir>/../realtime/src/helpers/$1',
        '^src/auth/(.*)$': '<rootDir>/../realtime/src/auth/$1',
        '^src/apis/(.*)$': '<rootDir>/../realtime/src/apis/$1',
        '^#apis/iam$': '<rootDir>/../realtime/src/apis/iam.ts',

        // IAM alias paths
        '^#logger$': '<rootDir>/../iam/src/logger',
        '^#properties$': '<rootDir>/../iam/src/properties',
        '^#middleware/(.*)$': '<rootDir>/../iam/src/middleware/$1',
        '^#controllers/(.*)$': '<rootDir>/../iam/src/controllers/$1',
        '^#crud/(.*)$': '<rootDir>/../iam/src/crud/$1',
        '^#daos/(.*)$': '<rootDir>/../iam/src/daos/$1',
        '^#db/(.*)$': '<rootDir>/../iam/src/db/$1',
        '^#redis/(.*)$': '<rootDir>/../iam/src/redis/$1',
        '^#schemas/(.*)$': '<rootDir>/../iam/src/entities/schemas/$1',
        '^#models/(.*)$': '<rootDir>/../iam/src/entities/models/$1',
        '^#indexes/(.*)$': '<rootDir>/../iam/src/entities/indexes/$1',
        '^#entities/(.*)$': '<rootDir>/../iam/src/entities/$1',
        '^#migrations/(.*)$': '<rootDir>/../iam/src/migrations/$1',
        '^#utils/(.*)$': '<rootDir>/../iam/src/utils/$1',
        '^#exceptions/(.*)$': '<rootDir>/../iam/src/exceptions/$1',
        '^#routes/(.*)$': '<rootDir>/../iam/src/routes/$1',
        '^#helpers/(.*)$': '<rootDir>/../iam/src/helpers/$1',
        '^#keycloak/(.*)$': '<rootDir>/../iam/src/keycloak/$1',
        '^#const/(.*)$': '<rootDir>/../iam/src/const/$1',
        '^#apis/(.*)$': '<rootDir>/../iam/src/apis/$1',
        '^#route_bootstrap$': '<rootDir>/../iam/src/route_bootstrap',
        '^#mongoose_bootstrap$': '<rootDir>/../iam/src/mongoose_bootstrap',

        // web component stubs (not available in Node test env)
        '.*/components/toast$': '<rootDir>/src/mocks/toast.ts',
        '\\.(mp3|wav|ogg)$': '<rootDir>/src/mocks/asset-stub.ts',

        // web path alias — web's own source (states/call/actions.ts etc, loaded
        // transitively by every test) uses this internally for its own
        // services/utils imports, not just test files reaching into web
        '^@/(.*)$': '<rootDir>/../web/$1',

        // generic src/* → IAM (realtime's src/services/users already captured above)
        '^src/(.*)$': '<rootDir>/../iam/src/$1',
    },
};
