const fs = require('fs');
const path = require('path');

const { settings } = require('./settings');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatTime = function (timeMs) {
  const seconds = Math.ceil(timeMs / 1000);
  const sec = seconds % 60;
  const min = Math.floor(seconds / 60);
  let res = '';

  if (min) res += `${min}m `;
  res += `${sec}s`;
  return res;
};

function generateWeightsFile(specWeights, totalDuration, totalWeight) {
  Object.keys(specWeights).forEach((spec) => {
    specWeights[spec].weight = Math.floor(
      (specWeights[spec].time / totalDuration) * totalWeight
    );
  });
  
  // Load existing weights if file exists
  let existingWeights = {};
  try {
    if (fs.existsSync(settings.weightsJSON)) {
      const existingContent = fs.readFileSync(settings.weightsJSON, 'utf8');
      existingWeights = JSON.parse(existingContent);
      console.log(`Merging with existing weights (${Object.keys(existingWeights).length} existing specs)`);
    }
  } catch(e) {
    console.log('No existing weights file or invalid JSON, starting fresh');
  }
  
  // Merge existing weights with new weights (new weights take precedence)
  const mergedWeights = { ...existingWeights, ...specWeights };
  const weightsJson = JSON.stringify(mergedWeights, null, 2);
  
  try {
    fs.writeFileSync(`${settings.weightsJSON}`, weightsJson, 'utf8');
    console.log(`Weights file updated: ${Object.keys(specWeights).length} new/updated specs, ${Object.keys(mergedWeights).length} total specs`);
  } catch(e) {
    console.error(e)
  }
}

function collectResults(resultsPath) {
  const resultFiles = fs.readdirSync(resultsPath);
  const results = new Map();
  resultFiles.forEach((fileName) => {
    const filePath = path.join(resultsPath, fileName);
    const content = fs.readFileSync(filePath);
    const result = JSON.parse(content);
    results.set(result.file, result);
  });

  return results;
}

module.exports = {
  collectResults,
  sleep,
  formatTime,
  generateWeightsFile
};
