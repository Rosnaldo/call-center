import { beforeEach, describe, expect, it } from 'vitest';
import { loadSavedParams, saveParams } from '../saved-params.ts';

const PARAMS = {
  os: 'Android', version: '14', privateDns: false, privateDnsHost: null, allowedApps: ['com.whatsapp'],
  installOs: 'Linux', appVersion: '1.0.0', blockRawIp: false, blockedTerms: [],
};

describe('saved params', () => {
  beforeEach(() => localStorage.clear());

  it('loads what was saved', () => {
    saveParams(PARAMS);
    expect(loadSavedParams()).toEqual(PARAMS);
  });

  it('loads nothing when empty or unreadable', () => {
    expect(loadSavedParams()).toBeNull();
    localStorage.setItem('chatbot.params', '{not json');
    expect(loadSavedParams()).toBeNull();
    localStorage.setItem('chatbot.params', '["os"]');
    expect(loadSavedParams()).toBeNull();
  });
});
