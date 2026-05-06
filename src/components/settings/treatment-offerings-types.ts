/**
 * Phase 2a.8 \u2014 shared row types for the treatment-offerings settings UI.
 *
 * The wire shape from `GET /api/settings/treatment-offerings` is duplicated here
 * (rather than being imported from the route handler) to keep the route a
 * server-only module and avoid pulling its imports into the client bundle.
 */

export interface TreatmentTypeRow {
  id: string
  display_name: string
  sort_order: number | null
}

export interface OfferingRow {
  id: string
  treatment_type_id: string | null
  custom_label: string | null
  pipeline_id: string
  stage_id: string | null
  custom_lead_value_cents_min: number | null
  custom_lead_value_cents_max: number | null
  is_active: boolean
  created_at: string
}

export interface PipelineRow {
  id: string
  name: string
  is_default: boolean
}

export interface StageRow {
  id: string
  pipeline_id: string
  name: string
  position: number
}

export interface TreatmentOfferingsApiResponse {
  treatment_types: TreatmentTypeRow[]
  offerings: OfferingRow[]
  pipelines: PipelineRow[]
  stages: StageRow[]
}
