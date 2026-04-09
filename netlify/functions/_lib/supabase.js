"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseConfig = getSupabaseConfig;
exports.supabaseGet = supabaseGet;
exports.supabasePatch = supabasePatch;
exports.supabasePost = supabasePost;
function getSupabaseConfig() {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Server is not configured yet.');
    }
    return {
        SUPABASE_URL: SUPABASE_URL.replace(/\/$/, ''),
        SUPABASE_SERVICE_ROLE_KEY,
        RECRUITER_TABLE,
    };
}
function authHeaders() {
    const { SUPABASE_SERVICE_ROLE_KEY } = getSupabaseConfig();
    return {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    };
}
async function supabaseGet(path) {
    const { SUPABASE_URL } = getSupabaseConfig();
    const response = await fetch(`${SUPABASE_URL}${path}`, {
        method: 'GET',
        headers: authHeaders(),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Database read failed.');
    }
    return (await response.json());
}
async function supabasePatch(path, body) {
    const { SUPABASE_URL } = getSupabaseConfig();
    const { SUPABASE_SERVICE_ROLE_KEY } = getSupabaseConfig();
    const response = await fetch(`${SUPABASE_URL}${path}`, {
        method: 'PATCH',
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Database update failed.');
    }
    return response.json().catch(() => []);
}
async function supabasePost(path, body) {
    const { SUPABASE_URL } = getSupabaseConfig();
    const response = await fetch(`${SUPABASE_URL}${path}`, {
        method: 'POST',
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Database insert failed.');
    }
    return response.json().catch(() => []);
}
