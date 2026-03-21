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
  // Platform format: has reporting_date + channel + release_participants
  if (h.includes('reporting_date') || h.includes('release_participants')) return 'other_platforms'
  if (h.includes('release_title') && h.includes('channel') && h.includes('total')) return 'other_platforms'
  // Anghami format: has Song Name or Times Played
  if (h.includes('song name') || h.includes('times played')) return 'anghami'
  if (h.includes('song id') || h.includes('content type')) return 'anghami'
  return 'unknown'
}

function normalizePlatformRow(row: Record<string, string>): NormalizedRecord | null {
  // Must have at least a title (release or track)
  const release = (row.release_title || '').trim()
  const track = (row.track_title || '').trim()
  if (!release && !track) return null

  const rawRev = (row.total || row.revenue || '0').replace(/[$,\s]/g, '')
  const rev = parseFloat(rawRev) || 0

  // Period from reporting_date or sale_date
  const dateStr = (row.reporting_date || row.sale_date || row.accounting_date || '').trim()
  const period = dateStr ? dateStr.substring(0, 7) : ''
  const year = period.substring(0, 4)

  // Artist from release_participants or track_participants
  const participants = (row.release_participants || row.track_participants || '').trim()
  const artist_name = participants.split(',')[0].trim()

  return {
    period, year, artist_name,
    track_title: track || release,
    release_title: release,
    platform: (row.channel || '').trim(),
    country: (row.country || '').trim(),
    streams: parseInt((row.units || '0').replace(/[^0-9]/g, '')) || 0,
    revenue: rev,
    currency: (row.original_currency || 'USD').trim(),
    isrc: (row.isrc || '').trim(),
    upc: (row.upc || '').trim(),
    source: 'other_platforms',
  }
}

function normalizeAnghamiRow(row: Record<string, string>): NormalizedRecord | null {
  const songName = (row['Song Name'] || row['song name'] || '').trim()
  if (!songName) return null

  const rev = parseFloat((row['Revenue'] || row['revenue'] || '0').replace(/[$,]/g, '')) || 0
  const rawP = (row['Period'] || row['period'] || '').toString().trim()

  let period = rawP
  if (rawP.includes('/')) {
    const parts = rawP.split('/')
    const month = parts[0].padStart(2, '0')
    const rawYear = parts[parts.length - 1]
    const year = rawYear.length === 2 ? '20' + rawYear : rawYear
    period = `${year}-${month}`
  }
  const year = period.substring(0, 4)

  return {
    period, year,
    artist_name: (row['Artist Name'] || row['artist name'] || row['Album Artist Name'] || '').trim(),
    track_title: songName,
    release_title: (row['Album Name'] || row['album name'] || '').trim(),
    platform: (row['Channel'] || row['channel'] || 'Anghami').trim(),
    country: (row['Country'] || row['country'] || '').trim(),
    streams: parseInt((row['Times Played'] || row['times played'] || '0').replace(/[^0-9]/g, '')) || 0,
    revenue: rev,
    currency: 'USD',
    isrc: (row['ISRC'] || row['isrc'] || '').trim(),
    upc: (row['Album UPC'] || row['album upc'] || '').trim(),
    source: 'anghami',
  }
}

export function parseCSV(csvText: string): { records: NormalizedRecord[], source: StoreSource, rowCount: number } {
  const result = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  })

  const headers = (result.meta.fields || []) as string[]
  const source = detectSource(headers)
  const rows = result.data as Record<string, string>[]

  if (source === 'unknown') {
    console.error('Unknown CSV format. Headers:', headers.join(', '))
    return { records: [], source, rowCount: 0 }
  }

  const records: NormalizedRecord[] = []
  for (const row of rows) {
    try {
      let normalized: NormalizedRecord | null = null
      if (source === 'other_platforms') normalized = normalizePlatformRow(row)
      else if (source === 'anghami') normalized = normalizeAnghamiRow(row)
      if (normalized && normalized.artist_name) records.push(normalized)
    } catch (e) {
      // skip bad rows
    }
  }

  return { records, source, rowCount: records.length }
}
