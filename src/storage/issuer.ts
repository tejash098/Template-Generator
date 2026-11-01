/**
 * Who is issuing receipts on this device right now. Set by AuthProvider when
 * a member signs in and cleared on sign-out; the repository stamps the name on
 * each new booking so every device prints the same signer, and the user id on
 * each new signature so it can never be adopted by another member.
 */
export interface Issuer {
  name: string
  /** The signed-in member's auth user id; absent when signed out. */
  userId?: string
}

let issuer: Issuer = { name: '' }

export function setIssuer(next: Issuer): void {
  issuer = next
}

export function getIssuer(): Issuer {
  return issuer
}
