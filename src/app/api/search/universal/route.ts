import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const tenantId = searchParams.get('tenant_id')
    const filter = searchParams.get('filter') // 'all', 'contacts', 'deals', 'tasks', 'activities'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameters: q, tenant_id' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const searchTerm = `%${query.toLowerCase()}%`

    // Results object
    const results: any = {
      contacts: [],
      deals: [],
      tasks: [],
      activities: [],
      pipelines: [],
      total: 0
    }

    // SEARCH CONTACTS (by name, email, phone, DOB, address, tags)
    // PRIORITY: Contacts should appear FIRST in search results
    if (filter === 'all' || filter === 'contacts') {
      // Search by name
      const { data: byName } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .ilike('full_name', searchTerm)
        .limit(limit)

      // Search by email
      const { data: byEmail } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .ilike('primary_email', searchTerm)
        .limit(limit)

      // Search by phone (including partial matches)
      const { data: byPhone } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`primary_phone.ilike.${searchTerm},secondary_phone.ilike.${searchTerm}`)
        .limit(limit)

      // Search by address
      const { data: byAddress } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .ilike('address', searchTerm)
        .limit(limit)

      // Merge all results and deduplicate
      const allContacts = [
        ...(byName || []),
        ...(byEmail || []),
        ...(byPhone || []),
        ...(byAddress || [])
      ]
      
      const uniqueContacts = Array.from(new Map(allContacts.map(c => [c.id, c])).values())
      
      // Sort by relevance (name matches first, then email, then phone)
      uniqueContacts.sort((a, b) => {
        const aNameMatch = a.full_name?.toLowerCase().includes(query.toLowerCase())
        const bNameMatch = b.full_name?.toLowerCase().includes(query.toLowerCase())
        
        if (aNameMatch && !bNameMatch) return -1
        if (!aNameMatch && bNameMatch) return 1
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      results.contacts = uniqueContacts.slice(0, limit)
    }

    // SEARCH DEALS (by title, value, stage, treatment tags, contact name)
    if (filter === 'all' || filter === 'deals') {
      const { data: deals } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          value_estimate_cents,
          treatment_tags,
          created_at,
          stage:pipeline_stages(name),
          contact:contacts(full_name, primary_email, primary_phone),
          pipeline:pipeline_stages(pipeline_id, pipelines(name))
        `)
        .eq('tenant_id', tenantId)
        .ilike('title', searchTerm)
        .limit(limit)
        .order('created_at', { ascending: false })

      // Also search by contact name
      const { data: dealsByContact } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          value_estimate_cents,
          treatment_tags,
          created_at,
          stage:pipeline_stages(name),
          contact:contacts!inner(full_name, primary_email, primary_phone),
          pipeline:pipeline_stages(pipeline_id, pipelines(name))
        `)
        .eq('tenant_id', tenantId)
        .ilike('contact.full_name', searchTerm)
        .limit(limit)
        .order('created_at', { ascending: false })

      // Merge and deduplicate
      const allDeals = [...(deals || []), ...(dealsByContact || [])]
      const uniqueDeals = Array.from(new Map(allDeals.map(d => [d.id, d])).values())
      results.deals = uniqueDeals.slice(0, limit)
    }

    // SEARCH TASKS (by title, description, assignee, contact)
    if (filter === 'all' || filter === 'tasks') {
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          task_type,
          contact:contacts(full_name),
          deal:deals(title),
          assignee:app_users(full_name)
        `)
        .eq('tenant_id', tenantId)
        .or(`
          title.ilike.${searchTerm},
          description.ilike.${searchTerm}
        `)
        .limit(limit)
        .order('created_at', { ascending: false })

      results.tasks = tasks || []
    }

    // SEARCH ACTIVITIES (by subject, snippet, type, contact)
    if (filter === 'all' || filter === 'activities') {
      const { data: activities } = await supabase
        .from('activities')
        .select(`
          id,
          type,
          subject,
          snippet,
          occurred_at,
          contact:contacts(full_name),
          deal:deals(title)
        `)
        .eq('tenant_id', tenantId)
        .or(`
          subject.ilike.${searchTerm},
          snippet.ilike.${searchTerm}
        `)
        .limit(limit)
        .order('occurred_at', { ascending: false })

      results.activities = activities || []
    }

    // SEARCH PIPELINES (by name, description)
    if (filter === 'all' || filter === 'pipelines') {
      const { data: pipelines } = await supabase
        .from('pipelines')
        .select('id, name, description, icon')
        .eq('tenant_id', tenantId)
        .or(`
          name.ilike.${searchTerm},
          description.ilike.${searchTerm}
        `)
        .limit(10)

      results.pipelines = pipelines || []
    }

    // Calculate total results
    results.total = 
      results.contacts.length + 
      results.deals.length + 
      results.tasks.length + 
      results.activities.length +
      results.pipelines.length

    return NextResponse.json({
      success: true,
      query,
      results,
      total: results.total
    })

  } catch (error: unknown) {
    console.error('[SEARCH] Error performing universal search:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

