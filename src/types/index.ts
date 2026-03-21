export type Role = 'admin' | 'artist'

export interface Profile {
  id: string
  role: Role
  artist_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Artist {
  id: string
  user_id: string | null
  name: string
  name_ar: string | null
  email: string
  phone: string | null
  bio: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Release {
  id: string
  artist_id: string
  title: string
  title_ar: string | null
  upc: string | null
  release_date: string | null
  cover_url: string | null
  created_at: string
}

export interface Track {
  id: string
  artist_id: string
  release_id: string | null
  title: string
  title_ar: string | null
  isrc: string | null
  created_at: string
}

export interface ReportUpload {
  id: string
  filename: string
  source: 'other_platforms' | 'anghami' | 'unknown'
  period_start: string | null
  period_end: string | null
  row_count: number
  uploaded_by: string | null
  uploaded_at: string
}

export interface RoyaltyRecord {
  id: string
  upload_id: string | null
  artist_id: string
  track_id: string | null
  release_title: string | null
  track_title: string | null
  period: string
  year: string | null
  platform: string
  country: string | null
  streams: number
  revenue: number
  currency: string
  isrc: string | null
  upc: string | null
  source: string | null
  created_at: string
}

export interface RoyaltyStatement {
  id: string
  artist_id: string
  period: string
  total_revenue: number
  total_streams: number
  status: 'draft' | 'sent' | 'paid'
  pdf_url: string | null
  sent_at: string | null
  created_at: string
}

export interface Notification {
  id: string
  artist_id: string
  title: string
  message: string
  type: 'info' | 'statement' | 'alert'
  is_read: boolean
  created_at: string
}

// Analytics types
export interface PlatformStat {
  platform: string
  revenue: number
  streams: number
}

export interface PeriodStat {
  period: string
  revenue: number
  streams: number
}

export interface CountryStat {
  country: string
  revenue: number
  streams: number
}

export interface TrackStat {
  track_title: string
  revenue: number
  streams: number
}
