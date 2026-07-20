// Cloudflare Workers 上的密码哈希与 Token 签名（用 Web Crypto，无 Node 依赖）

const enc = new TextEncoder()
const dec = new TextDecoder()

function bufToB64url(buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
function strToB64url(str) {
  return bufToB64url(enc.encode(str))
}
function b64urlToStr(s) {
  return dec.decode(b64urlToBytes(s))
}

// PBKDF2-HMAC-SHA256（Workers Web Crypto 原生支持），10k 迭代（免费Worker CPU限额~10ms）
export async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' },
    key, 256
  )
  return { salt: bufToB64url(salt), hash: bufToB64url(bits) }
}

export async function verifyPassword(pw, saltB64, hashB64) {
  const salt = b64urlToBytes(saltB64)
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' },
    key, 256
  )
  return bufToB64url(bits) === hashB64
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return bufToB64url(sig)
}

// 自实现的 HMAC 签名 token（等价于原 itsdangerous 思路，无需额外库）
export async function signToken(payload, secret) {
  const body = strToB64url(JSON.stringify(payload))
  const sig = await hmac(body, secret)
  return body + '.' + sig
}

export async function verifyToken(token, secret) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expSig = await hmac(body, secret)
  if (expSig !== sig) return null
  try {
    return JSON.parse(b64urlToStr(body))
  } catch {
    return null
  }
}
