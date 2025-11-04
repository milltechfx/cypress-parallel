const fs = require('fs');
const path = require('path');
const { convertFeatureFileToJSON } = require('gherkin-parse');

/**
 * Generates a test manifest file containing expected scenario counts per spec.
 * This manifest is used to validate that all tests are properly recorded in the
 * cucumber results, detecting when workers fail to write their ndjson files.
 *
 * @param {Array<string>} testSuitePaths - List of feature file paths (already filtered by tags at file level)
 * @param {string} tagExpression - Tag filter expression used (for documentation only)
 */
async function generateTestManifest(testSuitePaths, tagExpression) {
  console.log(`\n[test-manifest] Generating test manifest for ${testSuitePaths.length} specs...`);

  // Clean up stale manifest from previous run first
  const manifestDir = path.join(process.cwd(), 'resultValidation');
  const manifestPath = path.join(manifestDir, 'test-manifest.json');
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
    console.log('[test-manifest] Cleaned up stale manifest from previous run');
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    tagExpression: tagExpression || 'none',
    specs: {},
    totalSpecs: testSuitePaths.length,
    totalScenarios: 0
  };

  for (const specPath of testSuitePaths) {
    try {
      // Normalize path to relative (remove cwd prefix if present)
      const normalizedPath = specPath.startsWith(process.cwd())
        ? path.relative(process.cwd(), specPath)
        : specPath;

      const gherkinDocument = convertFeatureFileToJSON(specPath);

      if (!gherkinDocument || !gherkinDocument.feature) {
        console.warn(`[test-manifest] Warning: Could not parse feature file: ${specPath}`);
        continue;
      }

      const scenarios = [];
      let scenarioCount = 0;

      // Get feature-level tags
      const featureTags = (gherkinDocument.feature.tags || []).map(t => t.name);

      // Process each child (Scenario, Scenario Outline, Background, etc.)
      gherkinDocument.feature.children.forEach(child => {
        if (child.type === 'Scenario') {
          // Regular Scenario
          // Combine feature tags and scenario tags
          const scenarioTags = featureTags.concat((child.tags || []).map(t => t.name));

          scenarios.push({
            name: child.name,
            line: child.location.line,
            tags: scenarioTags
          });
          scenarioCount++;
        } else if (child.type === 'ScenarioOutline') {
          // Scenario Outline - count examples
          // Combine feature tags and scenario outline tags
          const outlineTags = featureTags.concat((child.tags || []).map(t => t.name));

          const exampleCount = (child.examples || []).reduce((count, example) => {
            return count + (example.tableBody?.length || 0);
          }, 0);

          // Each example row generates a separate test
          for (let i = 0; i < exampleCount; i++) {
            scenarios.push({
              name: `${child.name} (example #${i + 1})`,
              line: child.location.line,
              tags: outlineTags,
              isExample: true
            });
          }

          scenarioCount += exampleCount;
        }
      });

      if (scenarioCount > 0) {
        manifest.specs[normalizedPath] = {
          featureName: gherkinDocument.feature.name,
          expectedScenarios: scenarioCount,
          scenarios: scenarios
        };
        manifest.totalScenarios += scenarioCount;
      }
    } catch (error) {
      console.error(`[test-manifest] Error parsing ${specPath}:`, error.message);
    }
  }

  // Write manifest to resultValidation directory (reuse paths from cleanup above)
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`[test-manifest] ✓ Manifest generated: ${manifest.totalScenarios} scenarios across ${manifest.totalSpecs} specs`);
  console.log(`[test-manifest] ✓ Saved to: ${manifestPath}\n`);

  return manifest;
}

module.exports = {
  generateTestManifest
};
