
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.base.json');

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    testMatch: ['**/?(*.)+(spec|test).[tj]s'],
    testTimeout: 60000,
    maxWorkers: 5,
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.tests.json'
        }],
    },
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1', // 🔥 ADICIONA ISSO
        ...pathsToModuleNameMapper(compilerOptions.paths, {
            prefix: '<rootDir>/'
        }),
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
