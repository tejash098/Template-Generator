import {
  CUSTOM_MAX_MM,
  CUSTOM_MIN_MM,
  PAGE_SIZES,
  PAGE_SIZE_OPTIONS,
  type Orientation,
  type PageSizeId,
  type PageSpec,
} from '../../document/pageSizes'

interface PageSetupProps {
  page: PageSpec
  onChange: (page: PageSpec) => void
}

export function PageSetup({ page, onChange }: PageSetupProps) {
  const setSize = (size: PageSizeId) => {
    if (size === 'custom') {
      const base = page.size === 'custom' ? null : PAGE_SIZES[page.size]
      onChange({
        ...page,
        size,
        customWidthMm: page.customWidthMm ?? base?.widthMm ?? PAGE_SIZES.letter.widthMm,
        customHeightMm: page.customHeightMm ?? base?.heightMm ?? PAGE_SIZES.letter.heightMm,
      })
    } else {
      onChange({ ...page, size })
    }
  }

  const setOrientation = (orientation: Orientation) => onChange({ ...page, orientation })

  const setCustom = (key: 'customWidthMm' | 'customHeightMm', raw: string) => {
    const value = Number(raw)
    onChange({ ...page, [key]: Number.isFinite(value) ? value : undefined })
  }

  return (
    <fieldset className="page-setup">
      <legend>Paper</legend>
      <div className="field-row">
        <label className="field">
          <span>Size</span>
          <select value={page.size} onChange={(e) => setSize(e.target.value as PageSizeId)}>
            {PAGE_SIZE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Orientation</span>
          <div className="segmented" role="radiogroup" aria-label="Orientation">
            {(['portrait', 'landscape'] as Orientation[]).map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={page.orientation === o}
                className={page.orientation === o ? 'is-active' : undefined}
                onClick={() => setOrientation(o)}
              >
                {o === 'portrait' ? 'Portrait' : 'Landscape'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {page.size === 'custom' && (
        <div className="field-row">
          <label className="field">
            <span>Width (mm)</span>
            <input
              type="number"
              min={CUSTOM_MIN_MM}
              max={CUSTOM_MAX_MM}
              step="0.1"
              value={page.customWidthMm ?? ''}
              onChange={(e) => setCustom('customWidthMm', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Height (mm)</span>
            <input
              type="number"
              min={CUSTOM_MIN_MM}
              max={CUSTOM_MAX_MM}
              step="0.1"
              value={page.customHeightMm ?? ''}
              onChange={(e) => setCustom('customHeightMm', e.target.value)}
            />
          </label>
        </div>
      )}
    </fieldset>
  )
}
