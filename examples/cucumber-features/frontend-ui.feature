@FE @UI
Feature: Frontend User Interface
  As a frontend application
  I want to provide a smooth user experience
  So that users can interact with the system easily

  Scenario: Display dashboard on login
    Given I am a logged-in user
    When I navigate to the dashboard
    Then I should see my personal widgets
    And the data should be up-to-date

  Scenario: Responsive design on mobile
    Given I access the site on a mobile device
    When I view the main page
    Then the layout should be mobile-optimized
    And all features should be accessible

  Scenario: Dark mode toggle
    Given I am on the settings page
    When I toggle dark mode
    Then the theme should change immediately
    And the preference should be saved