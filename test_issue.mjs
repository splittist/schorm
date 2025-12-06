import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

// Simulate extractChoices
function extractChoices(markdown) {
  const choices = [];
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

// Simulate processScenarioLinks  
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function processScenarioLinks(html, choices) {
  let processed = html;
  
  for (const choice of choices) {
    const linkPattern = new RegExp(
      `<a href="${escapeRegex(choice.targetId)}"[^>]*>${escapeRegex(choice.label)}</a>`,
      'g'
    );
    
    const button = `<button class="scenario-choice" data-target="${escapeHtml(choice.targetId)}">${escapeHtml(choice.label)}</button>`;
    
    console.log(`Looking for: ${linkPattern.toString()}`);
    console.log(`In HTML: ${html}`);
    console.log(`Match: ${linkPattern.test(html)}`);
    
    processed = processed.replace(linkPattern, button);
  }
  
  return processed;
}

// Test with curly quotes
const markdown = `[Link with "curly quotes"](target.md)`;
console.log("Markdown:", markdown);
console.log();

const choices = extractChoices(markdown);
console.log("Extracted choices:", choices);
console.log();

const html = md.render(markdown);
console.log("HTML from markdown-it:", html.trim());
console.log();

const result = processScenarioLinks(html, choices);
console.log("Processed result:", result.trim());
console.log();

if (result === html) {
  console.log("❌ FAILED: Link was NOT converted to button");
} else {
  console.log("✓ SUCCESS: Link was converted to button");
}
