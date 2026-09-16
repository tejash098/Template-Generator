/** The operator's mark (public/android-chrome-192x192.png, also the app icon). */
const LOGO_URL = `${import.meta.env.BASE_URL}android-chrome-192x192.png`

export function Logo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src={LOGO_URL}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`shrink-0 rounded-lg ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
