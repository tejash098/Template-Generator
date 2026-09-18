import { Field } from '../../components/ui/Field'
import { FORM } from '../../config/constants'
import { bookingBalance } from '../../document/bookingText'
import { useLocale } from '../../i18n/useLocale'
import type { BookingFields } from '../../storage/bookings'
import { TransliterateInput } from '../../transliteration/TransliterateInput'
import { PaperAndPadSetup } from './PaperAndPadSetup'

interface BookingFormProps {
  fields: BookingFields
  /** Display value of the auto-assigned number; empty until first save. */
  bookingNo: string
  hindiTyping: boolean
  onChange: (patch: Partial<BookingFields>) => void
}

const HINDI_INPUT = `${FORM.INPUT} ${FORM.HINDI_INPUT}`

/** Parses a money input; empty or junk becomes 0 so the sheet always renders. */
const toAmount = (raw: string): number => {
  const n = Math.round(Number(raw))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function BookingForm({ fields, bookingNo, hindiTyping, onChange }: BookingFormProps) {
  const { t } = useLocale()
  const xlitLabels = { suggestions: t('xlit.suggestions'), offline: t('xlit.offline') }
  const balance = bookingBalance(fields)

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="bookingNo" label={t('field.bookingNo')}>
          <input id="bookingNo" type="text" className={FORM.INPUT} value={bookingNo || t('field.bookingNoPending')} readOnly />
        </Field>
        <Field id="bookingDate" label={t('field.bookingDate')}>
          <input
            id="bookingDate"
            type="date"
            className={FORM.INPUT}
            value={fields.bookingDate}
            onChange={(e) => onChange({ bookingDate: e.target.value })}
            required
          />
        </Field>
      </div>

      <h3 className="mt-1 text-sm font-semibold text-text-primary">{t('editor.details')}</h3>

      <Field id="name" label={t('field.name')}>
        <TransliterateInput
          id="name"
          className={HINDI_INPUT}
          enabled={hindiTyping}
          labels={xlitLabels}
          value={fields.name}
          onChange={(name) => onChange({ name })}
          placeholder={t('field.placeholder.name')}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="village" label={t('field.village')}>
          <TransliterateInput
            id="village"
            className={HINDI_INPUT}
            enabled={hindiTyping}
            labels={xlitLabels}
            value={fields.village}
            onChange={(village) => onChange({ village })}
            placeholder={t('field.placeholder.village')}
          />
        </Field>
        <Field id="post" label={t('field.post')}>
          <TransliterateInput
            id="post"
            className={HINDI_INPUT}
            enabled={hindiTyping}
            labels={xlitLabels}
            value={fields.post}
            onChange={(post) => onChange({ post })}
            placeholder={t('field.placeholder.post')}
          />
        </Field>
        <Field id="thana" label={t('field.thana')}>
          <TransliterateInput
            id="thana"
            className={HINDI_INPUT}
            enabled={hindiTyping}
            labels={xlitLabels}
            value={fields.thana}
            onChange={(thana) => onChange({ thana })}
            placeholder={t('field.placeholder.thana')}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="from" label={t('field.from')}>
          <TransliterateInput
            id="from"
            className={HINDI_INPUT}
            enabled={hindiTyping}
            labels={xlitLabels}
            value={fields.from}
            onChange={(from) => onChange({ from })}
            placeholder={t('field.placeholder.from')}
          />
        </Field>
        <Field id="to" label={t('field.to')}>
          <TransliterateInput
            id="to"
            className={HINDI_INPUT}
            enabled={hindiTyping}
            labels={xlitLabels}
            value={fields.to}
            onChange={(to) => onChange({ to })}
            placeholder={t('field.placeholder.to')}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="travelDate" label={t('field.travelDate')}>
          <input
            id="travelDate"
            type="date"
            className={FORM.INPUT}
            value={fields.travelDate}
            onChange={(e) => onChange({ travelDate: e.target.value })}
          />
        </Field>
        <Field id="departureTime" label={t('field.departureTime')}>
          <input
            id="departureTime"
            type="time"
            className={FORM.INPUT}
            value={fields.departureTime}
            onChange={(e) => onChange({ departureTime: e.target.value })}
          />
        </Field>
        <Field id="returnDate" label={t('field.returnDate')}>
          <input
            id="returnDate"
            type="date"
            className={FORM.INPUT}
            value={fields.returnDate}
            onChange={(e) => onChange({ returnDate: e.target.value })}
          />
        </Field>
        <Field id="returnTime" label={t('field.returnTime')}>
          <input
            id="returnTime"
            type="time"
            className={FORM.INPUT}
            value={fields.returnTime}
            onChange={(e) => onChange({ returnTime: e.target.value })}
          />
        </Field>
      </div>

      <h3 className="mt-1 text-sm font-semibold text-text-primary">{t('editor.amounts')}</h3>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="fare" label={t('field.fare')}>
          <input
            id="fare"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className={FORM.INPUT}
            value={fields.fare || ''}
            onChange={(e) => onChange({ fare: toAmount(e.target.value) })}
          />
        </Field>
        <Field id="advance" label={t('field.advance')}>
          <input
            id="advance"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className={FORM.INPUT}
            value={fields.advance || ''}
            onChange={(e) => onChange({ advance: toAmount(e.target.value) })}
          />
        </Field>
        <Field id="balance" label={t('field.balance')}>
          <input id="balance" type="text" className={FORM.INPUT} value={balance} readOnly />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="mobile" label={t('field.mobile')}>
          <input
            id="mobile"
            type="tel"
            inputMode="numeric"
            maxLength={12}
            className={FORM.INPUT}
            value={fields.mobile}
            onChange={(e) => onChange({ mobile: e.target.value.replace(/\D/g, '') })}
            placeholder={t('field.placeholder.mobile')}
          />
        </Field>
        <Field id="mobile2" label={t('field.mobile2')}>
          <input
            id="mobile2"
            type="tel"
            inputMode="numeric"
            maxLength={12}
            className={FORM.INPUT}
            value={fields.mobile2}
            onChange={(e) => onChange({ mobile2: e.target.value.replace(/\D/g, '') })}
            placeholder={t('field.placeholder.mobile')}
          />
        </Field>
        <Field id="bus" label={t('field.bus')}>
          <TransliterateInput
            id="bus"
            className={HINDI_INPUT}
            enabled={hindiTyping}
            labels={xlitLabels}
            value={fields.bus}
            onChange={(bus) => onChange({ bus })}
            placeholder={t('field.placeholder.bus')}
          />
        </Field>
      </div>

      <PaperAndPadSetup
        page={fields.page}
        padColor={fields.padColor}
        onPageChange={(page) => onChange({ page })}
        onPadColorChange={(padColor) => onChange({ padColor })}
      />
    </form>
  )
}
