"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.json = json;
exports.normalizeAddress = normalizeAddress;
exports.normalizeCode = normalizeCode;
exports.parseCookies = parseCookies;
exports.buildCookie = buildCookie;
exports.getSecureCookieFlag = getSecureCookieFlag;
exports.readBody = readBody;
exports.sha256 = sha256;
const node_crypto_1 = __importDefault(require("node:crypto"));
function json(statusCode, body, headers = {}) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            ...headers,
        },
        body: JSON.stringify(body),
    };
}
function normalizeAddress(address) {
    return String(address || '').trim().toLowerCase();
}
function normalizeCode(code) {
    return String(code || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 12);
}
function parseCookies(raw) {
    const source = String(raw || '');
    return source.split(';').reduce((acc, pair) => {
        const index = pair.indexOf('=');
        if (index === -1)
            return acc;
        const key = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        if (!key)
            return acc;
        acc[key] = decodeURIComponent(value);
        return acc;
    }, {});
}
function buildCookie(name, value, options) {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    parts.push(`Path=${options.path || '/'}`);
    if (typeof options.maxAge === 'number')
        parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
    if (options.httpOnly !== false)
        parts.push('HttpOnly');
    parts.push(`SameSite=${options.sameSite || 'Lax'}`);
    if (options.secure !== false)
        parts.push('Secure');
    return parts.join('; ');
}
function getSecureCookieFlag(event) {
    const proto = String(event.headers?.['x-forwarded-proto'] || event.headers?.['X-Forwarded-Proto'] || '');
    const host = String(event.headers?.host || event.headers?.Host || '');
    if (/localhost|127\.0\.0\.1/i.test(host))
        return false;
    return proto ? proto === 'https' : process.env.NODE_ENV === 'production';
}
function readBody(event) {
    const raw = String(event.body || '');
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function sha256(value) {
    return node_crypto_1.default.createHash('sha256').update(value).digest('hex');
}
