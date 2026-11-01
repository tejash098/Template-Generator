import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../cloud/useAuth'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { A11Y, FORM, ICON_SIZE, SIGNATURE } from '../../config/constants'
import { DEFAULT_SIGNATURE_INK, SIGNATURE_INKS, type SignatureInk, type SignatureMark as Mark } from '../../document/signature'
import { fontsForText, type SignatureFontId } from '../../document/signatureFonts'
import { normalizeStrokes } from '../../document/signaturePath'
import { SignatureMark } from '../../document/SignatureMark'
import { useLocale } from '../../i18n/useLocale'
import { PageLayout } from '../../layouts/PageLayout'
import type { SignatureRecord } from '../../storage/db'
import { signatures } from '../../storage/signatures'
import { useToast } from '../../toast/useToast'
import { safeReturnPath, withSignatureParam } from './returnPath'
import { SignaturePad } from './SignaturePad'
import { TypePanel } from './TypePanel'
import { UploadPanel, type UploadedSignature } from './UploadPanel'

type Method = 'type' | 'draw' | 'upload'

/**
 * The member's signature library: saved signatures, then a creator (type a
 * name in one of eight styles, draw, or upload a photo). Opened from the
 * editor with ?return=<editor path>, saving goes straight back there with
 * ?signature=<id> so the booking picks it up.
 */
export function SignaturesPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { status, user } = useAuth()
  const { addToast } = useToast()
  const returnPath = safeReturnPath(params.get('return'))

  const saved = useLiveQuery(() => signatures.list(user?.id), [user?.id])
  const [method, setMethod] = useState<Method>('type')
  const [ink, setInk] = useState<SignatureInk>(DEFAULT_SIGNATURE_INK)
  const [text, setText] = useState('')
  const [chosenFont, setChosenFont] = useState<SignatureFontId>('dancing-script')
  const [strokes, setStrokes] = useState<number[][]>([])
  const [image, setImage] = useState<UploadedSignature | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<SignatureRecord | null>(null)

  // The chosen style must belong to the script being typed; otherwise use the first.
  const fonts = fontsForText(text)
  const font = (fonts.some((f) => f.id === chosenFont) ? chosenFont : fonts[0].id) as SignatureFontId

  const buildMark = (): Mark | null => {
    if (method === 'type') {
      const value = text.trim()
      return value ? { kind: 'typed', text: value, font, ink } : null
    }
    if (method === 'draw') {
      const drawn = normalizeStrokes(strokes)
      return drawn ? { kind: 'drawn', ...drawn, ink } : null
    }
    return image ? { kind: 'image', ...image } : null
  }
  const mark = buildMark()

  const labelFor = (m: Mark): string =>
    m.kind === 'typed' ? m.text : t(m.kind === 'drawn' ? 'signatures.label.drawn' : 'signatures.label.image')

  const save = async () => {
    if (!mark || saving) return
    setSaving(true)
    try {
      const record = await signatures.create(labelFor(mark), mark)
      // Going back to a booking: the editor announces "Signature added to booking …".
      if (returnPath) {
        navigate(withSignatureParam(returnPath, record.id))
        return
      }
      setText('')
      setStrokes([])
      setImage(null)
      addToast({ message: t('signatures.savedNotice') })
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    if (returnPath) navigate(returnPath)
    else {
      setText('')
      setStrokes([])
      setImage(null)
    }
  }

  const remove = async () => {
    if (!toDelete) return
    const id = toDelete.id
    setToDelete(null)
    await signatures.remove(id)
    addToast({ message: t('toast.signatureDeleted') })
  }

  return (
    <PageLayout title={t('signatures.title')} subtitle={t('signatures.subtitle')}>
      <div className="flex max-w-3xl flex-col gap-5">
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-text-primary">{t('signatures.saved')}</h2>
            <span className="text-xs text-text-secondary">{t(status === 'member' ? 'signatures.synced' : 'signatures.local')}</span>
          </div>
          {saved && saved.length === 0 && <p className="text-sm text-text-secondary">{t('signatures.empty')}</p>}
          {saved && saved.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {saved.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
                  <div className={`h-12 min-w-0 flex-1 text-[26px] ${SIGNATURE.PREVIEW}`}>
                    <SignatureMark mark={s.mark} />
                  </div>
                  <span className="shrink-0 text-[11px] text-stone-500">{t(`signatures.kind.${s.mark.kind}`)}</span>
                  <button
                    type="button"
                    onClick={() => setToDelete(s)}
                    aria-label={`${t('signatures.delete')}: ${s.label}`}
                    title={t('signatures.delete')}
                    className={`shrink-0 rounded-md p-1.5 text-stone-500 hover:bg-danger-subtle hover:text-danger ${A11Y.FOCUS_RING}`}
                  >
                    <Trash2 size={ICON_SIZE.SM} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-text-primary">{t('signatures.create')}</h2>
            <SegmentedControl<Method>
              label={t('signatures.method')}
              value={method}
              onChange={setMethod}
              options={[
                { value: 'type', label: t('signatures.tab.type') },
                { value: 'draw', label: t('signatures.tab.draw') },
                { value: 'upload', label: t('signatures.tab.upload') },
              ]}
            />
            {method !== 'upload' && (
              <div role="radiogroup" aria-label={t('signatures.ink')} className="ml-auto flex items-center gap-2">
                <span className={FORM.LABEL}>{t('signatures.ink')}</span>
                {(Object.keys(SIGNATURE_INKS) as SignatureInk[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={ink === id}
                    aria-label={t(`signatures.ink.${id}`)}
                    title={t(`signatures.ink.${id}`)}
                    onClick={() => setInk(id)}
                    style={{ backgroundColor: SIGNATURE_INKS[id] }}
                    className={`h-6 w-6 rounded-full border border-border ring-offset-2 ring-offset-surface ${ink === id ? 'ring-2 ring-accent' : ''} ${A11Y.FOCUS_RING}`}
                  />
                ))}
              </div>
            )}
          </div>

          {method === 'type' && (
            <TypePanel text={text} onTextChange={setText} font={font} onFontChange={setChosenFont} color={SIGNATURE_INKS[ink]} />
          )}
          {method === 'draw' && <SignaturePad strokes={strokes} onChange={setStrokes} color={SIGNATURE_INKS[ink]} />}
          {method === 'upload' && <UploadPanel image={image} onImageChange={setImage} />}

          {returnPath && <p className="text-xs text-text-secondary">{t('signatures.returnNote')}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={cancel}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={save} disabled={!mark || saving}>
              {t('signatures.save')}
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title={t('signatures.deleteTitle')}
        message={t('signatures.deleteConfirm')}
        confirmLabel={t('signatures.delete')}
        danger
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </PageLayout>
  )
}
