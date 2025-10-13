'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Phone, 
  Mail, 
  DollarSign,
  Calendar,
  CheckSquare,
  FileText,
  Folder,
  User,
  Briefcase,
  ArrowRight,
  Clock,
  Command,
  Filter,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface UniversalSearchBarProps {
  tenantId?: string
  className?: string
}

export function UniversalSearchBar({ 
  tenantId = '550e8400-e29b-41d4-a716-446655440000',
  className 
}: UniversalSearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filter, setFilter] = useState<'all' | 'contacts' | 'deals' | 'tasks' | 'activities'>('all')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Global keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      
      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setQuery('')
        setResults(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Load recent searches from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('recentSearches')
    if (recent) {
      setRecentSearches(JSON.parse(recent))
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      return
    }

    const timer = setTimeout(() => {
      performSearch()
    }, 300)

    return () => clearTimeout(timer)
  }, [query, filter])

  const performSearch = async () => {
    setLoading(true)
    
    try {
      const response = await fetch(
        `/api/search/universal?q=${encodeURIComponent(query)}&tenant_id=${tenantId}&filter=${filter}&limit=20`
      )
      
      const data = await response.json()
      
      if (response.ok) {
        setResults(data.results)
        setSelectedIndex(0)
      } else {
        toast.error('Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const saveToRecent = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const handleSelect = (type: string, id: string) => {
    saveToRecent(query)
    setIsOpen(false)
    setQuery('')
    setResults(null)

    // Navigate based on type
    if (type === 'contact') {
      router.push(`/contacts/${id}`)
    } else if (type === 'deal') {
      router.push(`/pipeline?deal=${id}`)
    } else if (type === 'task') {
      router.push(`/tasks`)
    } else if (type === 'activity') {
      // Open activity detail (would need to implement)
      toast.info('Activity details coming soon')
    } else if (type === 'pipeline') {
      router.push(`/pipeline?pipeline=${id}`)
    }
  }

  // Keyboard navigation in results
  useEffect(() => {
    if (!isOpen || !results) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const allResults = [
        ...results.contacts.map((c: any) => ({ type: 'contact', id: c.id })),
        ...results.deals.map((d: any) => ({ type: 'deal', id: d.id })),
        ...results.tasks.map((t: any) => ({ type: 'task', id: t.id })),
        ...results.activities.map((a: any) => ({ type: 'activity', id: a.id })),
        ...results.pipelines.map((p: any) => ({ type: 'pipeline', id: p.id }))
      ]

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && allResults[selectedIndex]) {
        e.preventDefault()
        const selected = allResults[selectedIndex]
        handleSelect(selected.type, selected.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    const regex = new RegExp(`(${query})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200 text-gray-900">{part}</mark> : part
    )
  }

  return (
    <>
      {/* Search Input (always visible) */}
      <div className={cn("relative", className)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search everything... (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="pl-10 pr-20 h-10 bg-white border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 shadow-sm text-sm font-medium"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('')
                setResults(null)
              }}
              className="absolute right-14 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 rounded-md"
            >
              <X className="h-3.5 w-3.5 text-gray-500" />
            </Button>
          )}
          <kbd className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs font-semibold bg-gray-100 border border-gray-200 rounded text-gray-600 shadow-sm">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setIsOpen(false)
              setQuery('')
              setResults(null)
            }}
          />

          {/* Results Panel */}
          <div className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-3 border-b border-gray-200 bg-white">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'ghost'}
                onClick={() => setFilter('all')}
                className="h-7 text-xs"
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === 'contacts' ? 'default' : 'ghost'}
                onClick={() => setFilter('contacts')}
                className="h-7 text-xs"
              >
                <User className="h-3 w-3 mr-1" />
                Contacts
              </Button>
              <Button
                size="sm"
                variant={filter === 'deals' ? 'default' : 'ghost'}
                onClick={() => setFilter('deals')}
                className="h-7 text-xs"
              >
                <Briefcase className="h-3 w-3 mr-1" />
                Deals
              </Button>
              <Button
                size="sm"
                variant={filter === 'tasks' ? 'default' : 'ghost'}
                onClick={() => setFilter('tasks')}
                className="h-7 text-xs"
              >
                <CheckSquare className="h-3 w-3 mr-1" />
                Tasks
              </Button>
              <Button
                size="sm"
                variant={filter === 'activities' ? 'default' : 'ghost'}
                onClick={() => setFilter('activities')}
                className="h-7 text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                Activities
              </Button>
            </div>

            <ScrollArea className="max-h-[500px]">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-600">Searching...</p>
                </div>
              ) : !query || query.length < 2 ? (
                <div className="p-6">
                  {recentSearches.length > 0 ? (
                    <>
                      <h3 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Recent Searches
                      </h3>
                      <div className="space-y-1">
                        {recentSearches.map((search, idx) => (
                          <button
                            key={idx}
                            onClick={() => setQuery(search)}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-gray-700 flex items-center justify-between group"
                          >
                            <span>{search}</span>
                            <ArrowRight className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500 text-sm">
                      <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Start typing to search contacts, deals, tasks, and more...</p>
                      <p className="text-xs mt-2 text-gray-400">Press ⌘K to open search anytime</p>
                    </div>
                  )}
                </div>
              ) : !results || results.total === 0 ? (
                <div className="p-12 text-center">
                  <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="font-medium text-gray-900 mb-1">No results found</h3>
                  <p className="text-sm text-gray-600">Try a different search term</p>
                </div>
              ) : (
                <div className="p-2">
                  {/* CONTACTS */}
                  {results.contacts.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 px-3 py-2 flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Contacts ({results.contacts.length})
                      </h3>
                      <div className="space-y-1">
                        {results.contacts.map((contact: any) => (
                          <button
                            key={contact.id}
                            onClick={() => handleSelect('contact', contact.id)}
                            className="w-full text-left px-3 py-2.5 rounded-md hover:bg-blue-50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <span className="font-medium text-gray-900">
                                    {highlightMatch(contact.full_name, query)}
                                  </span>
                                  {contact.patient_status && (
                                    <Badge variant="secondary" className="text-xs">
                                      {contact.patient_status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  {contact.primary_email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {highlightMatch(contact.primary_email, query)}
                                    </span>
                                  )}
                                  {contact.primary_phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {highlightMatch(contact.primary_phone, query)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DEALS */}
                  {results.deals.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 px-3 py-2 flex items-center gap-2">
                        <Briefcase className="h-3 w-3" />
                        Deals ({results.deals.length})
                      </h3>
                      <div className="space-y-1">
                        {results.deals.map((deal: any) => (
                          <button
                            key={deal.id}
                            onClick={() => handleSelect('deal', deal.id)}
                            className="w-full text-left px-3 py-2.5 rounded-md hover:bg-purple-50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Briefcase className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                  <span className="font-medium text-gray-900">
                                    {highlightMatch(deal.title, query)}
                                  </span>
                                  {deal.stage?.name && (
                                    <Badge variant="outline" className="text-xs">
                                      {deal.stage.name}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  {deal.contact?.full_name && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {deal.contact.full_name}
                                    </span>
                                  )}
                                  {deal.value_estimate_cents > 0 && (
                                    <span className="flex items-center gap-1 text-green-700 font-semibold">
                                      <DollarSign className="h-3 w-3" />
                                      ${(deal.value_estimate_cents / 100).toLocaleString()}
                                    </span>
                                  )}
                                  {deal.treatment_tags?.length > 0 && (
                                    <span className="truncate">{deal.treatment_tags.join(', ')}</span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TASKS */}
                  {results.tasks.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 px-3 py-2 flex items-center gap-2">
                        <CheckSquare className="h-3 w-3" />
                        Tasks ({results.tasks.length})
                      </h3>
                      <div className="space-y-1">
                        {results.tasks.map((task: any) => (
                          <button
                            key={task.id}
                            onClick={() => handleSelect('task', task.id)}
                            className="w-full text-left px-3 py-2.5 rounded-md hover:bg-green-50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckSquare className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  <span className="font-medium text-gray-900">
                                    {highlightMatch(task.title, query)}
                                  </span>
                                  {task.priority && (
                                    <Badge 
                                      variant="outline" 
                                      className={cn("text-xs",
                                        task.priority === 'urgent' && 'border-red-300 text-red-700',
                                        task.priority === 'high' && 'border-orange-300 text-orange-700'
                                      )}
                                    >
                                      {task.priority}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  {task.due_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {task.contact?.full_name && (
                                    <span>{task.contact.full_name}</span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ACTIVITIES */}
                  {results.activities.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 px-3 py-2 flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        Activities ({results.activities.length})
                      </h3>
                      <div className="space-y-1">
                        {results.activities.map((activity: any) => (
                          <button
                            key={activity.id}
                            onClick={() => handleSelect('activity', activity.id)}
                            className="w-full text-left px-3 py-2.5 rounded-md hover:bg-amber-50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {activity.type === 'call' && <Phone className="h-4 w-4 text-green-600" />}
                                  {activity.type === 'email' && <Mail className="h-4 w-4 text-blue-600" />}
                                  {activity.type === 'note' && <FileText className="h-4 w-4 text-gray-600" />}
                                  <span className="font-medium text-gray-900 truncate">
                                    {highlightMatch(activity.subject || `${activity.type} activity`, query)}
                                  </span>
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {activity.type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  {activity.contact?.full_name && (
                                    <span>{activity.contact.full_name}</span>
                                  )}
                                  {activity.occurred_at && (
                                    <span>{formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}</span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PIPELINES */}
                  {results.pipelines.length > 0 && (
                    <div className="mb-2">
                      <h3 className="text-xs font-semibold text-gray-500 px-3 py-2 flex items-center gap-2">
                        <Folder className="h-3 w-3" />
                        Pipelines ({results.pipelines.length})
                      </h3>
                      <div className="space-y-1">
                        {results.pipelines.map((pipeline: any) => (
                          <button
                            key={pipeline.id}
                            onClick={() => handleSelect('pipeline', pipeline.id)}
                            className="w-full text-left px-3 py-2.5 rounded-md hover:bg-indigo-50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4 text-indigo-600" />
                                <span className="font-medium text-gray-900">
                                  {pipeline.icon} {highlightMatch(pipeline.name, query)}
                                </span>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Tips */}
                  <div className="border-t p-3 bg-gray-50">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>↑↓ Navigate • Enter to select • ESC to close</span>
                      <span>{results.total} results</span>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </>
  )
}

