import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import { Artist, RoyaltyRecord, RoyaltyStatement } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 48, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  logo: { fontSize: 22, fontFamily: 'Helvetica-Bold', letterSpacing: 2, color: '#040e2b' },
  logoSub: { fontSize: 9, color: '#6b7280', letterSpacing: 3, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  statementTitle: { fontSize: 11, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase' },
  statementId: { fontSize: 9, color: '#9ca3af', marginTop: 3, fontFamily: 'Helvetica' },

  artistSection: { marginBottom: 28 },
  sectionLabel: { fontSize: 8, color: '#9ca3af', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  artistName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#040e2b', marginBottom: 2 },
  artistEmail: { fontSize: 10, color: '#6b7280' },

  periodBadge: { backgroundColor: '#040e2b', color: '#ffffff', padding: '6 14', borderRadius: 4, fontSize: 10, fontFamily: 'Helvetica-Bold', letterSpacing: 1, alignSelf: 'flex-start', marginBottom: 28 },

  kpiRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  kpiBox: { flex: 1, backgroundColor: '#f8fafc', padding: '16 20', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  kpiLabel: { fontSize: 8, color: '#9ca3af', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  kpiValue: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#040e2b' },
  kpiSub: { fontSize: 8, color: '#9ca3af', marginTop: 3 },

  tableTitle: { fontSize: 9, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  table: { marginBottom: 24 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#040e2b', padding: '8 10', borderRadius: '4 4 0 0' },
  tableHeaderCell: { fontSize: 8, color: '#ffffff', fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: '8 10', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableRowAlt: { flexDirection: 'row', padding: '8 10', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#f9fafb' },
  tableCell: { fontSize: 9, color: '#374151' },
  tableCellMono: { fontSize: 9, color: '#374151', fontFamily: 'Helvetica' },

  col1: { width: '28%' },
  col2: { width: '20%' },
  col3: { width: '16%' },
  col4: { width: '16%' },
  col5: { width: '20%', textAlign: 'right' },

  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, paddingTop: 12, borderTopWidth: 2, borderTopColor: '#040e2b' },
  totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#040e2b', marginRight: 16 },
  totalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#040e2b' },

  footer: { position: 'absolute', bottom: 36, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#9ca3af' },

  pageNum: { position: 'absolute', bottom: 24, right: 48, fontSize: 8, color: '#9ca3af' },
})

interface Props {
  artist: Artist
  statement: RoyaltyStatement
  records: RoyaltyRecord[]
}

function groupByPlatform(records: RoyaltyRecord[]) {
  const m: Record<string, { streams: number; revenue: number }> = {}
  records.forEach(r => {
    if (!m[r.platform]) m[r.platform] = { streams: 0, revenue: 0 }
    m[r.platform].streams += r.streams
    m[r.platform].revenue += Number(r.revenue)
  })
  return Object.entries(m).map(([platform, v]) => ({ platform, ...v })).sort((a, b) => b.revenue - a.revenue)
}

function groupByTrack(records: RoyaltyRecord[]) {
  const m: Record<string, { streams: number; revenue: number }> = {}
  records.forEach(r => {
    const k = r.track_title || r.release_title || 'Unknown'
    if (!m[k]) m[k] = { streams: 0, revenue: 0 }
    m[k].streams += r.streams
    m[k].revenue += Number(r.revenue)
  })
  return Object.entries(m).map(([track, v]) => ({ track, ...v })).sort((a, b) => b.revenue - a.revenue)
}

export function RoyaltyStatementPDF({ artist, statement, records }: Props) {
  const byPlatform = groupByPlatform(records)
  const byTrack = groupByTrack(records)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>MIDDLE BEATS</Text>
            <Text style={styles.logoSub}>MUSIC DISTRIBUTION</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.statementTitle}>Royalty Statement</Text>
            <Text style={styles.statementId}>ID: {statement.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.statementId}>Issued: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          </View>
        </View>

        {/* Artist */}
        <View style={styles.artistSection}>
          <Text style={styles.sectionLabel}>Statement For</Text>
          <Text style={styles.artistName}>{artist.name}</Text>
          <Text style={styles.artistEmail}>{artist.email}</Text>
        </View>

        {/* Period */}
        <View style={styles.periodBadge}>
          <Text>PERIOD: {statement.period}</Text>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Revenue</Text>
            <Text style={styles.kpiValue}>${Number(statement.total_revenue).toFixed(4)}</Text>
            <Text style={styles.kpiSub}>USD</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Streams</Text>
            <Text style={styles.kpiValue}>{statement.total_streams.toLocaleString()}</Text>
            <Text style={styles.kpiSub}>All platforms</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Platforms</Text>
            <Text style={styles.kpiValue}>{byPlatform.length}</Text>
            <Text style={styles.kpiSub}>Stores</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Tracks</Text>
            <Text style={styles.kpiValue}>{byTrack.length}</Text>
            <Text style={styles.kpiSub}>Unique tracks</Text>
          </View>
        </View>

        {/* By Platform */}
        <Text style={styles.tableTitle}>Revenue by Platform</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Platform</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Streams</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Revenue (USD)</Text>
          </View>
          {byPlatform.map((row, i) => (
            <View key={row.platform} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: '50%' }]}>{row.platform}</Text>
              <Text style={[styles.tableCellMono, { width: '25%', textAlign: 'right' }]}>{row.streams.toLocaleString()}</Text>
              <Text style={[styles.tableCellMono, { width: '25%', textAlign: 'right' }]}>${row.revenue.toFixed(6)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>${Number(statement.total_revenue).toFixed(6)}</Text>
          </View>
        </View>

        {/* By Track */}
        <Text style={styles.tableTitle}>Revenue by Track</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '55%' }]}>Track</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Streams</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Revenue (USD)</Text>
          </View>
          {byTrack.slice(0, 15).map((row, i) => (
            <View key={row.track} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: '55%' }]} numberOfLines={1}>{row.track}</Text>
              <Text style={[styles.tableCellMono, { width: '20%', textAlign: 'right' }]}>{row.streams.toLocaleString()}</Text>
              <Text style={[styles.tableCellMono, { width: '25%', textAlign: 'right' }]}>${row.revenue.toFixed(6)}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Middle Beats · middle-beats.com · info@middle-beats.com</Text>
          <Text style={styles.footerText}>This statement is generated automatically and is valid without signature.</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateStatementPDF(artist: Artist, statement: RoyaltyStatement, records: RoyaltyRecord[]): Promise<Uint8Array> {
  const doc = <RoyaltyStatementPDF artist={artist} statement={statement} records={records} />
  return pdf(doc).toBuffer()
}
