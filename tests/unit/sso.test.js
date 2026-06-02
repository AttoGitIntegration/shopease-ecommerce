const crypto = require('crypto');
const sso = require('../../src/controllers/ssoController');
const { config, verifyClaims, decodeJwt, isAuthorized, extractProfile, base64url } = sso;

function makeToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('SSO helpers', () => {
  const original = { ...config };
  beforeAll(() => {
    config.clientId = 'test-client';
    config.issuer = 'https://idp.example.com';
    config.allowedDomains = [];
  });
  afterAll(() => { Object.assign(config, original); });

  describe('verifyClaims', () => {
    const now = Date.now();
    const nowSec = Math.floor(now / 1000);
    const base = () => ({
      iss: 'https://idp.example.com',
      aud: 'test-client',
      exp: nowSec + 3600,
      iat: nowSec,
      sub: 'user-123',
      nonce: 'n-1',
    });

    test('accepts a valid token', () => {
      expect(verifyClaims(base(), { nonce: 'n-1', now })).toBe(true);
    });

    test('accepts audience supplied as an array', () => {
      expect(verifyClaims({ ...base(), aud: ['other', 'test-client'] }, { nonce: 'n-1', now })).toBe(true);
    });

    test('rejects a wrong issuer', () => {
      expect(() => verifyClaims({ ...base(), iss: 'https://evil.example.com' }, { nonce: 'n-1', now }))
        .toThrow(/issuer/i);
    });

    test('rejects a wrong audience', () => {
      expect(() => verifyClaims({ ...base(), aud: 'someone-else' }, { nonce: 'n-1', now }))
        .toThrow(/audience/i);
    });

    test('rejects an expired token', () => {
      expect(() => verifyClaims({ ...base(), exp: nowSec - 10000 }, { nonce: 'n-1', now }))
        .toThrow(/expired/i);
    });

    test('rejects a mismatched nonce (replay protection)', () => {
      expect(() => verifyClaims(base(), { nonce: 'different', now })).toThrow(/nonce/i);
    });

    test('rejects a token missing sub', () => {
      const c = base(); delete c.sub;
      expect(() => verifyClaims(c, { nonce: 'n-1', now })).toThrow(/sub/i);
    });
  });

  describe('isAuthorized (domain allowlist)', () => {
    afterEach(() => { config.allowedDomains = []; });

    test('allows anyone when no allowlist is set', () => {
      config.allowedDomains = [];
      expect(isAuthorized('anyone@anywhere.com')).toBe(true);
    });

    test('allows a permitted domain', () => {
      config.allowedDomains = ['shopease.com'];
      expect(isAuthorized('jane@shopease.com')).toBe(true);
    });

    test('blocks a non-permitted domain', () => {
      config.allowedDomains = ['shopease.com'];
      expect(isAuthorized('jane@gmail.com')).toBe(false);
    });

    test('blocks when email is missing but allowlist is set', () => {
      config.allowedDomains = ['shopease.com'];
      expect(isAuthorized(null)).toBe(false);
    });
  });

  describe('decodeJwt', () => {
    test('round-trips header and payload', () => {
      const token = makeToken({ sub: 'abc', email: 'x@y.com' });
      const { header, payload } = decodeJwt(token);
      expect(header.alg).toBe('RS256');
      expect(payload).toMatchObject({ sub: 'abc', email: 'x@y.com' });
    });

    test('throws on a malformed token', () => {
      expect(() => decodeJwt('not-a-jwt')).toThrow(/malformed/i);
    });
  });

  describe('extractProfile', () => {
    test('maps standard OIDC claims', () => {
      expect(extractProfile({ sub: 's1', email: 'a@b.com', name: 'Alice' }))
        .toEqual({ sub: 's1', email: 'a@b.com', name: 'Alice' });
    });

    test('falls back to preferred_username for name', () => {
      expect(extractProfile({ sub: 's1', preferred_username: 'bob' }).name).toBe('bob');
    });
  });
});
