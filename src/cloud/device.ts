import { newId } from '../storage/bookings'

const DEVICE_ID_KEY = 'srbs.deviceId'

/** Stable id for this app installation (browser profile / app install). */
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const id = newId()
    localStorage.setItem(DEVICE_ID_KEY, id)
    return id
  } catch {
    return newId() // storage blocked: a per-session id is the best we can do
  }
}

/** Human-readable label for the Team/devices views. */
export function describeDevice(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Linux'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  return `${os} · ${browser}`
}
