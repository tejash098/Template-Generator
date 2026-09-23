import type { PageDimensionsMm } from '../document/pageSizes'

/**
 * Platform-neutral contract for turning the rendered sheet into files.
 *
 * The web implementation rasterises the DOM. Electron and Capacitor
 * implementations (milestone 2) can print the same DOM to a vector PDF via
 * the platform print engine and expose `pdfKind: 'vector'`.
 */
export interface ExportJob {
  /** The `.sheet` element, laid out at 1:1 (no CSS transform on it). */
  node: HTMLElement
  page: PageDimensionsMm
  /** File name without extension. */
  fileStem: string
  /** Document title metadata. */
  title?: string
}

export type ImageFormat = 'png' | 'jpeg'

export type ShareResult = 'shared' | 'cancelled' | 'unsupported'

export interface DocumentExporter {
  readonly pdfKind: 'vector' | 'raster'
  toImage(job: ExportJob, format: ImageFormat, dpi?: number): Promise<Blob>
  toPdf(job: ExportJob): Promise<Blob>
  /** One PDF with a page per job, in order (e.g. the multi-page bookings report). */
  pagesToPdf(jobs: ExportJob[], title?: string): Promise<Blob>
  /** Opens the platform print flow for the sheet currently on screen. */
  print(page: PageDimensionsMm): Promise<void>
  canShare(): boolean
  share(blob: Blob, fileName: string, title?: string): Promise<ShareResult>
  download(blob: Blob, fileName: string): void
}
