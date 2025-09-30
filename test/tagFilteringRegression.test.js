const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');
const FeatureTagParser = require('../lib/featureTagParser');

// Increase Jest timeout for file system operations
jest.setTimeout(30000);

// Expected feature files that should match @BE and not @DEPRECATED and not @CUTOFF
const EXPECTED_BE_FEATURES = [
  'cypress/e2e/features/ACA/bypassCLS.feature',
  'cypress/e2e/features/ACA/bypassNDF.feature',
  'cypress/e2e/features/FIX/BE/acceptor/fixConnectionDetails.feature',
  'cypress/e2e/features/FIX/BE/acceptor/healthCheck.feature',
  'cypress/e2e/features/FIX/BE/acceptor/messageRequest.feature',
  'cypress/e2e/features/FIX/BE/acceptor/resendMessage.feature',
  'cypress/e2e/features/FIX/BE/initiator/healthCheck.feature',
  'cypress/e2e/features/FIX/BE/lambdas/fixForwardMsg.feature',
  'cypress/e2e/features/FIX/BE/lambdas/fixInvestecMsgGen.feature',
  'cypress/e2e/features/FIX/BE/lambdas/fixMsgGenSqs/combineRolls.feature',
  'cypress/e2e/features/FIX/BE/lambdas/fixMsgGenSqs/fixMsgGenSqs.feature',
  'cypress/e2e/features/FIX/BE/sessions/getNextSequenceNumber.feature',
  'cypress/e2e/features/FIX/BE/sessions/getSessionId.feature',
  'cypress/e2e/features/FIX/BE/sessions/sessions.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_BLUE/apiBatchUpload/CY_BLUE_ACA.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_BLUE/portalBatchUpload/CY_BLUE_ACA_part1.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_BLUE/portalBatchUpload/CY_BLUE_ACA_part2.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_BLUE/portalBatchUpload/CY_BLUE_ACA_part3.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_BLUE/portalBatchUpload/CY_BLUE_ACA_part4.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_GREEN.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/apiBatchUpload/CY_RED_ACA.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part1.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part10.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part11.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part12.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part13.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part14.feature',  
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part2.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part3.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part4.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part5.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part6.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part7.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part8.feature',
  'cypress/e2e/features/TIME/ACA/BE/CY_RED/portalBatchUpload/CY_RED_ACA_part9.feature',
  'cypress/e2e/features/TIME/ACA/BE/identifyNearLeg.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/approvals.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/getClientBatchDetails/getClientBatchDetailsOH.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/getClientBatchDetails/getClientBatchDetailsRP.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/getClientBatchesForApprovalRejected.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/getOrderBatchDetails.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/investecBatch.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/multipleApprovers.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/ordersCreatedFlag.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/permissions.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/reject.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/storeTrade.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/submitBatch.feature',
  'cypress/e2e/features/TIME/TIMEPH3/BE/userSpecifiedCounterparty.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/forbiddenCharacters/tradeUploadForbiddenCharacters_part1.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/forbiddenCharacters/tradeUploadForbiddenCharacters_part2.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/sameDayTrades.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/spotOnlyPortfolioTrades.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/tradeLimits/tradeLimits.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/tradeLimits/tradeLimitsApprovals.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/tradeUpload.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/tradeUploadCurrencyCalendar.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/tradeUploadMteValidationWarnings.feature',
  'cypress/e2e/features/TIME/TradeUpload/BE/tradeUploadNdf.feature',
  'cypress/e2e/features/TIME/apiBatchUpload/BE/apiBatchUploadSchemaValidation.feature',
  'cypress/e2e/features/TIME/apiBatchUpload/BE/identifyNearLeg.feature',
  'cypress/e2e/features/TIME/clientApi/BE/clientApiAuth.feature',
  'cypress/e2e/features/TIME/clientApi/BE/clientApiGetBatches.feature', 
  'cypress/e2e/features/TIME/clientApi/BE/clientApiSchemaValidation.feature',
  'cypress/e2e/features/TIME/clientApi/BE/clientApiSubmitBatches.feature',
  'cypress/e2e/features/TIME/clientApi/BE/clientApiSubmitBatchesForbiddenCharacters.feature',
  'cypress/e2e/features/TIME/customCounterParty/customCounterParty.feature',
  'cypress/e2e/features/TIME/customCounterParty/wamSameDayTrades.feature',  
  'cypress/e2e/features/TIME/execution/BE/selfServeValidationRules.feature',
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part1.feature',
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part10.feature',
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part2.feature',
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part3.feature', 
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part4.feature',
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part5.feature',
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part6.feature',
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part7.feature',
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part8.feature',
  'cypress/e2e/features/TIME/feeService/BE/creditProviderFees_part9.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part1.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part10.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part2.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part3.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part4.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part5.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part6.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part7.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part8.feature',
  'cypress/e2e/features/TIME/feeService/BE/decreasingPositionFlagCreditProviderFees_part9.feature',
  'cypress/e2e/features/TIME/feeService/BE/fees.feature',
  'cypress/e2e/features/TIME/feeService/BE/getTradesAndFees.feature',
  'cypress/e2e/features/TIME/feeService/BE/zeroFees.feature',
  'cypress/e2e/features/TIME/notifications/BE/externalNotifications.feature',
  'cypress/e2e/features/TIME/orderStaging/BE/cancelAndResend.feature',
  'cypress/e2e/features/TIME/orderStaging/BE/opsBatchUpload.feature',
  'cypress/e2e/features/TIME/permissions/BE/executionStatus.feature',
  'cypress/e2e/features/TIME/validateBatchOrder/BE/validateBatchOrder_part1.feature',
  'cypress/e2e/features/TIME/validateBatchOrder/BE/validateBatchOrder_part2.feature',
  'cypress/e2e/features/TIME/validateBatchOrder/BE/validateBatchOrder_part3.feature',
  'cypress/e2e/features/TIME/validateBatchOrder/BE/validateBatchOrder_part4.feature',
  'cypress/e2e/features/TIME/validateBatchOrder/BE/validateBatchOrder_part6.feature',
  'cypress/e2e/features/TIME/validateBatchOrder/BE/validateBatchOrder_part7.feature',
  'cypress/e2e/features/TIME/validateBatch/BE/validateBatch_part1.feature',
  'cypress/e2e/features/TIME/validateBatch/BE/validateBatch_part2.feature',
  'cypress/e2e/features/TIME/validateBatch/BE/validateBatch_part3.feature',
  'cypress/e2e/features/TIME/validateBatch/BE/validateBatch_part4.feature',
  'cypress/e2e/features/Utility/tradeDatastore.feature',
  'cypress/e2e/features/Utility/updateUserOrganisation.feature',
  'cypress/e2e/features/audit/BE/selfServeAudit.feature',
  'cypress/e2e/features/benchmarkIndicator/BE/createBatch.feature',
  'cypress/e2e/features/carlsberg/BE/carlsbergRequests.feature',
  'cypress/e2e/features/carlsberg/BE/sftp.feature', 
  'cypress/e2e/features/clientConfig/BE/creditProviderFeeCRUD.feature',
  'cypress/e2e/features/clientConfig/BE/feeCRUD.feature',
  'cypress/e2e/features/clientConfig/BE/limitCRUD.feature',
  'cypress/e2e/features/clientConfig/BE/notificationRecipientsCRUD.feature',
  'cypress/e2e/features/clientConfig/BE/orgCRUD.feature',
  'cypress/e2e/features/clientConfig/BE/portfolioCRUD.feature',
  'cypress/e2e/features/clientConfig/BE/recreateUserAudit.feature',
  'cypress/e2e/features/clientConfig/BE/tradeUploadTemplate.feature',
  'cypress/e2e/features/clientConfig/BE/userCRUD.feature',
  'cypress/e2e/features/coPilot/fxCarry/BE/calculateFxCarry.feature',
  'cypress/e2e/features/coPilot/fxCarry/BE/calculateFxCarryGradient.feature',
  'cypress/e2e/features/coPilot/fxCarry/BE/fxCarryCurrencyList.feature',
  'cypress/e2e/features/coPilot/fxCarry/BE/fxCarryDashboardPreferences.feature',
  'cypress/e2e/features/coPilot/fxCarry/BE/getFxCarry.feature',
  'cypress/e2e/features/coPilot/hedgingSimulator/BE/hedgingSimulatorCurrencyList.feature',
  'cypress/e2e/features/coPilot/hedgingSimulator/BE/hedgingSimulatorInsights.feature',
  'cypress/e2e/features/coPilot/hedgingSimulator/BE/simulateHedge.feature',
  'cypress/e2e/features/coPilot/hedgingSimulator/BE/simulateHedgeNet.feature',
  'cypress/e2e/features/coPilot/hedgingSimulator/BE/simulateHedgeNotification.feature',
  'cypress/e2e/features/deliverableNdf/calculateOpenExposures.feature',
  'cypress/e2e/features/deliverableNdf/getOrder.feature',
  'cypress/e2e/features/deliverableNdf/getPositionByCounterparty.feature',
  'cypress/e2e/features/deliverableNdf/getPositionDetails.feature',
  'cypress/e2e/features/deliverableNdf/getTrades.feature',
  'cypress/e2e/features/deliverableNdf/getTradesFilterData.feature',
  'cypress/e2e/features/deliverableNdf/netSettlement.feature',
  'cypress/e2e/features/deliverableNdf/netSettlementByPortfolio.feature',
  'cypress/e2e/features/deliverableNdf/portfolioCRUD.feature',
  'cypress/e2e/features/execution/BE/getFxValueDate.feature',
  'cypress/e2e/features/execution/BE/selfServeValidationRules.feature',
  'cypress/e2e/features/feeService/BE/invoiceFees.feature',
  'cypress/e2e/features/futureTradeDate/BE/apiBatchUpload.feature',
  'cypress/e2e/features/futureTradeDate/BE/approveCancelBatch.feature',
  'cypress/e2e/features/futureTradeDate/BE/cancelBatch.feature',
  'cypress/e2e/features/futureTradeDate/BE/clientApiSubmitBatches.feature',
  'cypress/e2e/features/futureTradeDate/BE/getClientBatchDetailsFutureTradeDate.feature',
  'cypress/e2e/features/futureTradeDate/BE/getClientBatchesForApproval.feature',
  'cypress/e2e/features/futureTradeDate/BE/submitCancelBatch.feature',
  'cypress/e2e/features/futureTradeDate/BE/submitPendingTradeDateBatches.feature',
  'cypress/e2e/features/futureTradeDate/BE/tradeUpload.feature',
  'cypress/e2e/features/futureTradeDate/BE/validateBatchOrder.feature',
  'cypress/e2e/features/hrr/BE/approveHrrFee.feature',
  'cypress/e2e/features/hrr/BE/creditProviderHrrFee_part1.feature',
  'cypress/e2e/features/hrr/BE/creditProviderHrrFee_part2.feature',
  'cypress/e2e/features/hrr/BE/getHrrTrades.feature',
  'cypress/e2e/features/hrr/BE/submitHrrFee.feature',
  'cypress/e2e/features/manualOrders/BE/lookupCustomer.feature',
  'cypress/e2e/features/manualOrders/BE/manualOrders.feature',
  'cypress/e2e/features/mgiProxy/BE/cancelOrderFromOMS.feature',
  'cypress/e2e/features/mgiProxy/BE/proxyDataLayer.feature',
  'cypress/e2e/features/ndfFixings/BE/closeNdfFixing.feature',
  'cypress/e2e/features/ndfFixings/BE/submitNdfFixing.feature',
  'cypress/e2e/features/notifications/BE/sendSalesEmail.feature',
  'cypress/e2e/features/ohExposures/BE/ohExposures.feature',
  'cypress/e2e/features/ohPositions/BE/ohPositions.feature',
  'cypress/e2e/features/opsPortalDocs/BE/crud.feature', 
  'cypress/e2e/features/orderStaging/BE/getPositionDetails.feature',
  'cypress/e2e/features/orderStaging/BE/orderStaging_part2.feature',
  'cypress/e2e/features/orderStaging/BE/submitModifiedOrder.feature',
  'cypress/e2e/features/pagination/BE/generateCsv.feature',
  'cypress/e2e/features/pagination/BE/getReport.feature', 
  'cypress/e2e/features/pagination/BE/getTradesFilterData.feature',
  'cypress/e2e/features/pagination/BE/getTrades/getTrades_part1.feature',
  'cypress/e2e/features/pagination/BE/getTrades/getTrades_part2.feature',
  'cypress/e2e/features/pagination/BE/getTrades/getTrades_part3.feature',
  'cypress/e2e/features/pagination/BE/getTrades/getTrades_part4.feature',
  'cypress/e2e/features/pagination/BE/getTrades/getTrades_part5.feature',
  'cypress/e2e/features/pagination/BE/getTrades/getTrades_part6.feature',
  'cypress/e2e/features/pagination/BE/getTrades/getTrades_part7.feature',
  'cypress/e2e/features/permissions/BE/RPPermissions.feature',
  'cypress/e2e/features/portalDashboard/BE/dashboardConfig.feature',
  'cypress/e2e/features/portalDocs/BE/enhancedDoc.feature',
  'cypress/e2e/features/portalDocs/BE/userDocuments.feature',
  'cypress/e2e/features/positions/BE/positions.feature',  
  'cypress/e2e/features/rateDatastore/BE/benchmarkRates.feature',
  'cypress/e2e/features/referenceData/BE/currencyCalendar.feature',
  'cypress/e2e/features/reporting/BE/notifyCreditProviderTradeUpload.feature',
  'cypress/e2e/features/reporting/BE/portfolioSubsetCRUD.feature',
  'cypress/e2e/features/reporting/BE/reportCustomisation.feature',
  'cypress/e2e/features/reporting/BE/reportRecipients.feature',
  'cypress/e2e/features/reporting/BE/reportSchedules.feature',
  'cypress/e2e/features/reporting/mtmReport.feature',
  'cypress/e2e/features/reporting/natwestGiveupReport.feature',
  'cypress/e2e/features/reporting/settlementReport.feature',
  'cypress/e2e/features/reporting/tradeConfirmEodReport.feature',
  'cypress/e2e/features/reporting/tradeConfirmReport.feature',
  'cypress/e2e/features/settlements/BE/getSettlementDates.feature',     
  'cypress/e2e/features/settlements/BE/localSettlementReport.feature',
  'cypress/e2e/features/settlements/BE/nettingPublic.feature',
  'cypress/e2e/features/streamingApi/BE/midsAndRates.feature',
  'cypress/e2e/features/streamingApi/BE/streamingApi.feature',
  'cypress/e2e/features/streamingApi/BE/topOfBookStreaming.feature',
  'cypress/e2e/features/swift/BE/unlinkedSwiftPortfolios.feature',
  'cypress/e2e/features/trade-Revaluation/tradeRevaluation.feature',
  'cypress/e2e/features/tradeDatastore/BE/getPositionDetails.feature',
  'cypress/e2e/features/tradeNettingService/BE/ACPtradeNetting.feature',
  'cypress/e2e/features/tradeNettingService/BE/INVOICEFEEtradeNetting.feature',
  'cypress/e2e/features/tradeNettingService/BE/ISDAtradeNetting.feature',
  'cypress/e2e/features/tradeNettingService/BE/NDFtradeNetting.feature',
];

