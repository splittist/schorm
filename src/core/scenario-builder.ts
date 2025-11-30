/**
 * Scenario-based sequencing builder
 * Auto-generates SCORM branching rules from markdown content graph
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
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

  // Create items with precondition rules
  for (const [nodeId, node] of graph.nodes) {
    const itemSeq: ItemSequencing = {
      controlMode: {
        choice: true,
        flow: false
      }
    };

    // Find all incoming edges to this node (preconditions)
    const incomingObjectives: string[] = [];
    for (const [sourceId, sourceNode] of graph.nodes) {
      for (const choice of sourceNode.choices) {
        if (choice.targetId === node.file) {
          const choiceKey = `${sourceId}_to_${node.file}`;
          const objId = choiceToObjectiveMap.get(choiceKey);
          if (objId) {
            incomingObjectives.push(objId);
          }
        }
      }
    }

    // Add preconditions for non-start nodes
    if (nodeId !== graph.start && incomingObjectives.length > 0) {
      itemSeq.preconditions = [{
        ruleConditions: incomingObjectives.map(objId => ({
          condition: 'satisfied' as const,
          objectiveID: objId
        })),
        conditionCombination: 'any' as const, // Any incoming path satisfies
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
  
  for (const choice of choices) {
    // Convert markdown link to button
    // Match <a href="target.md">Label</a>
    const linkPattern = new RegExp(
      `<a href="${escapeRegex(choice.targetId)}"[^>]*>${escapeRegex(choice.label)}</a>`,
      'g'
    );
    
    const button = `<button class="scenario-choice" data-target="${escapeHtml(choice.targetId)}">${escapeHtml(choice.label)}</button>`;
    
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
