const { getBrowserForTags } = require('../lib/browserSelector');

const consoleLogSpy = jest.spyOn(console, 'log');

describe('browserSelector - getBrowserForTags', () => {
  afterAll(() => {
      consoleLogSpy.mockRestore();
  });

  describe('Basic tag detection', () => {
    it('should return electron for @BE tag', () => {
      expect(getBrowserForTags('@BE')).toBe('electron');
    });

    it('should return electron for @BE with other tags (AND)', () => {
      expect(getBrowserForTags('@BE and @SMOKE')).toBe('electron');
      expect(getBrowserForTags('@BE and @Critical')).toBe('electron');
      expect(getBrowserForTags('@BE and @Regression')).toBe('electron');
    });

    it('should return electron for @BE with other tags (OR)', () => {
      expect(getBrowserForTags('@BE or @UI')).toBe('electron');
      expect(getBrowserForTags('(@BE or @FE)')).toBe('electron');
      expect(getBrowserForTags('@UI or @BE')).toBe('electron');
    });

    it('should return chrome for UI tests', () => {
      expect(getBrowserForTags('@UI')).toBe('chrome');
      expect(getBrowserForTags('@FE')).toBe('chrome');
      expect(getBrowserForTags('@SMOKE')).toBe('chrome');
      expect(getBrowserForTags('@Regression')).toBe('chrome');
    });

    it('should return null for no tags', () => {
      expect(getBrowserForTags(null)).toBeNull();
      expect(getBrowserForTags(undefined)).toBeNull();
      expect(getBrowserForTags('')).toBeNull();
    });
  });

  describe('Negation handling', () => {
    it('should return chrome when @BE is negated', () => {
      expect(getBrowserForTags('not @BE')).toBe('chrome');
      expect(getBrowserForTags('not (@BE)')).toBe('chrome');
    });

    it('should return chrome for complex negations', () => {
      expect(getBrowserForTags('@UI and not @BE')).toBe('chrome');
      expect(getBrowserForTags('(@UI or @SMOKE) and not @BE')).toBe('chrome');
      expect(getBrowserForTags('@Critical and not (@BE or @SLOW)')).toBe('chrome');
    });

    it('should return electron when @BE is present despite other negations', () => {
      expect(getBrowserForTags('@BE and not @Deprecated')).toBe('electron');
      expect(getBrowserForTags('@BE and not (@SLOW or @FLAKY)')).toBe('electron');
    });
  });

  describe('False positive prevention', () => {
    it('should NOT match tags that contain BE but are not @BE', () => {
      expect(getBrowserForTags('@BETTER')).toBe('chrome');
      expect(getBrowserForTags('@BE_TEST')).toBe('chrome');
      expect(getBrowserForTags('@BACKEND')).toBe('chrome');
      expect(getBrowserForTags('@MAYBE')).toBe('chrome');
      expect(getBrowserForTags('@LABEL')).toBe('chrome');
    });

    it('should match @BE with proper word boundaries', () => {
      expect(getBrowserForTags('@BE')).toBe('electron');
      expect(getBrowserForTags(' @BE ')).toBe('electron');
      expect(getBrowserForTags('(@BE)')).toBe('electron');
      expect(getBrowserForTags('@BE,@UI')).toBe('electron');
    });
  });

  describe('Complex expressions', () => {
    it('should handle complex AND/OR combinations', () => {
      expect(getBrowserForTags('(@BE or @FE) and @Critical')).toBe('electron');
      expect(getBrowserForTags('(@SMOKE and @BE) or @CRITICAL')).toBe('electron');
      expect(getBrowserForTags('@BE and (@SMOKE or @REGRESSION)')).toBe('electron');
    });

    it('should handle deeply nested expressions', () => {
      expect(getBrowserForTags('((@BE and @SMOKE) or @FE) and not @SKIP')).toBe('electron');
      expect(getBrowserForTags('(@UI or (@BE and @FAST)) and @REGRESSION')).toBe('electron');
    });

    it('should handle multiple spaces and formatting', () => {
      expect(getBrowserForTags('  @BE  ')).toBe('electron');
      expect(getBrowserForTags('@BE   and   @SMOKE')).toBe('electron');
      expect(getBrowserForTags('( @BE  or  @UI )')).toBe('electron');
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed expressions gracefully', () => {
      expect(getBrowserForTags('@')).toBe('chrome');
      expect(getBrowserForTags('BE')).toBe('chrome');
      expect(getBrowserForTags('@ BE')).toBe('chrome');
    });

    it('should handle case sensitivity correctly', () => {
      // @BE should be case-sensitive
      expect(getBrowserForTags('@be')).toBe('chrome');
      expect(getBrowserForTags('@Be')).toBe('chrome');
      expect(getBrowserForTags('@bE')).toBe('chrome');

      // Note: Our implementation looks for @BE pattern regardless of operator case
      // It will match @BE as long as it's present with proper word boundaries
      expect(getBrowserForTags('@BE AND @SMOKE')).toBe('electron'); // @BE found
      expect(getBrowserForTags('@BE and @SMOKE')).toBe('electron'); // @BE found
      expect(getBrowserForTags('@BE Or @UI')).toBe('electron'); // @BE found
      expect(getBrowserForTags('@BE or @UI')).toBe('electron'); // @BE found

      // Negation only works with lowercase 'not'
      expect(getBrowserForTags('NOT @BE')).toBe('electron'); // NOT not recognized, @BE still found
      expect(getBrowserForTags('not @BE')).toBe('chrome'); // not recognized, @BE is negated
    });

    it('should handle special characters in expressions', () => {
      expect(getBrowserForTags('@BE-TEST')).toBe('chrome'); // Hyphen breaks word boundary
      expect(getBrowserForTags('@BE_TEST')).toBe('chrome'); // Underscore breaks word boundary
      expect(getBrowserForTags('@BE.TEST')).toBe('chrome'); // Dot breaks word boundary
      expect(getBrowserForTags('@BE@TEST')).toBe('chrome'); // @ breaks word boundary
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical backend test tags', () => {
      expect(getBrowserForTags('@BE')).toBe('electron');
      expect(getBrowserForTags('@BE @SMOKE')).toBe('electron');
      expect(getBrowserForTags('@BE and @SMOKE')).toBe('electron');
    });

    it('should handle typical UI test tags', () => {
      expect(getBrowserForTags('@UI')).toBe('chrome');
      expect(getBrowserForTags('@SMOKE')).toBe('chrome');
      expect(getBrowserForTags('@UI and @CRITICAL')).toBe('chrome');
      expect(getBrowserForTags('@FE and not @SKIP')).toBe('chrome');
    });

    it('should handle mixed test suites correctly', () => {
      // When both BE and UI tests are included, use Electron (safer choice)
      expect(getBrowserForTags('(@BE or @UI) and @SMOKE')).toBe('electron');

      // When BE is excluded, use Chrome
      expect(getBrowserForTags('(@UI or @MOBILE) and not @BE')).toBe('chrome');
    });
  });
});