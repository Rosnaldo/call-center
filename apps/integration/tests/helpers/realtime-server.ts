import { Properties } from '../../../realtime/src/properties';
import { WebhookServer } from '../../../realtime/src/initialize_services';
import { Properties as IamProperties } from '../../../iam/src/properties';
import iamWebhook from '../../../realtime/src/webhooks/iam';
import dailyWebhook from '../../../realtime/src/webhooks/daily';

let webhookServer: WebhookServer;

export async function startRealtimeServer(): Promise<WebhookServer> {
    const properties = Properties.getInstance();
    webhookServer = WebhookServer.getInstance(properties);

    await webhookServer.start();

    iamWebhook(webhookServer.app);
    dailyWebhook(webhookServer.app);

    const port = webhookServer.properties.port;
    IamProperties.override({ realtimeUri: `http://localhost:${port}` });

    return webhookServer;
}

export async function stopRealtimeServer(): Promise<void> {
    await webhookServer.stop();
    WebhookServer.reset();
}

export function getRealtimeServices(): WebhookServer {
    return webhookServer;
}
