import crypto from 'node:crypto'
import { ethers } from 'ethers'
import { buildCookie, getSecureCookieFlag, json, normalizeAddress, parseCookies } from './http'

const AUTH_COOKIE = 'mwz_recruiter_auth'
const AUTH_TTL_SECONDS = 60 * 60 * 24 * 14

function getSecret() {
  const secret = process.env.RECRUITER_AUTH_SECRET || process.env.RECRUITER_DASHBOARD_TOKEN || ''
  if (!secret) throw new Error('Recruiter auth secret is not configured yet.')
  return secret
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function createRecruiterAuthCookie(event: any, data: { recruiterId: number; address: string }) {
  const exp = Math.floor(Date.now() / 1000) + AUTH_TTL_SECONDS
  const payload = Buffer.from(JSON.stringify({ rid: data.recruiterId, addr: normalizeAddress(data.address), exp })).toString('base64url')
  const signature = signPayload(payload)
  return buildCookie(AUTH_COOKIE, `${payload}.${signature}`, {
    maxAge: AUTH_TTL_SECONDS,
    httpOnly: true,
    secure: getSecureCookieFlag(event),
    sameSite: 'Lax',
    path: '/',
  })
}

export function clearRecruiterAuthCookie(event: any) {
  return buildCookie(AUTH_COOKIE, '', {
    maxAge: 0,
    httpOnly: true,
    secure: getSecureCookieFlag(event),
    sameSite: 'Lax',
    path: '/',
  })
}

export function readRecruiterAuth(event: any) {
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie)
  const raw = cookies[AUTH_COOKIE]
  if (!raw) return null
  const [payload, signature] = raw.split('.')
  if (!payload || !signature) return null
  if (signPayload(payload) !== signature) return null

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { rid: number; addr: string; exp: number }
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null
    return { recruiterId: Number(decoded.rid), address: normalizeAddress(decoded.addr) }
  } catch {
    return null
  }
}

export function recruiterLoginMessage(address: string, nonce: string) {
  return `MemeWarzone recruiter login\naddress: ${normalizeAddress(address)}\nnonce: ${nonce}`
}

export function referralBindMessage(address: string, nonce: string, sid: string) {
  return `MemeWarzone referral bind\naddress: ${normalizeAddress(address)}\nnonce: ${nonce}\nsid: ${sid}`
}

export async function verifyWalletSignature(message: string, signature: string, address: string) {
  const recovered = ethers.verifyMessage(message, signature)
  return normalizeAddress(recovered) === normalizeAddress(address)
}

export function unauthorized(message = 'Unauthorized.') {
  return json(401, { error: message })
}
