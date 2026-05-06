import * as React from 'react'
import { widgetStyles } from '../styles'
import type { PublicTreatmentOption } from '../types'

interface Props {
  treatments: PublicTreatmentOption[]
  onPick: (t: PublicTreatmentOption) => void
  onBack: () => void
}

export function TreatmentStep({ treatments, onPick, onBack }: Props): React.ReactElement {
  return (
    <div data-step="treatment_select">
      <p style={widgetStyles.greeting}>What can we help you with?</p>
      <div style={widgetStyles.treatmentList} role="list">
        {treatments.map((t) => (
          <button
            key={t.offering_id}
            type="button"
            role="listitem"
            style={widgetStyles.treatmentItem}
            onClick={() => onPick(t)}
            aria-label={`Choose ${t.label}`}
          >
            <span>{t.label}</span>
            <span aria-hidden="true" style={{ color: '#94a3b8', fontSize: 18 }}>
              ›
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        style={{ ...widgetStyles.secondaryButton, marginTop: 16 }}
        onClick={onBack}
      >
        Back
      </button>
    </div>
  )
}
