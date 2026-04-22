export type FiberComponent = {
  fiber: string
  percentage: number
}

export type Yarn = {
  id: string
  producer: string
  name: string
  series: string | null
  full_name: string
  fiber_main: string | null
  thickness_category: string | null
  ball_weight_g: number | null
  length_per_100g_m: number | null
  needle_min_mm: number | null
  needle_max_mm: number | null
  gauge_stitches_10cm: number | null
  gauge_rows_10cm: number | null
  gauge_needle_mm: number | null
  twist_structure: string | null
  ply_count: number | null
  spin_type: string | null
  finish: string | null
  wash_care: string | null
  origin_country: string | null
  fiber_origin_country: string | null
  status: string | null
  certifications: string[] | null
  seasonal_suitability: string[] | null
  use_cases: string[] | null
  description: string | null
  fibers: FiberComponent[] | null
  color_count: number | null
  hero_image_url: string | null
}

export type SubstitutionCandidate = {
  yarn_id: string
  producer: string
  name: string
  series: string | null
  score: number
  verdict: 'perfekt' | 'god' | 'forbehold' | 'virker_ikke' | string
  is_manual: boolean
  critical_field: string | null
  notes: string | null
}

export type Verdict = 'perfekt' | 'god' | 'forbehold' | 'virker_ikke'

export type SubstitutionVoteRow = {
  id: string
  target_yarn_id: string
  candidate_yarn_id: string
  user_id: string
  verdict: Verdict
  comment: string | null
  created_at: string
  updated_at: string
}

export type SubstitutionSuggestionRow = {
  id: string
  target_yarn_id: string
  suggested_yarn_id: string | null
  suggested_producer: string | null
  suggested_name: string | null
  suggested_series: string | null
  suggested_url: string | null
  suggested_specs: unknown | null
  suggestion_type: 'catalog' | 'external'
  status: 'new' | 'approved' | 'rejected'
  user_id: string
  comment: string | null
  created_at: string
  updated_at: string
}

export type Color = {
  id: string
  yarn_id: string
  color_number: string | null
  color_name: string | null
  color_family: string | null
  hex_code: string | null
  status: string | null
  image_url: string | null
}

// ── Projekt-stadier ───────────────────────────────────────────────────────────

export const PROJECT_STATUSES = ['vil_gerne', 'i_gang', 'faerdigstrikket'] as const

export type ProjectStatus = typeof PROJECT_STATUSES[number]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  vil_gerne:       'Vil gerne strikke',
  i_gang:          'I gang',
  faerdigstrikket: 'Færdigstrikket',
}

// ── Fællesskabet (delte projekter) ───────────────────────────────────────────

export const PROJECT_TYPES = [
  'cardigan', 'sweater', 'top', 'hue', 'sjal',
  'stroemper', 'vest', 'troeje', 'toerklaede', 'taeppe', 'andet',
] as const

export type ProjectType = typeof PROJECT_TYPES[number]

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  cardigan:   'Cardigan',
  sweater:    'Sweater',
  top:        'Top',
  hue:        'Hue',
  sjal:       'Sjal',
  stroemper:  'Strømper',
  vest:       'Vest',
  troeje:     'Trøje',
  toerklaede: 'Tørklæde',
  taeppe:     'Tæppe',
  andet:      'Andet',
}

export type Profile = {
  id: string
  display_name: string | null
  created_at: string
  updated_at: string
}

export type SharedProjectYarn = {
  id: string
  project_id: string
  yarn_name: string | null
  yarn_brand: string | null
  color_name: string | null
  color_code: string | null
  hex_color: string | null
  catalog_yarn_id: string | null
  catalog_color_id: string | null
}

export type SharedProjectPublic = {
  id: string
  title: string | null
  project_image_url: string | null
  project_type: ProjectType | null
  community_description: string | null
  pattern_name: string | null
  pattern_designer: string | null
  shared_at: string
  display_name: string | null
  yarns: SharedProjectYarn[]
}
