import { debug } from "@actions/core"
import { ApiDetector } from "./apiDetector.js"
import type {
  ApiEndpoint,
  ChangeFile,
  DetectedPattern,
  PatternDetectionResult,
  SecurityPatternType,
  PerformancePatternType
} from "./types.js"

/**
 * Pattern definition for security risks
 */
interface SecurityPattern {
  pattern: RegExp
  severity: "low" | "medium" | "high" | "critical"
  message: string
  suggestion?: string
}

/**
 * Pattern definition for performance risks
 */
interface PerformancePattern {
  pattern: RegExp
  severity: "low" | "medium" | "high" | "critical"
  message: string
  suggestion?: string
}

/**
 * Security patterns for various programming languages
 */
const SECURITY_PATTERNS: Record<SecurityPatternType, SecurityPattern> = {
  sql_injection_risk: {
    pattern:
      /(?:query|execute|exec)\s*\(\s*[`"'].*?\$\{.*?\}.*?[`"']|(?:query|execute|exec)\s*\(\s*.*?\+.*?\)|`SELECT.*?\$\{.*?\}`|"SELECT.*?\$\{.*?\}"/gi,
    severity: "critical",
    message: "Potential SQL injection vulnerability detected",
    suggestion:
      "Use parameterized queries or prepared statements instead of string concatenation"
  },
  xss_risk: {
    pattern:
      /innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\(|eval\s*\(/gi,
    severity: "high",
    message: "Potential XSS vulnerability detected",
    suggestion: "Use safe DOM manipulation methods or sanitize user input"
  },
  hardcoded_secrets: {
    pattern:
      /(?:password|secret|key|token|api_key|apikey)\s*[:=]\s*[`"'][^`"'\s]{8,}[`"']/gi,
    severity: "critical",
    message: "Hardcoded secret or credential detected",
    suggestion:
      "Use environment variables or secure credential management systems"
  },
  unsafe_eval: {
    pattern:
      /\beval\s*\(|Function\s*\(|setTimeout\s*\(\s*[`"']|setInterval\s*\(\s*[`"']/gi,
    severity: "high",
    message: "Unsafe code execution detected",
    suggestion: "Avoid eval() and similar functions that execute arbitrary code"
  },
  path_traversal: {
    pattern: /\.\.\/|\.\.\\|path\.join\s*\([^)]*\.\./gi,
    severity: "high",
    message: "Potential path traversal vulnerability detected",
    suggestion:
      "Validate and sanitize file paths, use path.resolve() with proper validation"
  },
  command_injection: {
    pattern: /exec\s*\(|spawn\s*\(|system\s*\(|shell_exec\s*\(/gi,
    severity: "critical",
    message: "Potential command injection vulnerability detected",
    suggestion:
      "Use safe alternatives and validate all user inputs before executing commands"
  },
  weak_crypto: {
    pattern: /md5|sha1(?![\d])|des(?!cribe|troy)|rc4/gi,
    severity: "medium",
    message: "Weak cryptographic algorithm detected",
    suggestion:
      "Use strong cryptographic algorithms like SHA-256, AES, or bcrypt"
  },
  insecure_random: {
    pattern: /Math\.random\(\)|rand\(\)|random\.choice/gi,
    severity: "medium",
    message: "Insecure random number generation detected",
    suggestion:
      "Use cryptographically secure random number generators for security-sensitive operations"
  }
}

/**
 * Performance patterns for various scenarios
 */
const PERFORMANCE_PATTERNS: Record<PerformancePatternType, PerformancePattern> =
  {
    n_plus_one_query: {
      pattern:
        /for\s*\([^)]*\)\s*\{[^}]*(?:query|find|get|fetch)[^}]*\}|forEach\s*\([^)]*\)\s*\{[^}]*(?:query|find|get|fetch)[^}]*\}/gi,
      severity: "high",
      message: "Potential N+1 query problem detected",
      suggestion:
        "Consider using batch queries, joins, or eager loading to reduce database calls"
    },
    memory_leak_risk: {
      pattern:
        /addEventListener\s*\([^)]*\)(?![^{]*removeEventListener)|setInterval\s*\([^)]*\)(?![^{]*clearInterval)|setTimeout.*(?![^{]*clearTimeout)/gi,
      severity: "medium",
      message: "Potential memory leak detected",
      suggestion:
        "Ensure proper cleanup of event listeners, intervals, and timeouts"
    },
    blocking_operation: {
      pattern:
        /fs\.readFileSync|fs\.writeFileSync|\.sync\(\)|sleep\s*\(|Thread\.sleep/gi,
      severity: "medium",
      message: "Blocking synchronous operation detected",
      suggestion:
        "Use asynchronous alternatives to avoid blocking the event loop"
    },
    inefficient_loop: {
      pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{[^}]*for\s*\(/gi,
      severity: "medium",
      message: "Deeply nested loops detected",
      suggestion:
        "Consider optimizing algorithm complexity or using more efficient data structures"
    },
    large_object_creation: {
      pattern:
        /new\s+Array\s*\(\s*\d{4,}\s*\)|new\s+Buffer\s*\(\s*\d{4,}\s*\)/gi,
      severity: "low",
      message: "Large object creation detected",
      suggestion: "Consider streaming or chunked processing for large data sets"
    },
    unnecessary_computation: {
      pattern:
        /for\s*\([^)]*\)\s*\{[^}]*(?:Math\.|JSON\.parse|JSON\.stringify)[^}]*\}/gi,
      severity: "low",
      message: "Potentially expensive computation in loop detected",
      suggestion: "Move expensive computations outside of loops when possible"
    },
    deep_nesting: {
      pattern: /\{\s*[^}]*\{\s*[^}]*\{\s*[^}]*\{\s*[^}]*\{/gi,
      severity: "low",
      message: "Deep nesting detected",
      suggestion:
        "Consider refactoring to reduce complexity and improve readability"
    }
  }

/**
 * Pattern detector class for analyzing code changes
 */
export class PatternDetector {
  private apiDetector: ApiDetector

  constructor() {
    this.apiDetector = new ApiDetector()
  }
  /**
   * Detects security and performance patterns in a changed file
   * @param change - The changed file to analyze
   * @returns Pattern detection result
   */
  detectPatterns(change: ChangeFile): PatternDetectionResult {
    const patterns: DetectedPattern[] = []

    // Analyze the patch content for patterns
    const content = change.patch || change.content || ""
    const lines = content.split("\n")

    // Detect security patterns
    for (const [subType, pattern] of Object.entries(SECURITY_PATTERNS)) {
      const detectedPatterns = this.detectPatternInContent(
        content,
        lines,
        pattern,
        "security",
        subType as SecurityPatternType
      )
      patterns.push(...detectedPatterns)
    }

    // Detect performance patterns
    for (const [subType, pattern] of Object.entries(PERFORMANCE_PATTERNS)) {
      const detectedPatterns = this.detectPatternInContent(
        content,
        lines,
        pattern,
        "performance",
        subType as PerformancePatternType
      )
      patterns.push(...detectedPatterns)
    }

    // Detect API endpoints
    const apiResult = this.apiDetector.detectApiEndpoints(change)
    change.apiEndpoints = apiResult.endpoints

    // Calculate overall risk level
    const riskLevel = this.calculateRiskLevel(patterns)

    // Generate recommended focus areas
    const recommendedFocus = this.generateRecommendedFocus(
      patterns,
      apiResult.endpoints
    )

    debug(
      `Pattern detection for ${change.filename}: ${patterns.length} patterns found, risk level: ${riskLevel}`
    )

    return {
      filename: change.filename,
      patterns,
      riskLevel,
      recommendedFocus
    }
  }

  /**
   * Detects a specific pattern in content
   */
  private detectPatternInContent(
    content: string,
    lines: string[],
    patternDef: SecurityPattern | PerformancePattern,
    type: "security" | "performance",
    subType: SecurityPatternType | PerformancePatternType
  ): DetectedPattern[] {
    const detected: DetectedPattern[] = []
    const matches = content.matchAll(patternDef.pattern)

    for (const match of matches) {
      if (match.index !== undefined) {
        // Find the line number
        const beforeMatch = content.substring(0, match.index)
        const lineNumber = beforeMatch.split("\n").length

        // Get the code snippet (the matched line)
        const codeSnippet = lines[lineNumber - 1] || match[0]

        detected.push({
          type,
          subType,
          severity: patternDef.severity,
          line: lineNumber,
          message: patternDef.message,
          suggestion: patternDef.suggestion,
          codeSnippet: codeSnippet.trim()
        })
      }
    }

    return detected
  }

  /**
   * Calculates overall risk level based on detected patterns
   */
  private calculateRiskLevel(
    patterns: DetectedPattern[]
  ): "low" | "medium" | "high" | "critical" {
    if (patterns.length === 0) return "low"

    const hasCritical = patterns.some((p) => p.severity === "critical")
    const hasHigh = patterns.some((p) => p.severity === "high")
    const hasMedium = patterns.some((p) => p.severity === "medium")

    if (hasCritical) return "critical"
    if (hasHigh) return "high"
    if (hasMedium) return "medium"
    return "low"
  }

  /**
   * Generates recommended focus areas based on detected patterns
   */
  private generateRecommendedFocus(
    patterns: DetectedPattern[],
    apiEndpoints?: ApiEndpoint[]
  ): string[] {
    const focus: Set<string> = new Set()

    for (const pattern of patterns) {
      if (pattern.type === "security") {
        focus.add("Security vulnerabilities and input validation")
        if (pattern.subType === "sql_injection_risk") {
          focus.add("Database query security and parameterization")
        }
        if (pattern.subType === "xss_risk") {
          focus.add("Cross-site scripting prevention and output encoding")
        }
        if (pattern.subType === "hardcoded_secrets") {
          focus.add("Credential management and environment variables")
        }
      }

      if (pattern.type === "performance") {
        focus.add("Performance optimization and efficiency")
        if (pattern.subType === "n_plus_one_query") {
          focus.add("Database query optimization and batch processing")
        }
        if (pattern.subType === "memory_leak_risk") {
          focus.add("Memory management and resource cleanup")
        }
        if (pattern.subType === "blocking_operation") {
          focus.add("Asynchronous programming and non-blocking operations")
        }
      }
    }

    // Add API-specific focus areas
    if (apiEndpoints && apiEndpoints.length > 0) {
      focus.add("API endpoint security and best practices")

      const hasUnauthenticatedEndpoints = apiEndpoints.some(
        (ep) => !ep.hasAuthentication
      )
      const hasUnvalidatedEndpoints = apiEndpoints.some(
        (ep) => !ep.hasValidation
      )
      const hasNoRateLimit = apiEndpoints.some((ep) => !ep.hasRateLimit)

      if (hasUnauthenticatedEndpoints) {
        focus.add("API authentication and authorization")
      }
      if (hasUnvalidatedEndpoints) {
        focus.add("Input validation and sanitization")
      }
      if (hasNoRateLimit) {
        focus.add("Rate limiting and DDoS protection")
      }

      // Add concerns from API analysis
      for (const endpoint of apiEndpoints) {
        if (endpoint.securityConcerns.length > 0) {
          focus.add("API security vulnerabilities")
        }
        if (endpoint.performanceConcerns.length > 0) {
          focus.add("API performance optimization")
        }
      }
    }

    return Array.from(focus)
  }

  /**
   * Formats detected patterns for display in review comments
   */
  formatPatternsForReview(patterns: DetectedPattern[]): string {
    if (patterns.length === 0) return ""

    const sections: string[] = []

    // Group patterns by type
    const securityPatterns = patterns.filter((p) => p.type === "security")
    const performancePatterns = patterns.filter((p) => p.type === "performance")

    if (securityPatterns.length > 0) {
      sections.push("**Security Concerns:**")
      for (const pattern of securityPatterns) {
        sections.push(
          `- ${pattern.message} (Line ${pattern.line}, Severity: ${pattern.severity})`
        )
        if (pattern.suggestion) {
          sections.push(`  - Suggestion: ${pattern.suggestion}`)
        }
      }
    }

    if (performancePatterns.length > 0) {
      sections.push("**Performance Concerns:**")
      for (const pattern of performancePatterns) {
        sections.push(
          `- ${pattern.message} (Line ${pattern.line}, Severity: ${pattern.severity})`
        )
        if (pattern.suggestion) {
          sections.push(`  - Suggestion: ${pattern.suggestion}`)
        }
      }
    }

    return sections.join("\n")
  }
}
