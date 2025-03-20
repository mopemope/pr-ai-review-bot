export declare class Options {
    debug: boolean;
    disableReview: boolean;
    disableReleaseNotes: boolean;
    pathFilters: PathFilter;
    systemPrompt: string;
    summaryModel: string[];
    model: string[];
    retries: number;
    timeoutMS: number;
    language: string;
    summarizeReleaseNotes: string;
    releaseNotesTitle: string;
    useFileContent: boolean;
    localAction: boolean;
    reviewPolicy: string;
    commentGreeting: string;
    ignoreKeywords: string[];
    baseURL: string | undefined;
    constructor(debug: boolean, disableReview: boolean, disableReleaseNotes: boolean, pathFilters: string[] | null, systemPrompt: string, summaryModel: string[], model: string[], retries: string, timeoutMS: string, language: string, summarizeReleaseNotes: string, releaseNotesTitle: string, useFileContent: boolean, reviewPolicy: string, commentGreeting: string, ignoreKeywords: string[], baseURL: string | undefined);
    /**
     * Prints all configuration options using core.info for debugging purposes.
     * Displays each option value in the GitHub Actions log.
     */
    print(): void;
    /**
     * Checks if a file path should be included based on configured path filters.
     * Logs the result of the check for debugging purposes.
     *
     * @param path - The file path to check against filters
     * @returns Boolean indicating whether the path should be included
     */
    checkPath(path: string): boolean;
    /**
     * Checks if any of the configured ignore keywords are present in the description.
     *
     * @param description - The text to check for ignore keywords
     * @returns Boolean indicating whether any ignore keywords were found
     */
    includeIgnoreKeywords(description: string): boolean;
}
export declare class PathFilter {
    private readonly rules;
    toString(): string;
    /**
     * Creates a new PathFilter instance with inclusion and exclusion rules.
     * Rules starting with "!" are treated as exclusion rules.
     *
     * @param rules - Array of glob patterns for path filtering, null for no filtering
     */
    constructor(rules?: string[] | null);
    /**
     * Checks if a path matches the filter rules.
     * A path is considered valid if:
     * 1. No inclusion rules exist OR the path matches at least one inclusion rule
     * 2. AND the path doesn't match any exclusion rules
     *
     * @param path - The file path to check against the rules
     * @returns Boolean indicating whether the path passes the filter
     */
    check(path: string): boolean;
}
