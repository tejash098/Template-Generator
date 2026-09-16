/** Template identifiers, kept separate from the registry so storage can import them without a cycle. */
export const TEMPLATE_IDS = ['bus-booking'] as const

export type TemplateId = (typeof TEMPLATE_IDS)[number]

export const isTemplateId = (value: unknown): value is TemplateId =>
  typeof value === 'string' && (TEMPLATE_IDS as readonly string[]).includes(value)
