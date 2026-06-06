import Properties from '#properties';
import fs from 'fs';
import path from 'path';

export class RuntimeFiles {
    public readonly get = (dir: string, filename: string) => {
        const files = this.getAllFilesRecursively(dir);
        return this.filter(files, filename);
    };

    private readonly filter = (files: string[], filename: string) => {
        return files
            .filter((file) => this.isRuntimeFile(file))
            .filter((file) => !file.includes(filename));
    };

    private readonly getAllFilesRecursively = (dir: string): string[] => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        return entries.flatMap((entry) => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) return this.getAllFilesRecursively(fullPath);
            if (entry.isFile()) return [fullPath];

            return [];
        });
    };

    private readonly isRuntimeFile = (fileName: string): boolean => {
        const ext = Properties.isRuntime === 'ts' ? '.ts' : '.js';
        return fileName.endsWith(ext) &&
            !fileName.endsWith('.d.ts') &&
            !fileName.endsWith('.map');
    };
};
