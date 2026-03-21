import Papa from 'papaparse'

export type StoreSource = 'other_platforms' | 'anghami' | 'unknown'

export interface NormalizedRecord {
  period: string
  year: string
  artist_name: string
  track_title: string
  release_title: string
  platform: string
  country: string
  streams: number
  revenue: number
  currency: string
  isrc: string
  upc: string
  source: StoreSource
}

function detectSource(headers: string[]): StoreSource {
  const h = headers.map(x => (x || '').toLowerCase().trim())
  if (h.includes('release_title') || h.includes('channel')) return 'other_platforms'
  if (h.includes('song name') || h.includes('times played')) return 'anghami'
  return 'unknown'
}

function normalizePlatformRow(row: Record<string, string>): NormalizedRecord | null {
  if (!row.release_title) return null
  const rev = parseFloat((row.total || '').replace(/[$,]/g, '')) || 0
  const period = row.reporting_date ? row.reporting_date.substring(0, 7) : ''
  const year = period.substring(0, 4)
  return {
    period, year,
    artist_name: (row.release_participants || row.track_participants || '').split(',')[0].trim(),
    track_title: row.track_title || row.release_title || '',
    release_title: row.release_title || '',
    platform: row.channel || '',
    country: row.country || '',
    streams: parseInt(row.units) || 0,
    revenue: rev,
    currency: row.original_currency || 'USD',
    isrc: row.isrc || '',
    upc: row.upc || '',
    source: 'other_platforms',
  }
}

function normalizeAnghamiRow(row: Record<string, string>): NormalizedRecord | null {
  if (!row['Song Name'] && !row['song name']) return null
  const rev = parseFloat(row['Revenue'] || row['revenue'] || '0') || 0
  const rawP = (row['Period'] || row['period'] || '').toString()
  let period = rawP
  if (rawP.includes('/')) {
    const p = rawP.split('/')
    const m = p[0].padStart(2, '0')
    const y = p[p.length - 1].length === 2 ? '20' + p[p.length - 1] : p[p.length - 1]
    period = `${y}-${m}`
  }
  const year = period.substring(0, 4)
  return {
    period, year,
    artist_name: row['Artist Name'] || row['artist name'] || '',
    track_title: row['Song Name'] || row['song name'] || '',
    release_title: row['Album Name'] || row['album name'] || '',
    platform: row['Channel'] || row['channel'] || 'Anghami',
    country: row['Country'] || row['country'] || '',
    streams: parseInt(row['Times Played'] || row['times played'] || '0') || 0,
    revenue: rev,
    currency: 'USD',
    isrc: row['ISRC'] || row['isrc'] || '',
    upc: row['Album UPC'] || row['album upc'] || '',
    source: 'anghami',
  }
}

export function parseCSV(csvText: string): { records: NormalizedRecord[], source: StoreSource, rowCount: number } {
  const result = Papa.parse(csvText, { header: true, skipEmptyLines: true })
  const headers = (result.meta.fields || []) as string[]
  const source = detectSource(headers)
  const rows = result.data as Record<string, string>[]

  const records: NormalizedRecord[] = []
  for (const row of rows) {
    let normalized: NormalizedRecord | null = null
    if (source === 'other_platforms') normalized = normalizePlatformRow(row)
    else if (source === 'anghami') normalized = normalizeAnghamiRow(row)
    if (normalized) records.push(normalized)
  }

  return { records, source, rowCount: records.length }
}
