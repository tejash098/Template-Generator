import type { DocumentExporter } from './exporter'
import { webExporter } from './webExporter'

export type { DocumentExporter, ExportJob, ImageFormat, ShareResult } from './exporter'

/**
 * Picks the exporter for the platform the SPA is running on.
 *
 * Milestone 2 will add an Electron exporter (webContents.printToPDF → vector
 * PDF) and a Capacitor exporter (native print-to-PDF + share sheet); both
 * will be detected here so feature code never branches on platform.
 */
export function getExporter(): DocumentExporter {
  return webExporter
}
