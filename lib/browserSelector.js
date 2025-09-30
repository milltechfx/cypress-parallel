/**
 * Browser selection logic for cypress-parallel
 * Automatically selects Electron for @BE tests to avoid Chrome renderer crashes
 */

/**
 * Determines the appropriate browser based on test tags
 * @param {string} tags - Tag expression
 * @returns {string|null} Browser name or null for default
 */
function getBrowserForTags(tags) {
    if (!tags) return null;
  
    // Check if @BE is negated (should NOT use Electron)
    if (/not\s+(\()?.*@BE/.test(tags)) {
      return 'chrome';
    }
  
    // Use Electron for @BE tests (backend tests)
    // This avoids Chrome renderer crashes on memory-constrained agents
    if (/(?:^|\s|,|\(|or\s|and\s)@BE(?:$|\s|,|\)|or\s|and\s)/.test(tags)) {
      return 'electron';
    }
  
    // Default to Chrome for UI tests
    return 'chrome';
  }
  
  module.exports = {
    getBrowserForTags
  };