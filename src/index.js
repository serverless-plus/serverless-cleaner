const { prompt } = require('inquirer');
const providers = require('./providers');
const logger = require('./logger');

async function main() {
  const { provider } = await prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Please select provider?',
      choices: ['tencent', 'aws'],
      default: 'tencent',
    },
  ]);

  logger.info(`Deal with provider: ${provider}`);
  const clean = providers[provider];

  await clean();
}

main();

process.on('unhandledRejection', (e) => {
  console.log(e);
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.log(e);
  process.exit(1);
});
