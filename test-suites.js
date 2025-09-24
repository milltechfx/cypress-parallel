const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const { settings } = require('./settings');
const FeatureTagParser = require('./lib/featureTagParser');

const getFilePathsByPath = (dir) =>
  fs.readdirSync(dir).reduce((files, file) => {
    const name = path.join(dir, file);
    const isDirectory = fs.statSync(name).isDirectory();
    if (isDirectory) return [...files, ...getFilePathsByPath(name)];
    return [...files, name];
  }, []);

async function getTestSuitePaths() {
  const isPattern = settings.testSuitesPath.includes('*');

  let fileList;
  if (settings.testSuitesPaths) {
    fileList = settings.testSuitesPaths;
  } else if (isPattern) {
    console.log(`Using pattern ${settings.testSuitesPath} to find test suites`);
    fileList = await glob(settings.testSuitesPath, { ignore: 'node_modules/**' });
  } else {
    console.log(
      'DEPRECATED: using path is deprecated and will be removed, switch to glob pattern'
    );
    fileList = getFilePathsByPath(settings.testSuitesPath);
  }

  console.log(`${fileList.length} test suite(s) found.`);
  if (settings.isVerbose) {
    console.log('Paths to found suites');
    console.log(JSON.stringify(fileList, null, 2));
  }

  // Apply tag filtering if tags are specified
  if (settings.tags) {
    const originalCount = fileList.length;
    fileList = await filterTestsByTags(fileList, settings.tags);

    // Determine the source of the tags
    let tagSource = '';
    // Check if tags came from TAGS environment variable
    if (settings.tags === process.env.TAGS) {
      tagSource = '(from TAGS env)';
    }
    console.log(`[TAG-FILTER] Tag expression: ${settings.tags} ${tagSource}`);
    console.log(`[TAG-FILTER] Features after filtering: ${fileList.length} (filtered out ${originalCount - fileList.length} from ${originalCount})`);

    if (fileList.length === 0) {
      console.error(`[TAG-FILTER] ERROR: No features match tag expression: ${settings.tags}`);
      process.exit(1);
    }

    if (settings.isVerbose || settings.tagFilterDebug) {
      console.log('[TAG-FILTER] Filtered feature list:');
      fileList.forEach(f => console.log(`  - ${f}`));
    }
  }

  // We can't run more threads than suites
  if (fileList.length < settings.threadCount) {
    console.log(
      `Thread setting is ${settings.threadCount}, but only ${fileList.length} test suite(s) were found. Adjusting configuration accordingly.`
    );
    settings.threadCount = fileList.length;
  }

  return fileList;
}

function getMaxPathLenghtFrom(testSuitePaths) {
  let maxLength = 10;

  for(let path of testSuitePaths){
    maxLength = Math.max(maxLength, path.length);
  }

  return maxLength + 3;
}

function distributeTestsByWeight(testSuitePaths) {
  let specWeights = {};
  try {
    specWeights = JSON.parse(fs.readFileSync(settings.weightsJSON, 'utf8'));
  } catch (err) {
    console.log(`Weight file not found in path: ${settings.weightsJSON}`);
  }

  let map = new Map();
  for (let f of testSuitePaths) {
    let specWeight = settings.defaultWeight;
    Object.keys(specWeights).forEach((spec) => {
      if (f.endsWith(spec)) {
        specWeight = specWeights[spec].weight;
      }
    });
    map.set(f, specWeight);
  }

  map = new Map([...map.entries()].sort((a, b) => b[1] - a[1]));

  const threads = [];
  for (let i = 0; i < settings.threadCount; i++) {
    threads.push({
      weight: 0,
      list: []
    });
  }

  for (const [key, value] of map.entries()) {
    threads.sort((w1, w2) => w1.weight - w2.weight);
    threads[0].list.push(key);
    threads[0].weight += +value;
  }

  // Run slowest group first
  threads.sort((a, b) => b.weight - a.weight);

  return threads;
}

/**
 * Filter test files by Cucumber tag expression
 * Only applies to .feature files
 * @param {string[]} filePaths - Array of test file paths
 * @param {string} tagExpression - Cucumber tag expression
 * @returns {Promise<string[]>} Filtered array of file paths
 */
async function filterTestsByTags(filePaths, tagExpression) {
  // Separate feature files from other test files
  const featureFiles = filePaths.filter(f => f.endsWith('.feature'));
  const nonFeatureFiles = filePaths.filter(f => !f.endsWith('.feature'));

  if (featureFiles.length === 0) {
    console.log('[TAG-FILTER] No .feature files found, skipping tag filtering');
    return filePaths; // Return all files if no feature files
  }

  // Create parser with debug option
  const parser = new FeatureTagParser({ verbose: settings.tagFilterDebug });

  // Filter feature files by tags
  console.log(`[TAG-FILTER] Filtering ${featureFiles.length} feature file(s) by tags...`);
  const filteredFeatures = await parser.filterFeaturesByTags(featureFiles, tagExpression);

  // Combine filtered features with non-feature files
  const result = [...filteredFeatures, ...nonFeatureFiles];

  return result;
}

module.exports = {
  getTestSuitePaths,
  distributeTestsByWeight,
  getMaxPathLenghtFrom,
  filterTestsByTags
};
