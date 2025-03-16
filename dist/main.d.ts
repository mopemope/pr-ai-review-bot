/**
 * The main function for the action.
 * This function orchestrates the entire PR review process:
 * 1. Gets the options from inputs
 * 2. Creates prompt templates
 * 3. Retrieves the PR context
 * 4. Initializes the GitHub client
 * 5. Creates a reviewer instance
 * 6. Fetches changed files in the PR
 * 7. Generates a summary of changes if enabled
 * 8. Reviews code changes and posts comments if review is not disabled
 * 9. Posts a summary of the PR to the pull request
 *
 * @returns {Promise<void>} Resolves when the action is complete
 * @throws {Error} If any part of the process fails
 */
export declare function run(): Promise<void>;
