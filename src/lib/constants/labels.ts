/**
 * UI Labels & Terminology Constants
 * 
 * Centralized labels for consistent terminology across the application.
 * This makes it easy to rename features globally (e.g., "Deals" → "Opportunities").
 */

export const LABELS = {
  // Core Entities
  DEAL: {
    singular: 'Deal',
    plural: 'Deals',
    verb: 'deal',
    verbPlural: 'deals',
  },
  PIPELINE: {
    singular: 'Pipeline',
    plural: 'Pipelines',
    verb: 'pipeline',
    verbPlural: 'pipelines',
  },
  CONTACT: {
    singular: 'Contact',
    plural: 'Contacts',
    verb: 'contact',
    verbPlural: 'contacts',
  },
  TASK: {
    singular: 'Task',
    plural: 'Tasks',
    verb: 'task',
    verbPlural: 'tasks',
  },
  ORGANIZATION: {
    singular: 'Organization',
    plural: 'Organizations',
    verb: 'organization',
    verbPlural: 'organizations',
  },
  LOCATION: {
    singular: 'Location',
    plural: 'Locations',
    verb: 'location',
    verbPlural: 'locations',
  },
  
  // Actions
  ACTIONS: {
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    export: 'Export',
    import: 'Import',
    assign: 'Assign',
    filter: 'Filter',
    search: 'Search',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
  },
  
  // States
  STATES: {
    loading: 'Loading...',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Error',
    success: 'Success',
    empty: 'No items found',
    noResults: 'No results',
  },
  
  // Common UI Elements
  UI: {
    showMore: 'Show more',
    showLess: 'Show less',
    selectAll: 'Select all',
    clearAll: 'Clear all',
    apply: 'Apply',
    reset: 'Reset',
    confirm: 'Confirm',
    next: 'Next',
    previous: 'Previous',
    finish: 'Finish',
    skip: 'Skip',
  },
} as const

// Helper function to format labels
export function formatLabel(label: string, count?: number): string {
  if (count === undefined) return label
  return count === 1 ? label : `${label}s`
}

// Helper to get entity label by key
export function getEntityLabel(
  entity: keyof typeof LABELS,
  type: 'singular' | 'plural' | 'verb' | 'verbPlural' = 'singular'
): string {
  const entityLabels = LABELS[entity]
  if (entityLabels && typeof entityLabels === 'object' && type in entityLabels) {
    return entityLabels[type as keyof typeof entityLabels] as string
  }
  return entity.toString()
}

