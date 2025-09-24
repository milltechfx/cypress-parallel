@BE @Deprecated
Feature: Deprecated Backend Features
  As a legacy system
  These features are marked for removal
  But still need to work until migration

  Scenario: Legacy authentication
    Given I use the old authentication system
    When I provide legacy credentials
    Then I should be authenticated
    And a deprecation warning should be logged

  Scenario: Old API endpoint
    Given I call the v1 API endpoint
    When I request user data
    Then I should receive a response
    And the response should include a deprecation notice