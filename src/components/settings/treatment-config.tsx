'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X, DollarSign, AlertTriangle, Sparkles, Edit } from 'lucide-react'
import { toast } from 'sonner'

interface TreatmentConfig {
  name: string
  category: 'high_value' | 'emergency' | 'cosmetic' | 'orthodontic' | 'general'
  min_value?: number
  keywords: string[]
  auto_pipeline: string
}

const DEFAULT_TREATMENTS: TreatmentConfig[] = [
  {
    name: 'Dental Implants',
    category: 'high_value',
    min_value: 3000,
    keywords: ['implant', 'implants', 'implant placement'],
    auto_pipeline: 'High-Value Treatment'
  },
  {
    name: 'Full Mouth Reconstruction',
    category: 'high_value',
    min_value: 10000,
    keywords: ['full mouth', 'reconstruction', 'all-on-4', 'full arch'],
    auto_pipeline: 'High-Value Treatment'
  },
  {
    name: 'Invisalign',
    category: 'orthodontic',
    min_value: 3500,
    keywords: ['invisalign', 'clear aligners'],
    auto_pipeline: 'Orthodontics'
  },
  {
    name: 'Braces',
    category: 'orthodontic',
    min_value: 2500,
    keywords: ['braces', 'orthodontic', 'orthodontics'],
    auto_pipeline: 'Orthodontics'
  },
  {
    name: 'Veneers',
    category: 'cosmetic',
    min_value: 1500,
    keywords: ['veneers', 'veneer', 'porcelain veneers'],
    auto_pipeline: 'Cosmetic Dentistry'
  },
  {
    name: 'Teeth Whitening',
    category: 'cosmetic',
    min_value: 300,
    keywords: ['whitening', 'bleaching', 'white teeth'],
    auto_pipeline: 'Cosmetic Dentistry'
  },
  {
    name: 'Emergency Care',
    category: 'emergency',
    keywords: ['emergency', 'urgent', 'pain', 'bleeding', 'swelling', 'broken tooth'],
    auto_pipeline: 'Emergency Treatment'
  },
  {
    name: 'Root Canal',
    category: 'emergency',
    min_value: 800,
    keywords: ['root canal', 'endodontic', 'abscess'],
    auto_pipeline: 'Emergency Treatment'
  }
]

