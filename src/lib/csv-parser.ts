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

function extractArtists(raw: string): string[] {
  if (!raw) return []
  const parts = raw.split(/\s*&\s*|\s*,\s*/)
  return parts.map(p => p.trim()).filter(Boolean)
}

function detectSource(headers: string[]): StoreSource {
  const h = headers.map(x => (x || '').toLowerCase().trim())
  if (h.includes('reporting_date') || h.includes('release_participants')) return 'other_platforms'
  if (h.includes('release_title') && h.includes('channel') && h.includes('total')) return 'other_platforms'
  if (h.includes('song name') || h.includes('times played') || h.includes('song id')) return 'anghami'
  return 'unknown'
}

function normalizePlatformRow(row: Record<string, string>): NormalizedRecord[] {
  const release = (row.release_title || '').trim()
  const track = (row.track_title || '').trim()
  if (!release && !track) return []
  const rawRev = (row.total || row.revenue || '0').replace(/[$,\s]/g, '')
  const rev = parseFloat(rawRev) || 0
  const dateStr = (row.reporting_date || row.sale_date || row.accounting_date || '').trim()
  const period = dateStr ? dateStr.substring(0, 7) : ''
  const year = period.substring(0, 4)
  const rawParticipants = (row.release_participants || row.track_participants || '').trim()
  const artists = extractArtists(rawParticipants)
  if (!artists.length) return []
  return artists.map(artist_name => ({
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
    source: 'other_platforms' as StoreSource,
  }))
}

function normalizeAnghamiRow(row: Record<string, string>): NormalizedRecord[] {
  const songName = (row['Song Name'] || row['song name'] || '').trim()
  if (!songName) return []
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
  const rawArtist = (row['Artist Name'] || row['artist name'] || row['Album Artist Name'] || '').trim()
  const artists = extractArtists(rawArtist)
  if (!artists.length) return []
  return artists.map(artist_name => ({
    period, year, artist_name,
    track_title: songName,
    release_title: (row['Album Name'] || row['album name'] || '').trim(),
    platform: (row['Channel'] || row['channel'] || 'Anghami').trim(),
    country: (row['Country'] || row['country'] || '').trim(),
    streams: parseInt((row['Times Played'] || row['times played'] || '0').replace(/[^0-9]/g, '')) || 0,
    revenue: rev,
    currency: 'USD',
    isrc: (row['ISRC'] || row['isrc'] || '').trim(),
    upc: (row['Album UPC'] || row['album upc'] || '').trim(),
    source: 'anghami' as StoreSource,
  }))
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
  if (source === 'unknown') return { records: [], source, rowCount: 0 }
  const records: NormalizedRecord[] = []
  for (const row of rows) {
    try {
      const normalized = source === 'other_platforms' ? normalizePlatformRow(row) : normalizeAnghamiRow(row)
      records.push(...normalized)
    } catch (e) {}
  }
  return { records, source, rowCount: records.length }
}
