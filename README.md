[![npm version](https://badge.fury.io/js/cypress-parallel.svg)](https://badge.fury.io/js/cypress-parallel)

# cypress-parallel

Reduce up to 40% your Cypress suite execution time parallelizing the test run on the same machine.

|                                                          cypress                                                          |                                                      cypress-parallel                                                       |
| :-----------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------: |
| ![cy-serial-small](https://user-images.githubusercontent.com/38537547/114301114-92600a80-9ac3-11eb-9166-e95ae9cd5178.gif) | ![cy-parallel_small](https://user-images.githubusercontent.com/38537547/114301127-9db33600-9ac3-11eb-9bfc-c2096023bba7.gif) |

# Run your Cypress tests in parallel (locally)

## How it works

🔍 - Search for existing Cypress tests\
📄 - Read (if exists) a weight file\
⚖️ - Split spec files into different threads\
⚙️ - For each thread it runs the Cypress command you've passed as argument\
📈 - Wait for all threads to finish and collects the result in a single report

# How to use

## Install

```
npm i cypress-parallel
```

or

```
yarn add cypress-parallel
```

## Add a new script

In your `package.json` add a new script:

```typescript
"scripts" :{
  ...
  "cy:run": "cypress run", // It can be any cypress command with any argument
  "cy:parallel" : "cypress-parallel -s cy:run -t 2 -d <your-cypress-specs-folder> -a '\"<your-cypress-cmd-args>\"'"
  ...
}
```

### With Arguments

Sample:

```
-a '\"--config baseUrl=http://localhost:3000\"'
```

## Launch the new script

```
npm run cy:parallel
```

or 

Run with npx (no package installation needed)

```
npx cy:parallel -s cy:run -t 2 -d <your-cypress-specs-folder> -a '\"<your-cypress-cmd-args>\"'
```

### Scripts options

| Option            | Alias | Description                        | Type   |
| ----------------- | ----- | ---------------------------------- | ------ |
| --help            |       | Show help                          |        |
| --version         |       | Show version number                |        |
| --script          | -s    | Your npm Cypress command           | string |
| --args            | -a    | Your npm Cypress command arguments | string |
| --threads         | -t    | Number of threads                  | number |
| --specsDir        | -d    | Cypress specs directory            | string |
| --weightsJson     | -w    | Parallel weights json file         | string |
| --reporter        | -r    | Reporter to pass to Cypress.       | string |
| --reporterOptions | -o    | Reporter options                   | string |
| --reporterModulePath | -n    | Specify the reporter module path   | string |
| --bail            | -b    | Exit on first failing thread       | string |
| --verbose         | -v    | Some additional logging            | string |
| --strictMode      | -m    | Add stricter checks after running the tests           | boolean |
| --tags         |       | Cucumber tag expression to filter features    | string |
| --tagFilterDebug  |       | Enable verbose logging for tag filtering      | boolean |

**NB**: If you use *cypress-cucumber-preprocesor*, please **disable** the *strictMode* to avoid possible errors:

```typescript
"scripts" :{
  ...
  "cy:parallel" : "cypress-parallel -s cy:run -t 4 -m false"
  ...
}
```

**NB**: If your *cypress-multi-reporters* module is not found on the same level as your Cypress suite (e.g. in a mono-repo) then you can specify the module directory for Cypress to search within.

```typescript
"scripts" :{
  ...
  "cy:parallel" : "cypress-parallel -s cy:run -t 4 -n .../../../node_modules/cypress-multi-reporters"
  ...
}
```

## Tag Filtering (Cucumber Feature Files)

cypress-parallel now supports filtering feature files by Cucumber tags **before** distributing them to threads. This ensures optimal thread utilization when running tagged subsets of your test suite.

### Why Tag Filtering?

Without tag filtering, all feature files are distributed evenly across threads, and then each thread applies tag filtering. This can result in some threads having no tests to run while others are overloaded.

With tag filtering, cypress-parallel:
1. First filters feature files to only those matching your tag expression
2. Then distributes the filtered files across threads
3. Ensures all threads have meaningful work (no idle threads)

### How to Use Tag Filtering

You can specify tags in three ways (in order of precedence):

1. **CLI argument** (highest priority):
```bash
cypress-parallel -s cy:run -t 8 --tags "@BE"
```

2. **Environment variable** (automatically detected):
```bash
# Using TAGS environment variable
TAGS="@BE and not @Deprecated" cypress-parallel -s cy:run -t 8

# Or with cross-env
npx cross-env TAGS="@BE" cypress-parallel -s cy:run -t 8
```

3. **No tags** (runs all tests)

#### Example Tag Expressions

```bash
# Run only backend tests
--tags "@BE"

# Run backend tests but exclude deprecated ones
--tags "@BE and not @Deprecated"

# Run critical tests from either backend or frontend
--tags "(@BE or @FE) and @Critical"

# Complex expression with multiple exclusions
--tags "@BE and not (@Deprecated or @CUTOFF)"
```

### Tag Expression Syntax

The tag filtering supports the following operators:
- `and` - Both conditions must be true
- `or` - At least one condition must be true
- `not` - Negates the condition
- `()` - Grouping for complex expressions

### Example Feature File with Tags

```gherkin
@BE @Critical
Feature: Backend User Management
  Critical backend features for user management

  Scenario: Create new user
    Given I have admin privileges
    When I create a new user account
    Then the user should be created successfully
```

### Debugging Tag Filtering

Use the `--tagFilterDebug` flag for verbose output about tag filtering:

```bash
cypress-parallel -s cy:run -t 8 --tags "@BE" --tagFilterDebug
```

This will show:
- Which files match/don't match the tag expression
- The distribution of filtered files across threads
- Any idle threads (when filtered files < thread count)

### Performance Benefits

When running a subset of tests with tags, the performance improvement can be significant:
- **Without tag filtering**: 8 threads requested, but 4 may be idle = 50% resource waste
- **With tag filtering**: All 8 threads receive work = 100% utilization
- **Result**: 25-35% reduction in total execution time for tagged test runs

# Contributors

Looking for contributors.

# License

MIT
