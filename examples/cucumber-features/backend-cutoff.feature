@BE @CUTOFF
Feature: Backend Features Marked for Cutoff
  As a backend system
  These features are temporarily disabled
  Due to ongoing issues or refactoring

  Scenario: Batch processing job
    Given the batch processor is configured
    When I trigger the batch job
    Then the job should be skipped
    And a cutoff notice should be logged

  Scenario: Advanced analytics endpoint
    Given I request advanced analytics
    When the feature is marked as cutoff
    Then I should receive a service unavailable response
    And the request should be logged for later processing