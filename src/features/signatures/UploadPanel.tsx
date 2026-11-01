import { Upload } from 'lucide-react'
import { useId, useState, type ChangeEvent } from 'react'
import { A11Y, ICON_SIZE } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'
import { processSignatureImage, SignatureImageError } from './processImage'

export interface UploadedSignature {
  dataUrl: string
  width: number
  height: number
}

interface UploadPanelProps {
  image: UploadedSignature | null
  onImageChange: (image: UploadedSignature | null) => void
}

/** Pick a photo or scan; it is cleaned up right away and previewed. */
export function UploadPanel({ image, onImageChange }: UploadPanelProps) {
  const { t } = useLocale()
  const inputId = useId()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // picking the same file again still fires change
    if (!file) return
    setWorking(true)
    setError(null)
    try {
      onImageChange(await processSignatureImage(file))
    } catch (err) {
      onImageChange(null)
      const code = err instanceof SignatureImageError ? err.code : 'unreadable'
      setError(t(`signatures.error.${code}`))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary hover:border-accent hover:text-accent ${A11Y.FOCUS_RING}`}
      >
        {image ? (
          <span className="flex h-24 items-center justify-center rounded bg-white px-3">
            <img src={image.dataUrl} alt="" className="max-h-20 w-auto" />
          </span>
        ) : (
          <Upload size={ICON_SIZE.LG} aria-hidden="true" />
        )}
        <span>{working ? t('signatures.upload.working') : image ? t('signatures.upload.change') : t('signatures.upload.choose')}</span>
        <span className="text-xs">{t('signatures.upload.hint')}</span>
        <input id={inputId} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={onFile} disabled={working} />
      </label>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
