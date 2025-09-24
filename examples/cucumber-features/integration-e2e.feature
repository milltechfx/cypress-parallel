@E2E @Integration
Feature: End-to-End Integration Tests
  As a full system
  I want to test complete user journeys
  So that all components work together

  Scenario: Complete purchase flow
    Given I am on the product page
    When I add an item to cart
    And I proceed to checkout
    And I enter payment details
    Then the order should be confirmed
    And I should receive an email receipt

  Scenario: User registration and first login
    Given I am on the registration page
    When I complete the registration form
    And I verify my email
    And I log in for the first time
    Then I should see the onboarding tutorial
    And my account should be fully activated