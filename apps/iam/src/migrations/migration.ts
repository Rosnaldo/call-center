import { getMigrationDao } from '#daos/singleton';
import { RuntimeFiles } from '#utils/runtime_files';
import path from 'path';


export class Migration {
    public runScripts = async () => {
        const dir =  path.join(__dirname, 'scripts');
        const runtime = new RuntimeFiles();
        const files = runtime.get(dir, __filename);
        for await (const fileName of files) {
            const script = this.getScript(fileName);
            const migration = await getMigrationDao().findOne(script);
            if (!migration) {
                const { migrate } = await import(fileName);
                await migrate.run();
                await getMigrationDao().insert(script);
            }
        }
    };

    private getScript = (fullName: string): string => {
        const parts = fullName.trim().split('/');
        return parts[parts.length - 1];
    }
}