export function TreatmentConfig() {
  const [treatments, setTreatments] = useState<TreatmentConfig[]>(DEFAULT_TREATMENTS)
  const [newTreatment, setNewTreatment] = useState<Partial<TreatmentConfig>>({
    keywords: []
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  const addKeyword = () => {
    if (newKeyword.trim() && !newTreatment.keywords?.includes(newKeyword.trim())) {
      setNewTreatment({
        ...newTreatment,
        keywords: [...(newTreatment.keywords || []), newKeyword.trim()]
      })
      setNewKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setNewTreatment({
      ...newTreatment,
      keywords: newTreatment.keywords?.filter(k => k !== keyword) || []
    })
  }

  const addTreatment = () => {
    if (!newTreatment.name || !newTreatment.category || !newTreatment.auto_pipeline) {
      toast.error('Please fill in all required fields')
      return
    }

    const treatment: TreatmentConfig = {
      name: newTreatment.name,
      category: newTreatment.category as any,
      min_value: newTreatment.min_value,
      keywords: newTreatment.keywords || [],
      auto_pipeline: newTreatment.auto_pipeline
    }

    if (editingIndex !== null) {
      // Update existing treatment
      const updated = [...treatments]
      updated[editingIndex] = treatment
      setTreatments(updated)
      setEditingIndex(null)
      toast.success('Treatment rule updated!')
    } else {
      // Add new treatment
      setTreatments([...treatments, treatment])
      toast.success('Treatment rule added!')
    }
    
    setNewTreatment({ keywords: [] })
  }
  
  const editTreatment = (index: number) => {
    const treatment = treatments[index]
    setNewTreatment({
      name: treatment.name,
      category: treatment.category,
      min_value: treatment.min_value,
      keywords: [...treatment.keywords],
      auto_pipeline: treatment.auto_pipeline
    })
    setEditingIndex(index)
    toast.info('Editing treatment - modify the form below')
  }
  
  const cancelEdit = () => {
    setNewTreatment({ keywords: [] })
    setEditingIndex(null)
  }

  const removeTreatment = (index: number) => {
    setTreatments(treatments.filter((_, i) => i !== index))
  }

  const saveTreatmentConfig = async () => {
    setLoading(true)
    try {
      // Save to localStorage for now (can be moved to database later)
      localStorage.setItem('treatment_config', JSON.stringify(treatments))
      toast.success('Treatment configuration saved!')
    } catch (error) {
      toast.error('Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('treatment_config')
    if (saved) {
      try {
        setTreatments(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading treatment config:', e)
      }
    }
  }, [])

  const getCategoryBadge = (category: string) => {
    const colors = {
      high_value: 'bg-green-100 text-green-800',
      emergency: 'bg-red-100 text-red-800',
      cosmetic: 'bg-pink-100 text-pink-800',
      orthodontic: 'bg-purple-100 text-purple-800',
      general: 'bg-blue-100 text-blue-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Smart Categorization Rules
          </CardTitle>
          <CardDescription>
            Configure which treatments should automatically go to which pipelines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configured Treatments */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Configured Treatments</Label>
            {treatments.map((treatment, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{treatment.name}</h4>
                        <Badge className={getCategoryBadge(treatment.category)}>
                          {treatment.category.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">→ Pipeline:</span>
                          <Badge variant="outline">{treatment.auto_pipeline}</Badge>
                        </div>
                        {treatment.min_value && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <DollarSign className="h-3 w-3" />
                            Min value: £{(treatment.min_value / 100).toLocaleString()}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <span className="text-gray-600">Keywords:</span>
                          {treatment.keywords.map(kw => (
                            <Badge key={kw} variant="secondary" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editTreatment(index)}
                        className="text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTreatment(index)}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add New Treatment */}
          <Card className={editingIndex !== null ? "border-2 border-blue-500" : "border-2 border-dashed"}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {editingIndex !== null ? '✏️ Edit Treatment Rule' : 'Add New Treatment Rule'}
                </CardTitle>
                {editingIndex !== null && (
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="treatment_name">Treatment Name *</Label>
                  <Input
                    id="treatment_name"
                    value={newTreatment.name || ''}
                    onChange={(e) => setNewTreatment({ ...newTreatment, name: e.target.value })}
                    placeholder="e.g., Dental Crowns"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={newTreatment.category}
                    onValueChange={(value) => setNewTreatment({ ...newTreatment, category: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_value">High-Value</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="cosmetic">Cosmetic</SelectItem>
                      <SelectItem value="orthodontic">Orthodontic</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_value">Minimum Value (£) Optional</Label>
                  <Input
                    id="min_value"
                    type="number"
                    step="100"
                    value={newTreatment.min_value ? newTreatment.min_value / 100 : ''}
                    onChange={(e) => setNewTreatment({ 
                      ...newTreatment, 
                      min_value: e.target.value ? parseFloat(e.target.value) * 100 : undefined 
                    })}
                    placeholder="e.g., 1500"
                  />
                </div>
                <div>
                  <Label htmlFor="auto_pipeline">Auto-assign to Pipeline *</Label>
                  <Select
                    value={newTreatment.auto_pipeline}
                    onValueChange={(value) => setNewTreatment({ ...newTreatment, auto_pipeline: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High-Value Treatment">💎 High-Value Treatment</SelectItem>
                      <SelectItem value="Emergency Treatment">🚨 Emergency Treatment</SelectItem>
                      <SelectItem value="General Practice">👥 General Practice</SelectItem>
                      <SelectItem value="Orthodontics">🦷 Orthodontics</SelectItem>
                      <SelectItem value="Cosmetic Dentistry">✨ Cosmetic Dentistry</SelectItem>
                      <SelectItem value="Referral Network">🤝 Referral Network</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <Label>Detection Keywords *</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Add keyword (e.g., crown, crowns)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addKeyword()
                      }
                    }}
                  />
                  <Button type="button" onClick={addKeyword} size="sm">
                    Add
                  </Button>
                </div>
                {newTreatment.keywords && newTreatment.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {newTreatment.keywords.map(kw => (
                      <Badge 
                        key={kw} 
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeKeyword(kw)}
                      >
                        {kw} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  These keywords will be matched in deal titles, descriptions, and AI conversation analysis
                </p>
              </div>

              <Button onClick={addTreatment} className="w-full">
                {editingIndex !== null ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Treatment Rule
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Treatment Rule
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveTreatmentConfig} disabled={loading}>
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            How Smart Categorization Works
          </h4>
          <ul className="space-y-2 text-sm text-blue-900">
            <li>✓ When creating a deal, AI analyzes the title and description</li>
            <li>✓ Matches against your configured treatments above</li>
            <li>✓ Checks deal value against minimum thresholds</li>
            <li>✓ Pulls insights from AI conversation analysis (if available)</li>
            <li>✓ Automatically suggests the best pipeline</li>
            <li>✓ Adds relevant tags for better organization</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

