@BE
Feature: Standard Backend Operations
  As a backend service
  I want to handle regular operations
  So that users can perform daily tasks

  Scenario: Create new user account
    Given I have valid user details
    When I create a new account
    Then the account should be created successfully
    And a welcome email should be sent

  Scenario: Update user profile
    Given an existing user account
    When I update the profile information
    Then the changes should be saved
    And an audit log should be created

  Scenario: Delete inactive account
    Given an account that has been inactive for 90 days
    When I run the cleanup process
    Then the account should be archived
    And storage space should be freed