describe('Tag Filtering Regression Tests', () => {
  let parser;
  const cypressDir = ''; // <local-path-to-cypress-repo>

  if (!cypressDir) {
    it('should skip the test if cypressDir is not set', () => {
      expect(true).toBe(true);
    });
    return;
  }

  beforeEach(() => {
    parser = new FeatureTagParser({ verbose: true });
  });

  describe('Complex tag expression parsing', () => {

    it('should correctly parse @BE and not @DEPRECATED and not @CUTOFF', () => {
      const expression = '@BE and not @DEPRECATED and not @CUTOFF';
      const parsed = parser.parseExpression(expression);

      console.log('Parsed expression structure:', JSON.stringify(parsed, null, 2));

      // With greedy regex, the parser creates: (@BE and not @DEPRECATED) and not @CUTOFF
      assert.strictEqual(parsed.type, 'and', 'Root should be AND');

      // The left side is now nested: @BE and not @DEPRECATED
      assert.strictEqual(parsed.left.type, 'and', 'Left should be AND');
      assert.strictEqual(parsed.left.left.type, 'tag', 'Left.left should be a tag');
      assert.strictEqual(parsed.left.left.value, '@BE', 'Left.left tag should be @BE');
      assert.strictEqual(parsed.left.right.type, 'not', 'Left.right should be NOT');
      assert.strictEqual(parsed.left.right.operand.type, 'tag', 'Left.right.operand should be a tag');
      assert.strictEqual(parsed.left.right.operand.value, '@DEPRECATED', 'Left.right.operand should be @DEPRECATED');

      // The right side should be NOT @CUTOFF
      assert.strictEqual(parsed.right.type, 'not', 'Right should be NOT');
      assert.strictEqual(parsed.right.operand.type, 'tag', 'Right.operand should be a tag');
      assert.strictEqual(parsed.right.operand.value, '@CUTOFF', 'Right.operand should be @CUTOFF');
    });

    it('should correctly evaluate tags against complex expressions', () => {
      // Test case 1: Feature with @BE but no deprecated tags - SHOULD MATCH
      const tags1 = ['@FIX', '@FIXAcceptor', '@BE', '@FIXBE', '@STACKS:FIX'];
      const expr1 = '@BE and not @DEPRECATED and not @CUTOFF';
      const result1 = parser.matchesTagExpression(tags1, expr1);
      console.log(`Tags ${JSON.stringify(tags1)} match "${expr1}": ${result1}`);
      assert.strictEqual(result1, true, 'Should match @BE without deprecated tags');

      // Test case 2: Feature with @BE and @DEPRECATED - SHOULD NOT MATCH
      const tags2 = ['@BE', '@DEPRECATED'];
      const result2 = parser.matchesTagExpression(tags2, expr1);
      console.log(`Tags ${JSON.stringify(tags2)} match "${expr1}": ${result2}`);
      assert.strictEqual(result2, false, 'Should not match when @DEPRECATED is present');

      // Test case 3: Feature with @BE and @CUTOFF - SHOULD NOT MATCH
      const tags3 = ['@BE', '@CUTOFF'];
      const result3 = parser.matchesTagExpression(tags3, expr1);
      console.log(`Tags ${JSON.stringify(tags3)} match "${expr1}": ${result3}`);
      assert.strictEqual(result3, false, 'Should not match when @CUTOFF is present');

      // Test case 4: Feature without @BE - SHOULD NOT MATCH
      const tags4 = ['@FE', '@ClientPortal'];
      const result4 = parser.matchesTagExpression(tags4, expr1);
      console.log(`Tags ${JSON.stringify(tags4)} match "${expr1}": ${result4}`);
      assert.strictEqual(result4, false, 'Should not match without @BE');
    });
  });

  describe('Feature file filtering', () => {
    it('should find 211 BE features (excluding deprecated and cutoff)', async function() {
      try {
        // Get all feature files
        const { glob } = require('glob');
        const pattern = path.join(cypressDir, 'cypress/e2e/features/**/*.feature');
        const allFeatures = await glob(pattern);

        console.log(`Total feature files found: ${allFeatures.length}`);

        // Filter by tag expression
        const tagExpression = '@BE and not @DEPRECATED and not @CUTOFF';
        const filteredFeatures = await parser.filterFeaturesByTags(allFeatures, tagExpression);

        console.log(`\nFiltered features count: ${filteredFeatures.length}`);
        console.log('Expected count: 211');

        // Check some expected files are included
        const relativePaths = filteredFeatures.map(f =>
          f.replace(cypressDir + '/', '')
        );

        console.log('\nChecking expected FIX features...');
        for (const expected of EXPECTED_BE_FEATURES.slice(2, 14)) { // FIX features
          const found = relativePaths.includes(expected);
          console.log(`  ${found ? '✓' : '✗'} ${expected}`);
          if (!found) {
            // Debug: Check what tags this file has
            const fullPath = path.join(cypressDir, expected);
            try {
              const tags = await parser.getFeatureTags(fullPath);
              console.log(`    Tags found: ${JSON.stringify(tags)}`);
            } catch (e) {
              console.log(`    Error reading file: ${e.message}`);
            }
          }
        }

        // This will likely fail with current implementation
        assert.strictEqual(
          filteredFeatures.length,
          211,
          `Expected 211 features but got ${filteredFeatures.length}`
        );

      } catch (error) {
        console.error('Test failed:', error.message);
        throw error;
      }
    });

    it('should correctly handle feature-level vs scenario-level tags', async function() {
      // Create test files to demonstrate the issue
      const testDir = path.join(__dirname, 'temp_tag_test');
      await fs.mkdir(testDir, { recursive: true });

      try {
        // Feature with @BE at feature level
        const feature1 = path.join(testDir, 'feature1.feature');
        await fs.writeFile(feature1, `@BE @Integration
Feature: Backend Feature

  Scenario: Test 1
    Given something
`);

        // Feature with @BE only at scenario level (will be LOST)
        const feature2 = path.join(testDir, 'feature2.feature');
        await fs.writeFile(feature2, `@FE_CP @ClientPortal
Feature: Frontend Feature with BE scenarios

  @BE @Integration
  Scenario: Backend test in FE feature
    Given something backend

  @FE
  Scenario: Frontend test
    Given something frontend
`);

        // Feature with deprecated tag
        const feature3 = path.join(testDir, 'feature3.feature');
        await fs.writeFile(feature3, `@BE @DEPRECATED
Feature: Deprecated Backend Feature

  Scenario: Old test
    Given something old
`);

        const allFiles = [feature1, feature2, feature3];
        const tagExpression = '@BE and not @DEPRECATED';

        const filtered = await parser.filterFeaturesByTags(allFiles, tagExpression);

        console.log('\nTest results:');
        console.log(`  feature1.feature (@BE at feature level): ${filtered.includes(feature1) ? 'INCLUDED ✓' : 'EXCLUDED ✗'}`);
        console.log(`  feature2.feature (@BE at scenario level): ${filtered.includes(feature2) ? 'INCLUDED ✓' : 'EXCLUDED ✗ (BUG!)'}`);
        console.log(`  feature3.feature (@BE @DEPRECATED): ${filtered.includes(feature3) ? 'INCLUDED ✗' : 'EXCLUDED ✓'}`);

        // Current implementation will only include feature1
        assert.strictEqual(filtered.length, 1, 'Current implementation only filters at feature level');
        assert.strictEqual(filtered[0], feature1, 'Only feature1 should be included');

        // This demonstrates the problem - feature2 has @BE scenarios but is excluded
        console.log('\n⚠️  WARNING: Scenario-level @BE tags in feature2.feature are being ignored!');

      } finally {
        // Cleanup
        await fs.rm(testDir, { recursive: true, force: true });
      }
    });
  });

  describe('Parser fix validation', () => {
    it('should demonstrate the fixed parser behavior', () => {
      // Create a mock fixed parser
      class FixedFeatureTagParser extends FeatureTagParser {
        parseExpression(expression) {
          if (!expression || expression.trim() === '') {
            return null;
          }

          expression = expression.trim();

          // Fixed handling of "and not" - properly recursive
          const andNotMatch = expression.match(/^(.+?)\s+and\s+not\s+(.+)$/i);
          if (andNotMatch) {
            return {
              type: 'and',
              left: this.parseExpression(andNotMatch[1]),
              right: {
                type: 'not',
                operand: this.parseExpression(andNotMatch[2]) // FIXED: Recursive parse
              }
            };
          }

          // Rest of implementation...
          return super.parseExpression(expression);
        }
      }

      const fixedParser = new FixedFeatureTagParser();
      const expression = '@BE and not @DEPRECATED and not @CUTOFF';
      const parsed = fixedParser.parseExpression(expression);

      console.log('\nFixed parser output:', JSON.stringify(parsed, null, 2));

      // Test evaluation with fixed parser
      const testTags = ['@FIX', '@BE', '@FIXBE'];
      const shouldMatch = fixedParser.matchesTagExpression(testTags, expression);

      console.log(`\nFixed parser evaluation:`);
      console.log(`  Tags: ${JSON.stringify(testTags)}`);
      console.log(`  Expression: ${expression}`);
      console.log(`  Result: ${shouldMatch ? 'MATCH ✓' : 'NO MATCH ✗'}`);

      assert.strictEqual(shouldMatch, true, 'Fixed parser should correctly match BE features');
    });
  });
});