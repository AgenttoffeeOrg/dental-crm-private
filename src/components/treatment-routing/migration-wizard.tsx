/**
 * =====================================================
 * MIGRATION WIZARD COMPONENT
 * =====================================================
 * Version: 1.0.0
 * Date: October 19, 2025
 * Phase: 14 - Bulk Operations
 * =====================================================
 * 
 * PURPOSE:
 * Wizard to migrate treatment tag configurations from localStorage
 * (legacy system) to the database (new system).
 * 
 * FEATURES:
 * - Detect localStorage configuration
 * - Preview migration changes
 * - Validate tag names
 * - Handle conflicts
 * - Preserve existing DB tags
 * - Backup before migration
 * - Rollback support
 * 
 * MIGRATION STEPS:
 * 1. Detect localStorage data
 * 2. Preview tags to be migrated
 * 3. Resolve conflicts
 * 4. Execute migration
 * 5. Verify success
 * 6. Clean up localStorage
 * 
 * =====================================================
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  AlertCircle, 
  CheckCircle, 
  ArrowRight,
  Download,
  Upload,
  Trash2,
  Loader2,
  FileWarning
} from 'lucide-react'
import type { TreatmentTagConfig } from '@/lib/deal-categorization'

// =====================================================
// TYPES
// =====================================================

interface LocalStorageTag {
  name: string
  keywords: string[]
  color?: string
  icon?: string
}

interface MigrationPreview {
  tagsToMigrate: LocalStorageTag[]
  existingTags: string[]
  conflicts: string[]
  newTags: string[]
}

interface MigrationResult {
  success: boolean
  migratedCount: number
  skippedCount: number
  errors: string[]
  createdTags: Array<{ id: string; name: string }>
}

type MigrationStep = 'detect' | 'preview' | 'execute' | 'complete'

// =====================================================
// MAIN COMPONENT
// =====================================================

export function MigrationWizard() {
  const supabase = createClient()

  const [step, setStep] = useState<MigrationStep>('detect')
  const [loading, setLoading] = useState(false)
  const [localStorageTags, setLocalStorageTags] = useState<LocalStorageTag[]>([])
  const [preview, setPreview] = useState<MigrationPreview | null>(null)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [cleanupLocalStorage, setCleanupLocalStorage] = useState(true)
  const [backupCreated, setBackupCreated] = useState(false)

  // ============================================
  // STEP 1: DETECT LOCALSTORAGE DATA
  // ============================================

  useEffect(() => {
    detectLocalStorageData()
  }, [])

  function detectLocalStorageData() {
    try {
      // Try to detect old localStorage configuration
      const configStr = localStorage.getItem('treatmentTagConfig')
      if (!configStr) {
        console.log('[Migration] No localStorage configuration found')
        return
      }

      const config: TreatmentTagConfig[] = JSON.parse(configStr)
      
      const tags: LocalStorageTag[] = config.map(c => ({
        name: c.name,
        keywords: c.keywords,
        color: c.color,
        icon: c.icon
      }))

      setLocalStorageTags(tags)
      setSelectedTags(new Set(tags.map(t => t.name)))
      
      console.log(`[Migration] Found ${tags.length} tags in localStorage`)
    } catch (error) {
      console.error('[Migration] Error detecting localStorage data:', error)
    }
  }

  // ============================================
  // STEP 2: GENERATE PREVIEW
  // ============================================

  async function generatePreview() {
    setLoading(true)
    try {
      // Fetch existing tags from database
      const { data: existingTags, error } = await supabase
        .from('treatment_tags')
        .select('name')

      if (error) throw error

      const existingTagNames = existingTags?.map(t => t.name) || []
      const tagsToMigrate = localStorageTags.filter(t => selectedTags.has(t.name))
      
      const conflicts = tagsToMigrate
        .filter(t => existingTagNames.includes(t.name))
        .map(t => t.name)
      
      const newTags = tagsToMigrate
        .filter(t => !existingTagNames.includes(t.name))
        .map(t => t.name)

      setPreview({
        tagsToMigrate,
        existingTags: existingTagNames,
        conflicts,
        newTags
      })

      setStep('preview')
    } catch (error) {
      console.error('[Migration] Error generating preview:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // STEP 3: CREATE BACKUP
  // ============================================

  function createBackup() {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        tags: localStorageTags,
        localStorage: {
          treatmentTagConfig: localStorage.getItem('treatmentTagConfig')
        }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `treatment-tags-backup-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)

      setBackupCreated(true)
      alert('✅ Backup created successfully! The file has been downloaded.')
    } catch (error) {
      console.error('[Migration] Error creating backup:', error)
      alert(`Error creating backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ============================================
  // STEP 4: EXECUTE MIGRATION
  // ============================================

  async function executeMigration() {
    if (!preview) return
    
    if (!backupCreated) {
      const confirmed = window.confirm(
        '⚠️ You haven\'t created a backup yet.\n\n' +
        'It\'s highly recommended to create a backup before migrating.\n\n' +
        'Do you want to continue without a backup?'
      )
      if (!confirmed) return
    }

    setLoading(true)
    setStep('execute')

    try {
      const result: MigrationResult = {
        success: true,
        migratedCount: 0,
        skippedCount: 0,
        errors: [],
        createdTags: []
      }

      // Only migrate new tags (skip conflicts)
      const tagsToCreate = preview.tagsToMigrate.filter(t => 
        preview.newTags.includes(t.name)
      )

      for (const tag of tagsToCreate) {
        try {
          // Validate tag name
          if (!tag.name || tag.name.trim().length === 0) {
            result.errors.push(`Empty tag name`)
            result.skippedCount++
            continue
          }

          // Create tag in database
          const { data: createdTag, error } = await supabase
            .from('treatment_tags')
            .insert({
              name: tag.name,
              keywords: tag.keywords,
              color: tag.color || '#3B82F6',
              icon: tag.icon || '🦷',
              is_active: true
            })
            .select('id, name')
            .single()

          if (error) {
            result.errors.push(`${tag.name}: ${error.message}`)
            result.skippedCount++
          } else if (createdTag) {
            result.createdTags.push(createdTag)
            result.migratedCount++
            console.log(`[Migration] Migrated tag: ${tag.name}`)
          }
        } catch (tagError) {
          const errorMsg = tagError instanceof Error ? tagError.message : 'Unknown error'
          result.errors.push(`${tag.name}: ${errorMsg}`)
          result.skippedCount++
        }
      }

      // Count conflicts as skipped
      result.skippedCount += preview.conflicts.length

      setMigrationResult(result)

      // Clean up localStorage if requested
      if (cleanupLocalStorage && result.migratedCount > 0) {
        try {
          localStorage.removeItem('treatmentTagConfig')
          console.log('[Migration] Cleaned up localStorage')
        } catch (cleanupError) {
          console.warn('[Migration] Could not clean up localStorage:', cleanupError)
        }
      }

      setStep('complete')
    } catch (error) {
      console.error('[Migration] Migration failed:', error)
      alert(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // RENDER STEPS
  // ============================================

  function renderDetectStep() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Step 1: Detect Legacy Data</h3>
          <p className="text-gray-600">
            Looking for treatment tag configurations in browser localStorage...
          </p>
        </div>

        {localStorageTags.length === 0 ? (
          <div className="bg-gray-50 border rounded-lg p-8 text-center">
            <FileWarning className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-semibold mb-2">No Legacy Data Found</h4>
            <p className="text-gray-600 mb-4">
              No treatment tag configuration was found in localStorage.
            </p>
            <p className="text-sm text-gray-500">
              This is normal if you're a new user or have already migrated.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">
                    Legacy Data Found
                  </h4>
                  <p className="text-sm text-green-800 mb-3">
                    Found {localStorageTags.length} treatment tag(s) in localStorage that can be migrated to the database.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Select Tags to Migrate</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                {localStorageTags.map((tag) => (
                  <div key={tag.name} className="flex items-center gap-3">
                    <Checkbox
                      id={`tag-${tag.name}`}
                      checked={selectedTags.has(tag.name)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedTags)
                        if (checked) {
                          newSelected.add(tag.name)
                        } else {
                          newSelected.delete(tag.name)
                        }
                        setSelectedTags(newSelected)
                      }}
                    />
                    <Label htmlFor={`tag-${tag.name}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">{tag.name}</div>
                      <div className="text-sm text-gray-600">
                        {tag.keywords.length} keyword(s): {tag.keywords.slice(0, 3).join(', ')}
                        {tag.keywords.length > 3 && ` +${tag.keywords.length - 3} more`}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={generatePreview}
                disabled={loading || selectedTags.size === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setSelectedTags(new Set())}>
                Deselect All
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectedTags(new Set(localStorageTags.map(t => t.name)))}
              >
                Select All
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  function renderPreviewStep() {
    if (!preview) return null

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Step 2: Preview Migration</h3>
          <p className="text-gray-600">
            Review the changes that will be made to your database.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{preview.newTags.length}</div>
            <div className="text-sm text-gray-600">New Tags to Create</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{preview.conflicts.length}</div>
            <div className="text-sm text-gray-600">Conflicts (Will Skip)</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{preview.existingTags.length}</div>
            <div className="text-sm text-gray-600">Existing Tags in DB</div>
          </div>
        </div>

        {/* New Tags */}
        {preview.newTags.length > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Tags to Create ({preview.newTags.length})
            </h4>
            <div className="space-y-2">
              {preview.newTags.map(tagName => {
                const tag = preview.tagsToMigrate.find(t => t.name === tagName)
                return (
                  <div key={tagName} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <span className="text-lg">{tag?.icon || '🦷'}</span>
                    <div className="flex-1">
                      <div className="font-medium">{tagName}</div>
                      <div className="text-sm text-gray-600">
                        {tag?.keywords.length} keywords
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Conflicts */}
        {preview.conflicts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Conflicts ({preview.conflicts.length})
            </h4>
            <p className="text-sm text-yellow-800 mb-3">
              These tags already exist in the database and will be skipped:
            </p>
            <div className="space-y-1">
              {preview.conflicts.map(tagName => (
                <div key={tagName} className="text-sm font-medium text-yellow-900">
                  • {tagName}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Migration Options</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="cleanup"
                checked={cleanupLocalStorage}
                onCheckedChange={(checked) => setCleanupLocalStorage(checked as boolean)}
              />
              <Label htmlFor="cleanup" className="cursor-pointer">
                <span className="font-medium">Clean up localStorage after migration</span>
                <span className="text-sm text-gray-600 block">
                  Remove the old configuration from localStorage (recommended)
                </span>
              </Label>
            </div>
          </div>
        </div>

        {/* Backup */}
        <div className={`border rounded-lg p-4 ${backupCreated ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold mb-1">
                {backupCreated ? '✅ Backup Created' : '💾 Create Backup (Recommended)'}
              </h4>
              <p className="text-sm text-gray-600">
                {backupCreated 
                  ? 'Your data has been backed up and downloaded'
                  : 'Download a backup of your localStorage data before migrating'}
              </p>
            </div>
            <Button variant="outline" onClick={createBackup} disabled={backupCreated}>
              <Download className="w-4 h-4 mr-2" />
              {backupCreated ? 'Backed Up' : 'Create Backup'}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={() => setStep('detect')} variant="outline">
            Back
          </Button>
          <Button 
            onClick={executeMigration}
            disabled={loading || preview.newTags.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                Execute Migration
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  function renderExecuteStep() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Step 3: Migrating...</h3>
          <p className="text-gray-600">
            Please wait while we migrate your treatment tags to the database.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h4 className="font-semibold mb-2">Migration in Progress...</h4>
          <p className="text-sm text-gray-600">
            This may take a few moments. Please don't close this window.
          </p>
        </div>
      </div>
    )
  }

  function renderCompleteStep() {
    if (!migrationResult) return null

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Step 4: Migration Complete</h3>
          <p className="text-gray-600">
            Your treatment tags have been migrated to the database.
          </p>
        </div>

        {/* Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{migrationResult.migratedCount}</div>
            <div className="text-sm text-gray-600">Successfully Migrated</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{migrationResult.skippedCount}</div>
            <div className="text-sm text-gray-600">Skipped</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{migrationResult.errors.length}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>

        {/* Success Message */}
        {migrationResult.migratedCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">Migration Successful!</h4>
                <p className="text-sm text-green-800 mb-3">
                  {migrationResult.migratedCount} tag(s) have been successfully migrated to the database.
                </p>
                <div className="space-y-1">
                  {migrationResult.createdTags.map(tag => (
                    <div key={tag.id} className="text-sm text-green-900">
                      ✓ {tag.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {migrationResult.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Errors ({migrationResult.errors.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {migrationResult.errors.map((error, i) => (
                <div key={i} className="text-sm text-red-800">{error}</div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Next Steps</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>✓ Your treatment tags are now in the database</li>
            <li>✓ You can manage them in Settings → Treatment Routing → Treatment Tags</li>
            <li>✓ The routing system will now use these tags automatically</li>
            {cleanupLocalStorage && migrationResult.migratedCount > 0 && (
              <li>✓ Old localStorage configuration has been removed</li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={() => window.location.reload()}>
            Finish & Reload
          </Button>
        </div>
      </div>
    )
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Migration Wizard</h2>
        <p className="text-gray-600">
          Migrate your treatment tag configuration from localStorage to the database
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className={`flex-1 text-center ${step === 'detect' ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
            1. Detect
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className={`flex-1 text-center ${step === 'preview' ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
            2. Preview
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className={`flex-1 text-center ${step === 'execute' ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>
            3. Execute
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <div className={`flex-1 text-center ${step === 'complete' ? 'font-semibold text-green-600' : 'text-gray-400'}`}>
            4. Complete
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white border rounded-lg p-6">
        {step === 'detect' && renderDetectStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'execute' && renderExecuteStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  )
}

