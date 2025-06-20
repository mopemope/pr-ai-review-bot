import type { Hunk } from "./patchParser.js";
export type ChangeFile = {
    filename: string;
    sha: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    url: string;
    patch: string;
    diff: FileDiff[];
    summary: string;
    content: string | undefined;
    detectedPatterns?: DetectedPattern[];
};
export type FileDiff = {
    filename: string;
    index: number;
    from: Hunk;
    to: Hunk;
};
export type PatternType = "security" | "performance" | "quality";
export type SecurityPatternType = "sql_injection_risk" | "xss_risk" | "hardcoded_secrets" | "unsafe_eval" | "path_traversal" | "command_injection" | "weak_crypto" | "insecure_random";
export type PerformancePatternType = "n_plus_one_query" | "memory_leak_risk" | "blocking_operation" | "inefficient_loop" | "large_object_creation" | "unnecessary_computation" | "deep_nesting";
export type DetectedPattern = {
    type: PatternType;
    subType: SecurityPatternType | PerformancePatternType;
    severity: "low" | "medium" | "high" | "critical";
    line: number;
    message: string;
    suggestion?: string;
    codeSnippet: string;
};
export type PatternDetectionResult = {
    filename: string;
    patterns: DetectedPattern[];
    riskLevel: "low" | "medium" | "high" | "critical";
    recommendedFocus: string[];
};
