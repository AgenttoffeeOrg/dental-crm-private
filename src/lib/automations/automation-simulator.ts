/**
 * AUTOMATION SIMULATOR
 * 
 * Allows testing automations with sample data before activating.
 * Simulates the entire workflow execution without actually performing actions.
 */

import { createClient } from '@/lib/supabase-client'

export interface SimulationResult {
  success: boolean
  executionPath: Array<{
    nodeId: string
    nodeName: string
    nodeType: string
    executed: boolean
    output?: any
    error?: string
  }>
  previewMessages: Array<{
    type: 'email' | 'sms' | 'notification'
    to: string
    subject?: string
    content: string
  }>
  tasksToCreate: Array<{
    title: string
    assignee: string
    dueAt: string
  }>
  totalExecutionTimeMs: number
}

/**
 * Simulate automation execution with sample contact
 */
export async function simulateAutomation(
  automationId: string,
  tenantId: string,
  sampleContactId: string
): Promise<SimulationResult> {
  const startTime = Date.now()

  try {
    const supabase = createClient()

    // Get automation details
    const { data: automation } = await supabase
      .from('marketing_journeys')
      .select('*')
      .eq('id', automationId)
      .single()

    if (!automation) {
      throw new Error('Automation not found')
    }

    // Get sample contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('*, deals(*)')
      .eq('id', sampleContactId)
      .single()

    if (!contact) {
      throw new Error('Sample contact not found')
    }

    // Parse workflow graph
    const graph = automation.graph_json as {
      nodes: any[]
      edges: any[]
    }

    const executionPath: SimulationResult['executionPath'] = []
    const previewMessages: SimulationResult['previewMessages'] = []
    const tasksToCreate: SimulationResult['tasksToCreate'] = []

    // Start from trigger node
    const triggerNode = graph.nodes.find(n => n.type === 'trigger')
    if (!triggerNode) {
      throw new Error('No trigger node found')
    }

    // Traverse graph
    let currentNodeId = triggerNode.id
    const visited = new Set<string>()

    while (currentNodeId && !visited.has(currentNodeId)) {
      visited.add(currentNodeId)

      const currentNode = graph.nodes.find(n => n.id === currentNodeId)
      if (!currentNode) break

      // Simulate node execution
      const nodeResult = await simulateNode(currentNode, contact, tenantId)
      executionPath.push(nodeResult)

      // Collect preview data
      if (nodeResult.output) {
        if (currentNode.type === 'action') {
          const actionType = currentNode.data.actionType

          if (actionType === 'send_email') {
            previewMessages.push({
              type: 'email',
              to: contact.primary_email || 'N/A',
              subject: currentNode.data.subject || 'Automated Email',
              content: nodeResult.output.content || 'Email content preview...',
            })
          }

          if (actionType === 'send_sms') {
            previewMessages.push({
              type: 'sms',
              to: contact.primary_phone || 'N/A',
              content: nodeResult.output.content || 'SMS content preview...',
            })
          }

          if (actionType === 'create_task') {
            tasksToCreate.push({
              title: currentNode.data.title || 'Auto-created task',
              assignee: nodeResult.output.assignee || 'Unassigned',
              dueAt: nodeResult.output.dueAt || 'Not set',
            })
          }
        }
      }

      // Find next node
      if (currentNode.type === 'condition') {
        // Evaluate condition
        const conditionMet = evaluateCondition(currentNode.data.condition, contact)
        const edgeId = conditionMet ? 'true' : 'false'
        
        const nextEdge = graph.edges.find(e => e.source === currentNodeId && e.sourceHandle === edgeId)
        currentNodeId = nextEdge?.target || ''
      } else {
        // Regular flow
        const nextEdge = graph.edges.find(e => e.source === currentNodeId)
        currentNodeId = nextEdge?.target || ''
      }
    }

    const totalExecutionTimeMs = Date.now() - startTime

    return {
      success: true,
      executionPath,
      previewMessages,
      tasksToCreate,
      totalExecutionTimeMs,
    }
  } catch (error) {
    console.error('[Automation Simulator] Error:', error)
    
    return {
      success: false,
      executionPath: [],
      previewMessages: [],
      tasksToCreate: [],
      totalExecutionTimeMs: Date.now() - startTime,
    }
  }
}

