/**
 * Who is issuing receipts on this device right now. Set by AuthProvider when
 * a member signs in and cleared on sign-out; the repository stamps the name on
 * each new booking so every device prints the same signer.
 */
export interface Issuer {
  name: string
}

let issuer: Issuer = { name: '' }

export function setIssuer(next: Issuer): void {
  issuer = next
}

export function getIssuer(): Issuer {
  return issuer
}
