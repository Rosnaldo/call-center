require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'local'}`, override: true });

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const WEBHOOK_URL = process.argv[2] || process.env.WEBHOOK_URL;

if (!DAILY_API_KEY) {
    console.error('DAILY_API_KEY não definida no .env');
    process.exit(1);
}

if (!WEBHOOK_URL) {
    console.error('WEBHOOK_URL não definida no .env (ou passe como argumento)');
    console.error('Exemplo: node scripts/create-daily-webhook.js https://abc123.ngrok.io/webhooks/daily');
    process.exit(1);
}

async function main() {
    const existing = await fetch('https://api.daily.co/v1/webhooks', {
        headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    if (!existing.ok) {
        console.error('Erro ao listar webhooks:', existing.status, await existing.text());
        process.exit(1);
    }

    const webhooks = await existing.json();
    console.log(`Webhooks existentes: ${webhooks.data?.length ?? webhooks.length ?? 0}`);

    const res = await fetch('https://api.daily.co/v1/webhooks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
            url: WEBHOOK_URL,
            eventTypes: [
                'meeting.started',
                'meeting.ended',
                'participant.joined',
                'participant.left',
            ],
        }),
    });

    if (!res.ok) {
        console.error('Erro ao criar webhook:', res.status, await res.text());
        process.exit(1);
    }

    const webhook = await res.json();
    console.log('Webhook criado com sucesso:');
    console.log(JSON.stringify(webhook, null, 2));
}

main();