/**
 * Simulate individual node execution
 */
async function simulateNode(
  node: any,
  contact: any,
  tenantId: string
): Promise<{
  nodeId: string
  nodeName: string
  nodeType: string
  executed: boolean
  output?: any
  error?: string
}> {
  try {
    let output: any = null

    switch (node.type) {
      case 'trigger':
        output = { triggered: true }
        break

      case 'action':
        output = await simulateAction(node, contact, tenantId)
        break

      case 'wait':
        output = { 
          duration: node.data.duration || 1,
          unit: node.data.unit || 'days',
        }
        break

      case 'condition':
        output = { 
          conditionMet: evaluateCondition(node.data.condition, contact),
        }
        break
    }

    return {
      nodeId: node.id,
      nodeName: node.data.label || node.type,
      nodeType: node.type,
      executed: true,
      output,
    }
  } catch (error) {
    return {
      nodeId: node.id,
      nodeName: node.data.label || node.type,
      nodeType: node.type,
      executed: false,
      error: String(error),
    }
  }
}

/**
 * Simulate action node
 */
async function simulateAction(
  node: any,
  contact: any,
  tenantId: string
): Promise<any> {
  const actionType = node.data.actionType

  switch (actionType) {
    case 'send_email':
      return {
        to: contact.primary_email,
        subject: replaceMergeTags(node.data.subject || 'Email', contact),
        content: replaceMergeTags(node.data.content || 'Email body...', contact),
      }

    case 'send_sms':
      return {
        to: contact.primary_phone,
        content: replaceMergeTags(node.data.message || 'SMS message...', contact),
      }

    case 'create_task':
      return {
        title: replaceMergeTags(node.data.title || 'Task', contact),
        assignee: node.data.assigneeUserId || contact.owner_user_id || 'Unassigned',
        dueAt: node.data.dueInHours 
          ? new Date(Date.now() + node.data.dueInHours * 60 * 60 * 1000).toISOString()
          : 'Not set',
      }

    case 'add_tag':
      return {
        tag: node.data.tag,
        currentTags: contact.tags || [],
      }

    default:
      return { actionType, note: 'Simulated' }
  }
}

/**
 * Evaluate condition
 */
function evaluateCondition(condition: any, contact: any): boolean {
  if (!condition) return true

  // Simple condition evaluation (can be enhanced)
  const { field, operator, value } = condition

  const actualValue = contact[field]

  switch (operator) {
    case 'equals':
      return actualValue === value
    case 'contains':
      return String(actualValue).includes(value)
    case 'greater_than':
      return Number(actualValue) > Number(value)
    case 'less_than':
      return Number(actualValue) < Number(value)
    default:
      return true
  }
}

/**
 * Replace merge tags with actual contact data
 */
function replaceMergeTags(text: string, contact: any): string {
  if (!text) return ''

  return text
    .replace(/{{contact\.full_name}}/g, contact.full_name || 'Contact')
    .replace(/{{contact\.first_name}}/g, contact.full_name?.split(' ')[0] || 'there')
    .replace(/{{contact\.email}}/g, contact.primary_email || '')
    .replace(/{{contact\.phone}}/g, contact.primary_phone || '')
}

/**
 * Store simulation result for comparison
 */
export async function saveSimulationResult(
  automationId: string,
  tenantId: string,
  result: SimulationResult
): Promise<{ success: boolean; testId?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('automation_test_runs')
      .insert({
        tenant_id: tenantId,
        automation_id: automationId,
        test_type: 'simulation',
        success: result.success,
        execution_path: result.executionPath,
        preview_messages: result.previewMessages,
        execution_time_ms: result.totalExecutionTimeMs,
      })
      .select('id')
      .single()

    if (error) throw error

    return { success: true, testId: data.id }
  } catch (error) {
    console.error('[Simulator] Error saving result:', error)
    return { success: false }
  }
}

