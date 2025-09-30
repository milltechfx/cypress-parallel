const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');
const FeatureTagParser = require('../lib/featureTagParser');

describe('FeatureTagParser', () => {
  let parser;
  let tempDir;
  let testFiles = [];

  beforeEach(async () => {
    parser = new FeatureTagParser();
    tempDir = path.join(__dirname, 'temp_test_features');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    for (const file of testFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {}
    }
    testFiles = [];
    try {
      await fs.rmdir(tempDir);
    } catch (e) {}
  });

  async function createFeatureFile(filename, content) {
    const filePath = path.join(tempDir, filename);
    await fs.writeFile(filePath, content, 'utf8');
    testFiles.push(filePath);
    return filePath;
  }

  describe('getFeatureTags', () => {
    it('should extract single tag from feature file', async () => {
      const filePath = await createFeatureFile('single-tag.feature', `
@BE
Feature: Backend tests
  Scenario: Test something
      `);

      const tags = await parser.getFeatureTags(filePath);
      assert.deepStrictEqual(tags, ['@BE']);
    });

    it('should extract multiple tags from same line', async () => {
      const filePath = await createFeatureFile('multi-tag.feature', `
@BE @Critical @Regression
Feature: Important tests
  Scenario: Test something
      `);

      const tags = await parser.getFeatureTags(filePath);
      assert.deepStrictEqual(tags, ['@BE', '@Critical', '@Regression']);
    });

    it('should extract multiple tags from multiple lines', async () => {
      const filePath = await createFeatureFile('multiline-tag.feature', `
@BE
@Critical
Feature: Important tests
  Scenario: Test something
      `);

      const tags = await parser.getFeatureTags(filePath);
      assert.deepStrictEqual(tags, ['@BE', '@Critical']);
    });

    it('should collect all tags before Feature line regardless of gaps', async () => {
      const filePath = await createFeatureFile('separated-tags.feature', `
@BE
# This is a comment

@Critical
Feature: Important tests
  Scenario: Test something
      `);

      const tags = await parser.getFeatureTags(filePath);
      // Now collects ALL tags before Feature line, even with gaps
      assert.deepStrictEqual(tags, ['@BE', '@Critical']);
    });

    it('should handle files without tags', async () => {
      const filePath = await createFeatureFile('no-tags.feature', `
Feature: Tests without tags
  Scenario: Test something
      `);

      const tags = await parser.getFeatureTags(filePath);
      assert.deepStrictEqual(tags, []);
    });

    it('should handle non-existent files gracefully', async () => {
      const tags = await parser.getFeatureTags('/non/existent/file.feature');
      assert.deepStrictEqual(tags, []);
    });
  });

  describe('matchesTagExpression', () => {
    it('should match simple tag', () => {
      assert.strictEqual(parser.matchesTagExpression(['@BE'], '@BE'), true);
      assert.strictEqual(parser.matchesTagExpression(['@FE'], '@BE'), false);
    });

    it('should handle AND expressions', () => {
      const tags = ['@BE', '@Critical'];
      assert.strictEqual(parser.matchesTagExpression(tags, '@BE and @Critical'), true);
      assert.strictEqual(parser.matchesTagExpression(tags, '@BE and @Regression'), false);
    });

    it('should handle OR expressions', () => {
      const tags = ['@BE'];
      assert.strictEqual(parser.matchesTagExpression(tags, '@BE or @FE'), true);
      assert.strictEqual(parser.matchesTagExpression(tags, '@FE or @Mobile'), false);
    });

    it('should handle NOT expressions', () => {
      const tags = ['@BE'];
      assert.strictEqual(parser.matchesTagExpression(tags, 'not @FE'), true);
      assert.strictEqual(parser.matchesTagExpression(tags, 'not @BE'), false);
    });

    it('should handle complex expression: @BE and not (@Deprecated or @CUTOFF)', () => {
      assert.strictEqual(
        parser.matchesTagExpression(['@BE'], '@BE and not (@Deprecated or @CUTOFF)'),
        true
      );
      assert.strictEqual(
        parser.matchesTagExpression(['@BE', '@Deprecated'], '@BE and not (@Deprecated or @CUTOFF)'),
        false
      );
      assert.strictEqual(
        parser.matchesTagExpression(['@BE', '@CUTOFF'], '@BE and not (@Deprecated or @CUTOFF)'),
        false
      );
      assert.strictEqual(
        parser.matchesTagExpression(['@FE'], '@BE and not (@Deprecated or @CUTOFF)'),
        false
      );
    });

    it('should handle parentheses', () => {
      const tags = ['@BE', '@Critical'];
      assert.strictEqual(
        parser.matchesTagExpression(tags, '(@BE or @FE) and @Critical'),
        true
      );
      assert.strictEqual(
        parser.matchesTagExpression(tags, '(@BE or @FE) and @Regression'),
        false
      );
    });

    it('should return true for empty expression', () => {
      assert.strictEqual(parser.matchesTagExpression(['@BE'], ''), true);
      assert.strictEqual(parser.matchesTagExpression(['@BE'], null), true);
    });
  });

  describe('filterFeaturesByTags', () => {
    it('should filter features by tag expression', async () => {
      const beFile = await createFeatureFile('backend.feature', `
@BE
Feature: Backend tests
      `);

      const feFile = await createFeatureFile('frontend.feature', `
@FE
Feature: Frontend tests
      `);

      const deprecatedFile = await createFeatureFile('deprecated.feature', `
@BE
@Deprecated
Feature: Old backend tests
      `);

      const allFiles = [beFile, feFile, deprecatedFile];

      // Filter for @BE
      const beFiles = await parser.filterFeaturesByTags(allFiles, '@BE');
      assert.strictEqual(beFiles.length, 2);
      assert.ok(beFiles.includes(beFile));
      assert.ok(beFiles.includes(deprecatedFile));

      // Filter for @BE and not @Deprecated
      const activeBeFiles = await parser.filterFeaturesByTags(allFiles, '@BE and not @Deprecated');
      assert.strictEqual(activeBeFiles.length, 1);
      assert.ok(activeBeFiles.includes(beFile));
    });

    it('should return all files for empty expression', async () => {
      const file1 = await createFeatureFile('test1.feature', 'Feature: Test 1');
      const file2 = await createFeatureFile('test2.feature', 'Feature: Test 2');

      const allFiles = [file1, file2];
      const filtered = await parser.filterFeaturesByTags(allFiles, '');

      assert.deepStrictEqual(filtered, allFiles);
    });
  });

  describe('parseExpression', () => {
    it('should parse simple tag', () => {
      const expr = parser.parseExpression('@BE');
      assert.deepStrictEqual(expr, { type: 'tag', value: '@BE' });
    });

    it('should parse AND expression', () => {
      const expr = parser.parseExpression('@BE and @Critical');
      assert.deepStrictEqual(expr, {
        type: 'and',
        left: { type: 'tag', value: '@BE' },
        right: { type: 'tag', value: '@Critical' }
      });
    });

    it('should parse OR expression', () => {
      const expr = parser.parseExpression('@BE or @FE');
      assert.deepStrictEqual(expr, {
        type: 'or',
        left: { type: 'tag', value: '@BE' },
        right: { type: 'tag', value: '@FE' }
      });
    });

    it('should parse NOT expression', () => {
      const expr = parser.parseExpression('not @Deprecated');
      assert.deepStrictEqual(expr, {
        type: 'not',
        operand: { type: 'tag', value: '@Deprecated' }
      });
    });

    it('should parse complex expression with and not', () => {
      const expr = parser.parseExpression('@BE and not @Deprecated');
      assert.deepStrictEqual(expr, {
        type: 'and',
        left: { type: 'tag', value: '@BE' },
        right: {
          type: 'not',
          operand: { type: 'tag', value: '@Deprecated' }
        }
      });
    });

    it('should handle parentheses', () => {
      const expr = parser.parseExpression('(@BE or @FE)');
      // Should remove outer parentheses and parse inner expression
      assert.deepStrictEqual(expr, {
        type: 'or',
        left: { type: 'tag', value: '@BE' },
        right: { type: 'tag', value: '@FE' }
      });
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  const { execSync } = require('child_process');
  console.log('Running FeatureTagParser tests...\n');
  try {
    execSync('npx mocha ' + __filename, { stdio: 'inherit' });
  } catch (e) {
    process.exit(1);
  }
}