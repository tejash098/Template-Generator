import { BookingSheet, type BookingContent } from '../document/BookingSheet'
import { nextDayIso, todayIso } from '../document/format'
import { DEFAULT_PAD_COLOR, type PadColorId } from '../document/padColors'
import type { Bilingual } from '../i18n/strings'
import { newBookingFields, type BookingFields } from '../storage/bookings'
import { isTemplateId, type TemplateId } from './ids'

/**
 * Every document type the app can generate. The gallery, the colour-picker
 * and the routes hang off this table, so adding a template means adding an
 * entry here (plus its sheet/form) rather than touching routing.
 */
export interface TemplateDef {
  id: TemplateId
  name: Bilingual
  description: Bilingual
  defaultPadColor: PadColorId
  /** Fresh form values for a new document of this type. */
  newFields: (init?: { padColor?: PadColorId }) => BookingFields
  /** Filled-in example used for the gallery thumbnail and the colour preview. */
  sampleContent: (padColor: PadColorId) => BookingContent
  Sheet: typeof BookingSheet
  routes: {
    list: string
    start: string
    edit: (id: string) => string
    newWith: (padColor: PadColorId) => string
  }
}

const busBooking: TemplateDef = {
  id: 'bus-booking',
  name: { en: 'Bus Booking', hi: 'बस बुकिंग' },
  description: {
    en: 'Baraat / hire booking receipt with fare, advance and balance, written on the letterhead.',
    hi: 'बरात / भाड़े की बुकिंग रसीद — किराया, बयाना और बाकी के साथ, लेटरहेड पर।',
  },
  defaultPadColor: DEFAULT_PAD_COLOR,
  newFields: (init) => newBookingFields({ template: 'bus-booking', padColor: init?.padColor ?? DEFAULT_PAD_COLOR }),
  sampleContent: (padColor) => ({
    bookingNo: '0001',
    bookingDate: todayIso(),
    issuedDate: todayIso(),
    issuedByName: 'वशिष्ठ नारायण सिंह',
    name: 'तेजस कुमार सिंह',
    village: 'केखड़ा',
    post: '',
    thana: 'भभुआ',
    from: 'भभुआ',
    to: 'बिहार',
    travelDate: todayIso(),
    departureTime: '16:00',
    returnDate: nextDayIso(todayIso()),
    returnTime: '06:00',
    fare: 10000,
    advance: 2000,
    mobile: '917057xxxxx',
    mobile2: '',
    bus: 'Star बस बड़ी',
    padColor,
  }),
  Sheet: BookingSheet,
  routes: {
    list: '/bookings',
    start: '/templates/bus-booking',
    edit: (id) => `/bookings/${id}`,
    newWith: (padColor) => `/new?template=bus-booking&color=${padColor}`,
  },
}

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  'bus-booking': busBooking,
}

export const TEMPLATE_LIST: TemplateDef[] = Object.values(TEMPLATES)

export { isTemplateId }
export type { TemplateId }
