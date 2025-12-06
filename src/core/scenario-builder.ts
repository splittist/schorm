/**
 * Scenario-based sequencing builder
 * Auto-generates SCORM branching rules from markdown content graph
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import type { ItemSequencing } from './manifest.js';

export interface ScenarioGraph {
  nodes: Map<string, SceneNode>;
  start: string;
  endings: Set<string>;
}

export interface SceneNode {
  id: string;
  file: string;
  title: string;
  choices: Choice[];
  isEnding: boolean;
  masteryScore?: number;
}

export interface Choice {
  label: string;
  targetId: string;
}

/**
 * Build a complete scenario graph by crawling markdown files
 * starting from the entry point
 */
export async function buildScenarioGraph(
  contentDir: string,
  startFile: string
): Promise<ScenarioGraph> {
  const graph: ScenarioGraph = {
    nodes: new Map(),
    start: '',
    endings: new Set()
  };

  const visited = new Set<string>();
  
  // Recursively crawl from start file
  await crawlScene(contentDir, startFile, graph, visited);
  
  // Set start node ID from the first file
  const startFilePath = path.join(contentDir, startFile);
  const startContent = fs.readFileSync(startFilePath, 'utf-8');
  const { data: startFrontmatter } = matter(startContent);
  graph.start = startFrontmatter.id || path.basename(startFile, '.md');

  return graph;
}

