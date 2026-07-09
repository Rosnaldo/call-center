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

    // Mirrors the IAM helper's WebProperties.override — points realtime's own
    // createIamClient() at the ephemeral test IAM server instead of the real
    // properties.iamUri, so services/calls|users|chat make real HTTP calls
    // against it with no per-function mocking needed.
    const iamPort = IamProperties.getInstance().port;
    Properties.override({ iamUri: `http://localhost:${iamPort}` });

    return webhookServer;
}

export async function stopRealtimeServer(): Promise<void> {
    await webhookServer.stop();
    WebhookServer.reset();
}

export function getRealtimeServices(): WebhookServer {
    return webhookServer;
}
