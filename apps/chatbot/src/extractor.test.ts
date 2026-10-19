import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOllamaExtractor, groundExtraction, stepPrompt, systemPrompt, toExtraction } from './extractor';

describe('toExtraction', () => {
    it('keeps the known fields that were stated when setting params', () => {
        expect(toExtraction('{"intent":"set","os":"iOS","version":null,"admin":true,"blockedTerms":["bet"]}')).toEqual({
            intent: 'set',
            fields: { os: 'iOS', blockedTerms: ['bet'] },
        });
    });

    it('drops the fields of a question or anything else', () => {
        expect(toExtraction('{"intent":"question","appVersion":"1.2.0"}')).toEqual({ intent: 'question', fields: {} });
        expect(toExtraction('{"intent":"other","os":"Windows"}')).toEqual({ intent: 'other', fields: {} });
        expect(toExtraction('{"intent":"hack","os":"iOS"}')).toEqual({ intent: 'other', fields: {} });
    });

    it('keeps the param of a flow, and nothing else', () => {
        expect(toExtraction('{"intent":"flow","flow":"allowedApps","os":"iOS"}')).toEqual({ intent: 'flow', fields: {}, flow: 'allowedApps' });
        expect(toExtraction('{"intent":"flow","flow":"privateDns"}')).toEqual({ intent: 'flow', fields: {}, flow: 'privateDns' });
        expect(toExtraction('{"intent":"flow","flow":"privateDnsHost"}')).toEqual({ intent: 'other', fields: {} });
        expect(toExtraction('{"intent":"flow"}')).toEqual({ intent: 'other', fields: {} });
    });

    it('reads nothing from invalid replies', () => {
        expect(toExtraction('not json')).toEqual({ intent: 'other', fields: {} });
        expect(toExtraction('["os"]')).toEqual({ intent: 'other', fields: {} });
        expect(toExtraction(undefined)).toEqual({ intent: 'other', fields: {} });
    });
});

describe('groundExtraction', () => {
    const set = (fields: object) => ({ intent: 'set' as const, fields });

    it('keeps the values the message says', () => {
        const text = 'Tenho um iPhone com iOS 17.4, uso o DNS.adguard.com e instalo pelo MacBook';
        const fields = { os: 'iOS', version: '17.4', privateDnsHost: 'dns.adguard.com', installOs: 'macOS', privateDns: true };
        expect(groundExtraction(text, 'askOs', set(fields))).toEqual(set(fields));
    });

    it('drops values the message does not say', () => {
        // The model copied "Android" and "14" from its examples.
        expect(groundExtraction('uso windows phone', 'askOs', set({ os: 'Android', version: '14' }))).toEqual(set({}));
        expect(groundExtraction('pelo meu computador', 'askOs', set({ installOs: 'Windows' }))).toEqual(set({}));
        expect(groundExtraction('coloca a versão 2.1', 'askOs', set({ appVersion: '1.2.0' }))).toEqual(set({}));
    });

    it('goes back to a modal only when the message is about it', () => {
        const flow = (target: 'allowedApps' | 'blockedTerms') => ({ intent: 'flow' as const, fields: {}, flow: target });
        expect(groundExtraction('quero alterar os domínios proibidos', 'confirm', flow('blockedTerms'))).toEqual(flow('blockedTerms'));
        expect(groundExtraction('posso trocar os apps?', 'confirm', flow('allowedApps'))).toEqual(flow('allowedApps'));
        expect(groundExtraction('libera o whatsapp', 'askInstallOs', flow('allowedApps'))).toEqual(flow('allowedApps'));
        expect(groundExtraction('quero mudar tudo', 'confirm', flow('blockedTerms'))).toEqual({ intent: 'other', fields: {} });
    });

    it('goes back to a typed param named without its new value', () => {
        const flow = (target: string) => ({ intent: 'flow' as const, fields: {}, flow: target });
        expect(groundExtraction('quero alterar o dns privado', 'confirm', flow('privateDns'))).toEqual(flow('privateDns'));
        expect(groundExtraction('quero mudar a versão', 'confirm', flow('blockedTerms'))).toEqual(flow('version'));
        // Missed by the model.
        expect(groundExtraction('quero alterar o dns privado', 'confirm', set({}))).toEqual(flow('privateDns'));
        expect(groundExtraction('quero alterar o dns privado', 'confirm', { intent: 'other', fields: {} })).toEqual(flow('privateDns'));
        // Naming two, the model's pick when the message names it.
        expect(groundExtraction('muda a versão do android', 'confirm', flow('version'))).toEqual(flow('version'));
        expect(groundExtraction('muda a versão do android', 'confirm', flow('installOs'))).toEqual({ intent: 'other', fields: {} });
    });

    it('goes to the modal the message names, whichever the model picked', () => {
        const flow = (target: 'allowedApps' | 'blockedTerms') => ({ intent: 'flow' as const, fields: {}, flow: target });
        // Blocked apps are left out of the allowed apps' checklist.
        expect(groundExtraction('quero alterar os apps bloqueados', 'confirm', flow('blockedTerms'))).toEqual(flow('allowedApps'));
        expect(groundExtraction('muda os sites proibidos', 'confirm', flow('allowedApps'))).toEqual(flow('blockedTerms'));
    });

    it('goes back to a modal the model missed when the message asks to change it', () => {
        const other = { intent: 'other' as const, fields: {} };
        expect(groundExtraction('quero alterar os apps bloqeuados', 'confirm', other)).toEqual({ intent: 'flow', fields: {}, flow: 'allowedApps' });
        expect(groundExtraction('quero alterar as palavras proibidsa', 'confirm', other)).toEqual({ intent: 'flow', fields: {}, flow: 'blockedTerms' });
        expect(groundExtraction('quero alterar os domínios proibidos', 'confirm', set({}))).toEqual({ intent: 'flow', fields: {}, flow: 'blockedTerms' });
        // Words given are set, not a way back to the modal.
        expect(groundExtraction('adiciona as palavras poker e bingo', 'confirm', set({ blockedTerms: ['poker', 'bingo'] }))).toEqual(
            set({ blockedTerms: ['poker', 'bingo'] }),
        );
        // No change asked, or no single modal named.
        expect(groundExtraction('gosto de apps', 'confirm', other)).toEqual(other);
        expect(groundExtraction('quero alterar tudo', 'confirm', other)).toEqual(other);
    });

    it('takes a yes/no only when the message is about it or answers its question', () => {
        expect(groundExtraction('na verdade meu celular é android 9', 'askAppVersion', set({ version: '9', privateDns: false }))).toEqual(
            set({ version: '9' }),
        );
        expect(groundExtraction('não uso', 'askDns', set({ privateDns: false }))).toEqual(set({ privateDns: false }));
        expect(groundExtraction('não uso dns privado', 'askInstallOs', set({ privateDns: false }))).toEqual(set({ privateDns: false }));
        expect(groundExtraction('bloqueia ip sim', 'askOs', set({ blockRawIp: true }))).toEqual(set({ blockRawIp: true }));
        expect(groundExtraction('bloqueia sim', 'askOs', set({ blockRawIp: true }))).toEqual(set({}));
    });

    it('keeps an OS no parser takes, so its error shows', () => {
        expect(groundExtraction('uso windows phone', 'askOs', set({ os: 'Windows Phone' }))).toEqual(set({ os: 'Windows Phone' }));
    });

    it('keeps only the blocked words in the message', () => {
        expect(groundExtraction('bloqueia cassino e bet', 'askOs', set({ blockedTerms: ['cassino', 'bet', 'poker'] }))).toEqual(
            set({ blockedTerms: ['cassino', 'bet'] }),
        );
        expect(groundExtraction('nenhuma palavra', 'askOs', set({ blockedTerms: [] }))).toEqual(set({ blockedTerms: [] }));
        expect(groundExtraction('bloqueia palavras', 'askOs', set({ blockedTerms: ['poker'] }))).toEqual(set({}));
    });

    it('takes text ending in "?" as a question, unless it writes a value', () => {
        expect(groundExtraction('o que acontece se eu bloquear ip? ', 'askOs', set({ blockRawIp: true }))).toEqual({
            intent: 'question',
            fields: {},
        });
        // An order asked politely.
        expect(groundExtraction('pode mudar a versão para 9?', 'askOs', set({ version: '9' }))).toEqual(set({ version: '9' }));
        // The value has to be in the text to count; without it, the bot asks for it.
        expect(groundExtraction('pode mudar a versão?', 'askOs', set({ version: '9' }))).toEqual({ intent: 'flow', fields: {}, flow: 'version' });
        expect(groundExtraction('o que é versão?', 'askOs', set({ version: '9' }))).toEqual({ intent: 'question', fields: {} });
    });
});

