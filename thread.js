const spawn = require('cross-spawn');
// Replace is-npm with direct check to avoid ESM issues
const isYarn = process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('yarn');
const path = require('path');
const fs = require('fs');
const camelCase = require('lodash.camelcase');
const globEscape = require('glob-escape');

const { settings } = require('./settings');
const { sleep } = require('./utility');

function getPackageManager() {
  const pckManager = isYarn
    ? 'yarn'
    : process.platform === 'win32'
      ? 'npm.cmd'
      : 'npm';

  return pckManager;
}

function createReporterOptions(string) {
  const options = string.split(',');
  return options.reduce((result, current) => {
    const parts = current.split('=');
    const optionName = parts[0].trim();
    const optionValue = parts[1].trim();
    result[optionName] = optionValue;

    return result;
  }, {});
}

function createReporterConfigFile(path) {
  const reporterEnabled = [__dirname + '/json-stream.reporter.js'];
  let reporterName = settings.reporter;
  if (settings.reporter) {
    reporterEnabled.push(reporterName);
  } else {
    reporterEnabled.push(__dirname + '/simple-spec.reporter.js');
  }
  const content = {
    reporterEnabled: reporterEnabled.join(', ')
  };

  if (settings.reporterOptions) {
    const optionName = `${camelCase(reporterName)}ReporterOptions`;
    content[optionName] = createReporterOptions(settings.reporterOptions);
  }
  fs.writeFileSync(path, JSON.stringify(content, null, 2));
}

function createCommandArguments(thread) {
  const specFiles = `${thread.list.map(path => globEscape(path)).join(',')}`;
  const childOptions = [
    'run',
    `${settings.script}`,
    isYarn ? '' : '--',
    '--spec',
    specFiles
  ];

  let reporterConfigPath;
  if (settings.reporterOptionsPath) {
    reporterConfigPath = settings.reporterOptionsPath;
  } else {
    reporterConfigPath = path.join(process.cwd(), 'multi-reporter-config.json');
    createReporterConfigFile(reporterConfigPath);
  }

  childOptions.push('--reporter', settings.reporterModulePath);
  childOptions.push('--reporter-options', `configFile=${reporterConfigPath}`);

  // Add tags to environment if specified
  if (settings.tags) {
    childOptions.push('--env', `tags=${settings.tags}`);
  }

  childOptions.push(...settings.scriptArguments);

  return childOptions;
}

async function executeThread(thread, index) {
  const packageManager = getPackageManager();
  const commandArguments = createCommandArguments(thread);

  // staggered start (when executed in container with xvfb ends up having a race condition causing intermittent failures)
  await sleep((index +1) * 2000);

  const timeMap = new Map();

  const promise = new Promise((resolve, reject) => {
    const processOptions = {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        CYPRESS_THREAD: (index + 1).toString()
        // Tags are passed via --env tags= in command arguments
      }
    };
    const child = spawn(packageManager, commandArguments, processOptions);

    child.on('exit', (exitCode) => {
      if (settings.isVerbose) {
        console.log(
          `Thread ${index} likely finished with failure count: ${exitCode}`
        );
      }
      // should preferably exit earlier, but this is simple and better than nothing
      if (settings.shouldBail) {
        if (exitCode > 0) {
          console.error(
            'BAIL set and thread exited with errors, exit early with error'
          );
          process.exit(exitCode);
        }
      }
      resolve(timeMap);
    });
  });

  return promise;
}

module.exports = {
  executeThread
};
