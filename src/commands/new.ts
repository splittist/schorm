import { Command } from 'commander';

export const newCommand = new Command('new')
  .description('Scaffold new content (module, lesson, or quiz)')
  .argument('<type>', 'Content type (module, lesson, quiz)')
  .argument('<path>', 'Path/identifier for the content')
  .argument('[title]', 'Title of the content')
  .action((type, path, title) => {
    console.log('schorm new command');
    console.log('Type:', type);
    console.log('Path:', path);
    console.log('Title:', title || 'Untitled');
    console.log('TODO: Implement content scaffolding');
  });