describe('stepPrompt', () => {
    it("names the bot's current question", () => {
        expect(stepPrompt('askDnsHost')).toContain('the private DNS hostname (privateDnsHost)');
    });
});

describe('createOllamaExtractor', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('asks Ollama for the schema-constrained fields and reads its reply', async () => {
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: { content: '{"intent":"set","os":"Android"}' } })));
        vi.stubGlobal('fetch', fetchMock);

        expect(await createOllamaExtractor('http://llm:11434', 'qwen2.5:3b').extract('meu android', 'askOs')).toEqual({
            intent: 'set',
            fields: { os: 'Android' },
        });

        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('http://llm:11434/api/chat');
        const body = JSON.parse(String(init.body));
        expect(body).toMatchObject({ model: 'qwen2.5:3b', stream: false, options: { temperature: 0 } });
        expect(body.format.properties).toHaveProperty('privateDnsHost');
        expect(body.format.required).toEqual(['intent']);
        // The system prompt first, the same at every step, so Ollama reuses it.
        expect(body.messages).toEqual([
            { role: 'system', content: systemPrompt },
            { role: 'system', content: stepPrompt('askOs') },
            { role: 'user', content: 'meu android' },
        ]);
    });

    it('fails on an error status', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('model not found', { status: 404 })));
        const fetchMock = vi.fn(async () => new Response('model not found', { status: 404 }));
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.useFakeTimers();
        await expect(createOllamaExtractor('http://llm:11434', 'x').extract('oi', 'askOs')).rejects.toThrow('404');
        // Then warms the model up again.
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        vi.useRealTimers();
    });

    it('warms up until Ollama answers, one warm-up at a time', async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(new Error('ECONNREFUSED'))
            .mockResolvedValue(new Response(JSON.stringify({ message: { content: '{}' } })));
        vi.stubGlobal('fetch', fetchMock);
        const { warmUp } = createOllamaExtractor('http://llm:11434', 'x');

        const first = warmUp();
        expect(warmUp()).toBe(first);
        await vi.advanceTimersByTimeAsync(15_000);
        await first;
        expect(fetchMock).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });
});
