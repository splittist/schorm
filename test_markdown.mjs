import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

const testCases = [
  `[Simple link](target.md)`,
  `[Link with "straight quotes"](target.md)`,
  `[Link with "curly quotes"](target.md)`,
  `[Link with 'curly apostrophe'](target.md)`,
];

console.log("Testing markdown-it conversion:");
console.log();

testCases.forEach((markdown, i) => {
  const html = md.render(markdown);
  console.log(`Test ${i + 1}:`);
  console.log(`  Markdown: ${markdown}`);
  console.log(`  HTML: ${html.trim()}`);
  console.log();
});
