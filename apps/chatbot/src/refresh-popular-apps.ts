import fs from 'node:fs';
import path from 'node:path';
import gplay from 'google-play-scraper';

// Refreshes the Google Play icons of the web app's fixed allowed apps checklist.
// Only icons change; an app that fails keeps its current icon.
const FILE = path.resolve(__dirname, '../../web/src/components/chatbot-hero/popular-apps.json');

// Other fields (name, category) are written back untouched.
interface PopularApp {
    id: string;
    iconUrl: string;
}

async function main(): Promise<void> {
    const apps: PopularApp[] = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    let changed = 0;
    for (const app of apps) {
        try {
            const { icon } = await gplay.app({ appId: app.id, lang: 'pt', country: 'br' });
            if (icon && icon !== app.iconUrl) {
                app.iconUrl = icon;
                changed += 1;
            }
        } catch (err) {
            console.error(`${app.id}: ${err instanceof Error ? err.message : err} (kept current icon)`);
            process.exitCode = 1;
        }
    }
    fs.writeFileSync(FILE, `${JSON.stringify(apps, null, 2)}\n`);
    console.log(`${changed} of ${apps.length} icons updated in ${path.relative(process.cwd(), FILE)}`);
}

main();
