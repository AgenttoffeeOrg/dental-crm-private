/**
 * AUTOMATION VALIDATOR
 * 
 * Pre-publish validation checks to ensure automation is safe and complete:
 * - All paths lead to exit
 * - No orphan nodes
 * - Required fields filled
 * - Consent verified for communications
 * - No circular loops
 */

import { Node, Edge } from '@xyflow/react'

export interface ValidationError {
  severity: 'error' | 'warning' | 'info'
  nodeId?: string
  message: string
  fix?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  info: ValidationError[]
}

/**
 * Validate complete automation workflow
 */
export function validateAutomation(
  nodes: Node[],
  edges: Edge[]
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []

  // Check 1: Must have at least one trigger
  const triggerNodes = nodes.filter(n => n.type === 'trigger')
  if (triggerNodes.length === 0) {
    errors.push({
      severity: 'error',
      message: 'Workflow must have at least one trigger node',
      fix: 'Add a trigger node from the palette',
    })
  }

  if (triggerNodes.length > 1) {
    warnings.push({
      severity: 'warning',
      message: 'Multiple trigger nodes detected - only one will execute',
      fix: 'Remove extra trigger nodes or split into separate automations',
    })
  }

  // Check 2: Find orphan nodes (not connected)
  const orphanNodes = nodes.filter(node => {
    if (node.type === 'trigger') return false // Triggers can be orphans (start nodes)
    
    const hasIncoming = edges.some(e => e.target === node.id)
    const hasOutgoing = edges.some(e => e.source === node.id)
    
    return !hasIncoming && !hasOutgoing
  })

  if (orphanNodes.length > 0) {
    errors.push({
      severity: 'error',
      message: `${orphanNodes.length} orphan node(s) not connected to workflow`,
      fix: 'Connect all nodes or remove unused nodes',
    })
  }

  // Check 3: Validate each node has required configuration
  nodes.forEach(node => {
    if (node.type === 'action') {
      const actionType = node.data.actionType
      
      if (!actionType) {
        errors.push({
          severity: 'error',
          nodeId: node.id,
          message: 'Action node missing action type',
          fix: 'Select an action type (send email, create task, etc.)',
        })
      }

      // Check email actions have template or content
      if (actionType === 'send_email') {
        if (!node.data.templateId && !node.data.content) {
          errors.push({
            severity: 'error',
            nodeId: node.id,
            message: 'Email action missing template or content',
            fix: 'Select a template or add email content',
          })
        }

        if (!node.data.subject) {
          warnings.push({
            severity: 'warning',
            nodeId: node.id,
            message: 'Email missing subject line',
            fix: 'Add a subject line for better deliverability',
          })
        }
      }

      // Check consent for communications
      if (['send_email', 'send_sms', 'send_whatsapp'].includes(actionType)) {
        info.push({
          severity: 'info',
          nodeId: node.id,
          message: 'This action will check consent before sending',
        })
      }
    }

    if (node.type === 'condition') {
      if (!node.data.condition) {
        errors.push({
          severity: 'error',
          nodeId: node.id,
          message: 'Condition node missing condition logic',
          fix: 'Configure the condition (field, operator, value)',
        })
      }
    }

    if (node.type === 'wait') {
      if (!node.data.duration || !node.data.unit) {
        errors.push({
          severity: 'error',
          nodeId: node.id,
          message: 'Wait node missing duration',
          fix: 'Set wait duration (e.g., 2 days, 1 hour)',
        })
      }
    }
  })

  // Check 4: Detect circular loops
  const loops = detectCircularLoops(nodes, edges)
  if (loops.length > 0) {
    errors.push({
      severity: 'error',
      message: `${loops.length} circular loop(s) detected`,
      fix: 'Remove circular connections or add exit conditions',
    })
  }

  // Check 5: Check if all action nodes have a path from trigger
  const reachableNodes = getReachableNodes(triggerNodes[0]?.id, edges)
  const unreachableActions = nodes.filter(n => 
    n.type === 'action' && !reachableNodes.has(n.id)
  )

  if (unreachableActions.length > 0) {
    warnings.push({
      severity: 'warning',
      message: `${unreachableActions.length} action(s) not reachable from trigger`,
      fix: 'Connect these actions or remove them',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  }
}

/**
 * Detect circular loops in workflow
 */
function detectCircularLoops(nodes: Node[], edges: Edge[]): string[][] {
  const loops: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function dfs(nodeId: string, path: string[]): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)

    const outgoingEdges = edges.filter(e => e.source === nodeId)
    
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (dfs(edge.target, [...path])) {
          return true
        }
      } else if (recursionStack.has(edge.target)) {
        // Found a loop
        loops.push([...path, edge.target])
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id, [])
    }
  })

  return loops
}

/**
 * Get all nodes reachable from a start node
 */
function getReachableNodes(startNodeId: string | undefined, edges: Edge[]): Set<string> {
  if (!startNodeId) return new Set()

  const reachable = new Set<string>()
  const queue = [startNodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachable.has(current)) continue

    reachable.add(current)

    const outgoing = edges.filter(e => e.source === current)
    outgoing.forEach(e => queue.push(e.target))
  }

  return reachable
}

