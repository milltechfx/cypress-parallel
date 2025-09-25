const fs = require('fs').promises;
const path = require('path');

/**
 * Parser for Cucumber feature file tags
 * Extracts tags from feature files and evaluates tag expressions
 */
class FeatureTagParser {
  constructor(options = {}) {
    this.cache = new Map();
    this.verbose = options.verbose || false;
  }

  /**
   * Extract tags from the top of a feature file
   * Tags must appear before the Feature: line
   * @param {string} filePath - Path to the feature file
   * @returns {Promise<string[]>} Array of tags found in the file
   */
  async getFeatureTags(filePath) {
    // Check cache first
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath);
    }

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');

      let tags = [];
      let foundFeature = false;

      for (const line of lines) {
        const trimmed = line.trim();

        // Once we hit Feature:, we're done looking for tags
        if (trimmed.startsWith('Feature:')) {
          foundFeature = true;
          break;
        }

        // Skip comments but continue collecting tags
        if (trimmed.startsWith('#')) {
          continue;
        }

        // Skip empty lines but keep collecting tags
        if (!trimmed) {
          continue;
        }

        // Collect tags (they come before Feature:)
        if (trimmed.startsWith('@')) {
          // Split by spaces to handle multiple tags on one line
          const lineTags = trimmed.split(/\s+/).filter(t => t.startsWith('@'));
          tags = [...tags, ...lineTags];
        }
      }

      // Cache the result
      this.cache.set(filePath, tags);

      if (this.verbose && tags.length > 0) {
        console.log(`[TAG-PARSER] ${path.basename(filePath)}: ${tags.join(', ')}`);
      }

      return tags;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`[TAG-PARSER] File not found: ${filePath}`);
      } else {
        console.warn(`[TAG-PARSER] Failed to parse ${filePath}: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Parse a tag expression into an AST-like structure
   * Supports: and, or, not, parentheses
   * @param {string} expression - Tag expression string
   * @returns {object} Parsed expression tree
   */
  parseExpression(expression) {
    if (!expression || expression.trim() === '') {
      return null;
    }

    expression = expression.trim();

    // Handle parentheses first to ensure proper grouping
    if (expression.startsWith('(') && expression.endsWith(')')) {
      // Check if the parentheses are balanced and encompass the whole expression
      let depth = 0;
      let allEnclosed = true;
      for (let i = 0; i < expression.length - 1; i++) {
        if (expression[i] === '(') depth++;
        if (expression[i] === ')') depth--;
        if (depth === 0 && i < expression.length - 2) {
          allEnclosed = false;
          break;
        }
      }
      if (allEnclosed) {
        return this.parseExpression(expression.slice(1, -1));
      }
    }

    // Handle "and not" pattern - use greedy match for correct left-to-right precedence
    const andNotMatch = expression.match(/^(.+)\s+and\s+not\s+(.+)$/i);
    if (andNotMatch) {
      return {
        type: 'and',
        left: this.parseExpression(andNotMatch[1]),
        right: {
          type: 'not',
          operand: this.parseExpression(andNotMatch[2]) // Recursive parse
        }
      };
    }

    // Handle "or" (lower precedence than "and") - but skip if within parentheses
    let depth = 0;
    for (let i = 0; i < expression.length; i++) {
      if (expression[i] === '(') depth++;
      if (expression[i] === ')') depth--;
      if (depth === 0 && expression.substring(i).match(/^\s+or\s+/i)) {
        const left = expression.substring(0, i);
        const right = expression.substring(i).replace(/^\s+or\s+/i, '');
        return {
          type: 'or',
          left: this.parseExpression(left),
          right: this.parseExpression(right)
        };
      }
    }

    // Handle "and" - but skip if within parentheses
    depth = 0;
    for (let i = 0; i < expression.length; i++) {
      if (expression[i] === '(') depth++;
      if (expression[i] === ')') depth--;
      if (depth === 0 && expression.substring(i).match(/^\s+and\s+/i)) {
        const left = expression.substring(0, i);
        const right = expression.substring(i).replace(/^\s+and\s+/i, '');
        return {
          type: 'and',
          left: this.parseExpression(left),
          right: this.parseExpression(right)
        };
      }
    }

    // Handle "not"
    const notMatch = expression.match(/^not\s+(.+)$/i);
    if (notMatch) {
      return {
        type: 'not',
        operand: this.parseExpression(notMatch[1])
      };
    }

    // Base case: single tag
    return {
      type: 'tag',
      value: expression.trim()
    };
  }

  /**
   * Evaluate a parsed expression against a set of tags
   * @param {object} expr - Parsed expression tree
   * @param {string[]} tags - Array of tags to check against
   * @returns {boolean} Whether the tags match the expression
   */
  evaluateExpression(expr, tags) {
    if (!expr) {
      return true; // No expression means accept all
    }

    switch (expr.type) {
      case 'tag':
        // Case-insensitive tag comparison
        const tagLower = expr.value.toLowerCase();
        return tags.some(t => t.toLowerCase() === tagLower);

      case 'and':
        return this.evaluateExpression(expr.left, tags) &&
               this.evaluateExpression(expr.right, tags);

      case 'or':
        return this.evaluateExpression(expr.left, tags) ||
               this.evaluateExpression(expr.right, tags);

      case 'not':
        return !this.evaluateExpression(expr.operand, tags);

      default:
        console.warn(`[TAG-PARSER] Unknown expression type: ${expr.type}`);
        return false;
    }
  }

  /**
   * Check if tags match a tag expression
   * @param {string[]} featureTags - Tags from the feature file
   * @param {string} expression - Tag expression to evaluate
   * @returns {boolean} Whether the tags match the expression
   */
  matchesTagExpression(featureTags, expression) {
    if (!expression || expression.trim() === '') {
      return true; // No expression means accept all
    }

    const parsedExpr = this.parseExpression(expression);
    const result = this.evaluateExpression(parsedExpr, featureTags);

    if (this.verbose) {
      console.log(`[TAG-PARSER] Tags ${JSON.stringify(featureTags)} ${result ? 'match' : 'do not match'} expression: ${expression}`);
    }

    return result;
  }

  /**
   * Filter a list of feature files by tag expression
   * @param {string[]} filePaths - Array of feature file paths
   * @param {string} tagExpression - Tag expression to filter by
   * @returns {Promise<string[]>} Filtered array of file paths
   */
  async filterFeaturesByTags(filePaths, tagExpression) {
    if (!tagExpression || tagExpression.trim() === '') {
      return filePaths; // No filtering needed
    }

    const filteredPaths = [];

    for (const filePath of filePaths) {
      const tags = await this.getFeatureTags(filePath);
      if (this.matchesTagExpression(tags, tagExpression)) {
        filteredPaths.push(filePath);
      }
    }

    return filteredPaths;
  }

  /**
   * Clear the tag cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = FeatureTagParser;