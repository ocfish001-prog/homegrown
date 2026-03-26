/**
 * Supabase TypeScript types for Homegrown
 * Generated to match live schema (camelCase Prisma-style columns)
 * Last updated: 2026-03-26
 */

export type AgeRangeDB = 'young_kids' | 'older_kids' | 'all_ages' | 'family'

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          externalId: string | null
          source: string
          title: string
          description: string | null
          startDate: string
          endDate: string | null
          isFree: boolean
          cost: string | null
          imageUrl: string | null
          externalUrl: string
          relevanceScore: number
          isApproved: boolean
          ageRange: AgeRangeDB | null
          venueId: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          externalId?: string | null
          source: string
          title: string
          description?: string | null
          startDate: string
          endDate?: string | null
          isFree?: boolean
          cost?: string | null
          imageUrl?: string | null
          externalUrl: string
          relevanceScore?: number
          isApproved?: boolean
          ageRange?: AgeRangeDB | null
          venueId?: string | null
          createdAt?: string
          updatedAt: string
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      venues: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          lat: number | null
          lng: number | null
          createdAt: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          lat?: number | null
          lng?: number | null
          createdAt?: string
        }
        Update: Partial<Database['public']['Tables']['venues']['Insert']>
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          icon: string | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          icon?: string | null
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      organizers: {
        Row: {
          id: string
          name: string
          description: string | null
          isSecular: boolean
          ageRange: string | null
          contactUrl: string | null
          lat: number | null
          lng: number | null
          city: string | null
          state: string | null
          isApproved: boolean
          createdAt: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          isSecular?: boolean
          ageRange?: string | null
          contactUrl?: string | null
          lat?: number | null
          lng?: number | null
          city?: string | null
          state?: string | null
          isApproved?: boolean
          createdAt?: string
        }
        Update: Partial<Database['public']['Tables']['organizers']['Insert']>
      }
      saved_events: {
        Row: {
          id: string
          eventId: string
          sessionId: string
          createdAt: string
        }
        Insert: {
          id?: string
          eventId: string
          sessionId: string
          createdAt?: string
        }
        Update: Partial<Database['public']['Tables']['saved_events']['Insert']>
      }
      source_syncs: {
        Row: {
          source: string
          lastSyncedAt: string
          lastSyncCount: number
          lastEtag: string | null
          updatedAt: string
        }
        Insert: {
          source: string
          lastSyncedAt: string
          lastSyncCount?: number
          lastEtag?: string | null
          updatedAt: string
        }
        Update: Partial<Database['public']['Tables']['source_syncs']['Insert']>
      }
    }
  }
}
