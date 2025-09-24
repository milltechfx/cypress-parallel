@BE @Critical
Feature: Critical Backend Operations
  As a backend system
  I want to ensure critical operations work correctly
  So that the system remains stable

  Scenario: Process high-priority transaction
    Given I have a high-priority transaction
    When I submit the transaction
    Then the transaction should be processed immediately
    And the system should send confirmation

  Scenario: Handle database failover
    Given the primary database is active
    When the primary database fails
    Then the system should switch to secondary database
    And no data should be lost