async function crawlScene(
  contentDir: string,
  filename: string,
  graph: ScenarioGraph,
  visited: Set<string>
): Promise<void> {
  if (visited.has(filename)) {
    return;
  }
  visited.add(filename);

  const filePath = path.join(contentDir, filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Scenario file not found: ${filename} (looked in ${contentDir})`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: markdown } = matter(content);

  if (!frontmatter.id) {
    throw new Error(`Scenario file ${filename} missing required frontmatter field: id`);
  }

  if (!frontmatter.title) {
    throw new Error(`Scenario file ${filename} missing required frontmatter field: title`);
  }

  // Extract choices from markdown links
  const choices = extractChoices(markdown);
  
  // Determine if this is an ending
  const isEnding = frontmatter.ending === true;

  const node: SceneNode = {
    id: frontmatter.id,
    file: filename,
    title: frontmatter.title,
    choices,
    isEnding,
    masteryScore: frontmatter.mastery
  };

  graph.nodes.set(node.id, node);
  
  if (isEnding) {
    graph.endings.add(node.id);
  }

  // Recursively crawl choice targets
  for (const choice of choices) {
    await crawlScene(contentDir, choice.targetId, graph, visited);
  }
}

/**
 * Extract choice links from markdown content
 * Matches standard markdown links: [Label](target.md)
 */
function extractChoices(markdown: string): Choice[] {
  const choices: Choice[] = [];
  
  // Match markdown links: [Label](target.md)
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  let match;
  
  while ((match = linkRegex.exec(markdown)) !== null) {
    const label = match[1];
    const targetFile = match[2];
    
    choices.push({
      label,
      targetId: targetFile
    });
  }
  
  return choices;
}

/**
 * Generate SCORM manifest sequencing rules from the scenario graph
 * Creates auto-named objectives and precondition rules
 * 
 * For SCORM 2004 global objectives to work properly:
 * 1. Source nodes (with choices) need objectives that WRITE to global objectives
 * 2. Target nodes need objectives that READ from global objectives for preconditions
 */
export function generateSequencingFromGraph(
  graph: ScenarioGraph,
  moduleId: string
): {
  items: Array<{ identifier: string; identifierref: string; title: string; sequencing?: ItemSequencing }>;
  controlMode: { choice: boolean; flow: boolean };
} {
  const items: Array<{ identifier: string; identifierref: string; title: string; sequencing?: ItemSequencing }> = [];
  const choiceToObjectiveMap = new Map<string, string>();
  let objIndex = 0;

  // Build objective mapping for each choice edge
  for (const [nodeId, node] of graph.nodes) {
    for (const choice of node.choices) {
      const objId = `obj_${moduleId}_${objIndex++}`;
      const choiceKey = `${nodeId}_to_${choice.targetId}`;
      choiceToObjectiveMap.set(choiceKey, objId);
    }
  }

  // Create items with objectives and precondition rules
  for (const [nodeId, node] of graph.nodes) {
    const itemSeq: ItemSequencing = {
      controlMode: {
        choice: true,
        flow: false
      },
      objectives: []
    };

    // Add a primary objective for this SCO
    itemSeq.objectives!.push({
      objectiveID: `primary_${nodeId}`,
      isPrimary: true
    });

    // For source nodes: add objectives that WRITE to global objectives for each outgoing choice
    // These objectives will be satisfied when the learner completes this SCO
    for (const choice of node.choices) {
      const choiceKey = `${nodeId}_to_${choice.targetId}`;
      const objId = choiceToObjectiveMap.get(choiceKey);
      if (objId) {
        // Add a local objective that maps to the global objective
        // This allows the source SCO to write satisfaction status to the global objective
        itemSeq.objectives!.push({
          objectiveID: `local_${objId}`,
          isPrimary: false,
          mapInfo: [{
            targetObjectiveID: objId,
            readSatisfiedStatus: false,
            writeSatisfiedStatus: true,
            readNormalizedMeasure: false,
            writeNormalizedMeasure: false
          }]
        });
      }
    }

    // For target nodes: find all incoming edges (preconditions)
    // An incoming edge is when another node has a choice that targets this node's file
    const incomingObjectives: string[] = [];
    for (const [sourceId, sourceNode] of graph.nodes) {
      for (const choice of sourceNode.choices) {
        // choice.targetId contains the filename (e.g., 'middle.md')
        // node.file also contains the filename
        // They match when this node is the target of the choice
        if (choice.targetId === node.file) {
          // Use the same key format as when building the map
          const choiceKey = `${sourceId}_to_${choice.targetId}`;
          const objId = choiceToObjectiveMap.get(choiceKey);
          if (objId) {
            incomingObjectives.push(objId);
            
            // Add a local objective that READs from the global objective
            // This allows the target SCO to check if the choice was made
            const localReadObjId = `read_${objId}`;
            // Only add if not already present
            if (!itemSeq.objectives!.some(o => o.objectiveID === localReadObjId)) {
              itemSeq.objectives!.push({
                objectiveID: localReadObjId,
                isPrimary: false,
                mapInfo: [{
                  targetObjectiveID: objId,
                  readSatisfiedStatus: true,
                  writeSatisfiedStatus: false,
                  readNormalizedMeasure: false,
                  writeNormalizedMeasure: false
                }]
              });
            }
          }
        }
      }
    }

    // Add preconditions for non-start nodes
    // Logic: Disable this item if NONE of the incoming paths were taken
    // Implementation: condition="satisfied" + operator="not" for each incoming objective
    // with conditionCombination="all" means: if (NOT obj1.satisfied AND NOT obj2.satisfied) then disable
    // This effectively means: enable if ANY incoming choice was made
    if (nodeId !== graph.start && incomingObjectives.length > 0) {
      itemSeq.preconditions = [{
        ruleConditions: incomingObjectives.map(objId => ({
          condition: 'satisfied' as const,
          objectiveID: `read_${objId}`,
          operator: 'not' as const
        })),
        conditionCombination: 'all' as const,
        ruleAction: 'disabled' as const
      }];
    }

    items.push({
      identifier: nodeId,
      identifierref: nodeId,
      title: node.title,
      sequencing: itemSeq
    });
  }

  return {
    items,
    controlMode: {
      choice: true,
      flow: false
    }
  };
}

/**
 * Process markdown content to convert choice links to buttons
 */
export function processScenarioLinks(html: string, choices: Choice[]): string {
  let processed = html;
  
  // Create a markdown-it instance with typographer enabled
  // to match the same transformations applied during rendering
  const md = new MarkdownIt({
    typographer: true
  });
  
  for (const choice of choices) {
    // Convert markdown link to button
    // Match <a href="target.md">Label</a>
    // Note: The label in HTML will be transformed by markdown-it's typographer
    // (e.g., "..." becomes "…", straight quotes " become curly quotes ")
    // So we need to apply the same transformations to match it
    const normalizedLabel = md.renderInline(choice.label);
    const linkPattern = new RegExp(
      `<a href="${escapeRegex(choice.targetId)}"[^>]*>${escapeRegex(normalizedLabel)}</a>`,
      'g'
    );
    
    const button = `<button class="scenario-choice" data-target="${escapeHtml(choice.targetId)}">${normalizedLabel}</button>`;
    
    processed = processed.replace(linkPattern, button);
  }
  
  return processed;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Detect cycles in the scenario graph
 */
export function detectCycles(graph: ScenarioGraph): string[] {
  const cycles: string[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    if (recursionStack.has(nodeId)) {
      cycles.push(`Cycle detected: ${path.join(' -> ')} -> ${nodeId}`);
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const choice of node.choices) {
        // Find target node by filename
        const targetNode = Array.from(graph.nodes.values()).find(n => n.file === choice.targetId);
        if (targetNode) {
          dfs(targetNode.id, [...path]);
        }
      }
    }

    recursionStack.delete(nodeId);
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return cycles;
}
