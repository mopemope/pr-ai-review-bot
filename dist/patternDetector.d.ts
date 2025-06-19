import type { ChangeFile, DetectedPattern, PatternDetectionResult } from "./types.js";
/**
 * Pattern detector class for analyzing code changes
 */
export declare class PatternDetector {
    /**
     * Detects security and performance patterns in a changed file
     * @param change - The changed file to analyze
     * @returns Pattern detection result
     */
    detectPatterns(change: ChangeFile): PatternDetectionResult;
    /**
     * Detects a specific pattern in content
     */
    private detectPatternInContent;
    /**
     * Calculates overall risk level based on detected patterns
     */
    private calculateRiskLevel;
    /**
     * Generates recommended focus areas based on detected patterns
     */
    private generateRecommendedFocus;
    /**
     * Formats detected patterns for display in review comments
     */
    formatPatternsForReview(patterns: DetectedPattern[]): string;
}
