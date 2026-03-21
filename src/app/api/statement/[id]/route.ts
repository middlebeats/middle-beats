import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateStatementPDF } from '@/lib/pdf-generator'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const { data: statement, error } = await supabase
    .from('royalty_statements')
    .select('*, artists(*)')
    .eq('id', params.id)
    .single()

  if (error || !statement) {
    return NextResponse.json({ error: 'Statement not found' }, { status: 404 })
  }

  const { data: records } = await supabase
    .from('royalty_records')
    .select('*')
    .eq('artist_id', statement.artist_id)
    .eq('period', statement.period)

  const pdfBytes = await generateStatementPDF(
    statement.artists,
    statement,
    records || []
  )

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="MiddleBeats_${statement.artists.name.replace(/\s+/g,'_')}_${statement.period}.pdf"`,
    },
  })
}
