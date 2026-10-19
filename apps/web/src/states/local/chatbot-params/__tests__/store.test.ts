import { describe, it, expect, beforeEach } from 'vitest';
import { createChatbotParamsStore } from '../store.ts';

const PARAMS = {
  os: 'Android', version: '14', privateDns: true, privateDnsHost: 'dns.adguard.com', allowedApps: ['com.whatsapp'],
  installOs: 'Linux', appVersion: '1.0.0', blockRawIp: false, blockedTerms: ['bet'],
};

describe('chatbot params store', () => {
  beforeEach(() => localStorage.clear());

  it('persists only the kept params to localStorage', () => {
    const store = createChatbotParamsStore();
    store.getState().setParams({ ...PARAMS, os: 'iOS' });
    store.getState().setSavedParams(PARAMS);

    expect(JSON.parse(localStorage.getItem('chatbot.params')!).state).toEqual({ savedParams: PARAMS });
  });

  it('loads the kept params on creation, without the conversation ones', () => {
    createChatbotParamsStore().getState().setSavedParams(PARAMS);

    const store = createChatbotParamsStore();
    expect(store.getState()).toMatchObject({ params: null, savedParams: PARAMS });
  });

  it('clears the conversation params and keeps the kept ones', () => {
    const store = createChatbotParamsStore();
    store.getState().setParams(PARAMS);
    store.getState().setSavedParams(PARAMS);
    store.getState().clearParams();

    expect(store.getState()).toMatchObject({ params: null, savedParams: PARAMS });
  });

  it('starts empty when storage holds anything else', () => {
    localStorage.setItem('chatbot.params', '{not json');
    expect(createChatbotParamsStore().getState().savedParams).toBeNull();
  });
});
