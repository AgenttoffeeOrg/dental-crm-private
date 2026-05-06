/**
 * Re-export the shared widget types for convenience inside the widget tree.
 * Keeps the widget self-contained: every type it needs is one import away.
 */
export type {
  PublicWidgetConfig,
  PublicTreatmentOption,
  WidgetPath,
  WebformField,
  TriggerMode,
  TriggerPosition,
} from '@/lib/booking-widget/types'
