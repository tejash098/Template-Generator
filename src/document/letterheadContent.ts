/**
 * Fixed text of the printed Shri Ram Bus Service letterhead, transcribed from
 * the sample photo. Nothing here is user-editable; it is the "template".
 */
export const LETTERHEAD = {
  proprietorLine: 'प्रो.- वशिष्ठ नारायण सिंह',
  mobileLine: 'मो.- 9472431786',
  title: 'SHRI RAM BUS SERVICE',
  address: 'अखलासपुर बस स्टैण्ड के सामने, भभुआ (कैमूर) बिहार- 821101',
  letterNoLabel: 'पत्रांक :',
  dateLabel: 'दिनांक :',
  footerNotes: [
    'नोट- बस के छतरी पर रखे सामान की गारंटी चालक की नहीं है।',
    'बारात जाने से पहले पुरा पैसा देना होगा।',
    'यात्री अपने सामान की सुरक्षा स्वयं करें।',
  ],
} as const

/** Fixed Hindi labels of the booking receipt (sentences live in bookingText.ts). */
export const BOOKING_TEXT = {
  mobilePrefix: 'मो.-',
  signatureLabel: 'हस्ताक्षर',
  issuedLabel: 'जारी दिनांक :',
} as const
