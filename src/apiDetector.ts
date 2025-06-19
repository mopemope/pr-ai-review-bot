import { debug } from "@actions/core"
import type {
  ApiDetectionResult,
  ApiEndpoint,
  ChangeFile,
  HttpMethod
} from "./types.js"

/**
 * Framework-specific API endpoint patterns
 */
interface FrameworkPattern {
  name: string
  routePatterns: RegExp[]
  middlewarePatterns: {
    auth: RegExp[]
    validation: RegExp[]
    rateLimit: RegExp[]
  }
}

/**
 * Supported web frameworks and their patterns
 */
const FRAMEWORK_PATTERNS: FrameworkPattern[] = [
  // Express.js
  {
    name: "Express",
    routePatterns: [
      /(?:app|router)\.(get|post|put|delete|patch|head|options)\s*\(\s*[`"']([^`"']+)[`"']/gi,
      /@(Get|Post|Put|Delete|Patch|Head|Options)\s*\(\s*[`"']([^`"']+)[`"']/gi
    ],
    middlewarePatterns: {
      auth: [
        /passport\./gi,
        /jwt\./gi,
        /authenticate/gi,
        /requireAuth/gi,
        /isAuthenticated/gi,
        /verifyToken/gi
      ],
      validation: [
        /express-validator/gi,
        /joi\./gi,
        /yup\./gi,
        /validate/gi,
        /check\(/gi,
        /body\(/gi,
        /param\(/gi,
        /query\(/gi
      ],
      rateLimit: [
        /express-rate-limit/gi,
        /rateLimit/gi,
        /slowDown/gi,
        /limiter/gi
      ]
    }
  },
  // FastAPI
  {
    name: "FastAPI",
    routePatterns: [
      /@(?:app|router)\.(get|post|put|delete|patch|head|options)\s*\(\s*[`"']([^`"']+)[`"']/gi
    ],
    middlewarePatterns: {
      auth: [
        /Depends\(/gi,
        /HTTPBearer/gi,
        /OAuth2/gi,
        /get_current_user/gi,
        /verify_token/gi
      ],
      validation: [/BaseModel/gi, /Field\(/gi, /validator/gi, /pydantic/gi],
      rateLimit: [/slowapi/gi, /limiter/gi, /RateLimiter/gi]
    }
  },
  // Spring Boot
  {
    name: "Spring",
    routePatterns: [
      /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\s*\(\s*[`"']([^`"']+)[`"']/gi,
      /@RequestMapping\s*\([^)]*value\s*=\s*[`"']([^`"']+)[`"']/gi
    ],
    middlewarePatterns: {
      auth: [
        /@PreAuthorize/gi,
        /@Secured/gi,
        /@RolesAllowed/gi,
        /SecurityConfig/gi,
        /JwtAuthenticationFilter/gi
      ],
      validation: [
        /@Valid/gi,
        /@Validated/gi,
        /@NotNull/gi,
        /@NotEmpty/gi,
        /@Size/gi,
        /@Pattern/gi
      ],
      rateLimit: [/@RateLimiter/gi, /RateLimitingFilter/gi, /Bucket4j/gi]
    }
  },
  // Go frameworks (Gin, Echo, etc.)
  {
    name: "Go",
    routePatterns: [
      /\w+\.(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(\s*[`"']([^`"']+)[`"']/gi,
      /HandleFunc\s*\(\s*[`"']([^`"']+)[`"']/gi,
      /Handle\s*\(\s*[`"']([^`"']+)[`"']/gi
    ],
    middlewarePatterns: {
      auth: [
        /jwt\./gi,
        /AuthRequired/gi,
        /RequireAuth/gi,
        /VerifyToken/gi,
        /middleware\.Auth/gi
      ],
      validation: [/validator\./gi, /Validate/gi, /ShouldBind/gi, /BindJSON/gi],
      rateLimit: [/rate\.Limiter/gi, /RateLimit/gi, /throttle/gi]
    }
  }
]

/**
 * Security concern patterns to detect in API endpoints
 */
const SECURITY_CONCERN_PATTERNS = {
  noAuth: /(?!.*(?:auth|jwt|token|login|verify|secure|protect))/gi,
  sqlInjection:
    /(?:query|execute|exec)\s*\(\s*[`"'].*?\$\{.*?\}.*?[`"']|(?:query|execute|exec)\s*\(\s*.*?\+.*?\)/gi,
  xss: /innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\(/gi,
  noValidation: /(?!.*(?:validate|check|sanitize|filter|clean))/gi,
  hardcodedSecrets:
    /(?:password|secret|key|token|api_key|apikey)\s*[:=]\s*[`"'][^`"'\s]{8,}[`"']/gi,
  unsafeDeserialization: /JSON\.parse\s*\(|pickle\.loads|unserialize\s*\(/gi
}

/**
 * Performance concern patterns to detect in API endpoints
 */
const PERFORMANCE_CONCERN_PATTERNS = {
  nPlusOne:
    /for\s*\([^)]*\)\s*\{[^}]*(?:query|find|get|fetch)[^}]*\}|forEach\s*\([^)]*\)\s*\{[^}]*(?:query|find|get|fetch)[^}]*\}/gi,
  blockingOps: /fs\.readFileSync|fs\.writeFileSync|\.sync\(\)|sleep\s*\(/gi,
  noCache: /(?!.*(?:cache|redis|memcache|memoize))/gi,
  largePagination:
    /limit\s*[:=]\s*(?:[5-9]\d{2,}|\d{4,})|pageSize\s*[:=]\s*(?:[5-9]\d{2,}|\d{4,})/gi,
  inefficientQuery: /SELECT\s+\*\s+FROM|\.findAll\(\)|\.all\(\)/gi
}

/**
 * API endpoint detector class
 */
export class ApiDetector {
  /**
   * Detects API endpoints in a changed file
   * @param change - The changed file to analyze
   * @returns API detection result
   */
  detectApiEndpoints(change: ChangeFile): ApiDetectionResult {
    const content = change.patch || change.content || ""
    const lines = content.split("\n")

    const result: ApiDetectionResult = {
      filename: change.filename,
      endpoints: [],
      framework: null,
      hasSecurityMiddleware: false,
      hasValidationMiddleware: false
    }

    // Detect framework
    const detectedFramework = this.detectFramework(content)
    if (!detectedFramework) {
      return result
    }

    result.framework = detectedFramework.name

    // Detect middleware
    result.hasSecurityMiddleware = this.hasMiddleware(
      content,
      detectedFramework.middlewarePatterns.auth
    )
    result.hasValidationMiddleware = this.hasMiddleware(
      content,
      detectedFramework.middlewarePatterns.validation
    )

    // Detect API endpoints
    result.endpoints = this.extractEndpoints(content, lines, detectedFramework)

    debug(
      `API detection for ${change.filename}: ${result.endpoints.length} endpoints found, framework: ${result.framework}`
    )

    return result
  }

  /**
   * Detects the web framework used in the code
   */
  private detectFramework(content: string): FrameworkPattern | null {
    for (const framework of FRAMEWORK_PATTERNS) {
      for (const pattern of framework.routePatterns) {
        if (pattern.test(content)) {
          return framework
        }
      }
    }
    return null
  }

  /**
   * Checks if middleware patterns are present in the code
   */
  private hasMiddleware(content: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(content))
  }

  /**
   * Extracts API endpoints from the code content
   */
  private extractEndpoints(
    content: string,
    lines: string[],
    framework: FrameworkPattern
  ): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = []

    for (const routePattern of framework.routePatterns) {
      const matches = content.matchAll(routePattern)

      for (const match of matches) {
        if (match.index !== undefined && match[1] && match[2]) {
          let method: string
          let path: string

          // Handle Spring Boot mapping annotations
          if (framework.name === "Spring") {
            const mappingType = match[1]
            path = match[2]

            // Convert Spring mapping annotations to HTTP methods
            switch (mappingType.toLowerCase()) {
              case "getmapping":
                method = "GET"
                break
              case "postmapping":
                method = "POST"
                break
              case "putmapping":
                method = "PUT"
                break
              case "deletemapping":
                method = "DELETE"
                break
              case "patchmapping":
                method = "PATCH"
                break
              default:
                method = "GET" // Default for RequestMapping
            }
          } else {
            method = match[1].toUpperCase()
            path = match[2]
          }

          // Find line number
          const beforeMatch = content.substring(0, match.index)
          const lineNumber = beforeMatch.split("\n").length

          // Analyze the endpoint context
          const contextStart = Math.max(0, lineNumber - 5)
          const contextEnd = Math.min(lines.length, lineNumber + 5)
          const contextLines = lines.slice(contextStart, contextEnd).join("\n")

          const endpoint: ApiEndpoint = {
            method: method as HttpMethod,
            path,
            line: lineNumber,
            framework: framework.name,
            hasAuthentication: this.hasMiddleware(
              contextLines,
              framework.middlewarePatterns.auth
            ),
            hasValidation: this.hasMiddleware(
              contextLines,
              framework.middlewarePatterns.validation
            ),
            hasRateLimit: this.hasMiddleware(
              contextLines,
              framework.middlewarePatterns.rateLimit
            ),
            securityConcerns: this.detectSecurityConcerns(contextLines),
            performanceConcerns: this.detectPerformanceConcerns(contextLines)
          }

          endpoints.push(endpoint)
        }
      }
    }

    return endpoints
  }

  /**
   * Detects security concerns in the endpoint context
   */
  private detectSecurityConcerns(context: string): string[] {
    const concerns: string[] = []

    if (SECURITY_CONCERN_PATTERNS.sqlInjection.test(context)) {
      concerns.push("Potential SQL injection vulnerability")
    }
    if (SECURITY_CONCERN_PATTERNS.xss.test(context)) {
      concerns.push("Potential XSS vulnerability")
    }
    if (SECURITY_CONCERN_PATTERNS.hardcodedSecrets.test(context)) {
      concerns.push("Hardcoded secrets detected")
    }
    if (SECURITY_CONCERN_PATTERNS.unsafeDeserialization.test(context)) {
      concerns.push("Unsafe deserialization detected")
    }

    return concerns
  }

  /**
   * Detects performance concerns in the endpoint context
   */
  private detectPerformanceConcerns(context: string): string[] {
    const concerns: string[] = []

    if (PERFORMANCE_CONCERN_PATTERNS.nPlusOne.test(context)) {
      concerns.push("Potential N+1 query problem")
    }
    if (PERFORMANCE_CONCERN_PATTERNS.blockingOps.test(context)) {
      concerns.push("Blocking operations detected")
    }
    if (PERFORMANCE_CONCERN_PATTERNS.largePagination.test(context)) {
      concerns.push("Large pagination limit detected")
    }
    if (PERFORMANCE_CONCERN_PATTERNS.inefficientQuery.test(context)) {
      concerns.push("Inefficient database query detected")
    }

    return concerns
  }

  /**
   * Formats API endpoints for display in review comments
   */
  formatApiEndpointsForReview(endpoints: ApiEndpoint[]): string {
    if (endpoints.length === 0) return ""

    const sections: string[] = []
    sections.push("**API Endpoints Detected:**")

    for (const endpoint of endpoints) {
      sections.push(
        `\n**${endpoint.method} ${endpoint.path}** (Line ${endpoint.line})`
      )
      sections.push(`- Framework: ${endpoint.framework}`)

      // Security status
      const securityStatus = []
      if (endpoint.hasAuthentication) securityStatus.push("✅ Authentication")
      else securityStatus.push("❌ No Authentication")

      if (endpoint.hasValidation) securityStatus.push("✅ Validation")
      else securityStatus.push("❌ No Validation")

      if (endpoint.hasRateLimit) securityStatus.push("✅ Rate Limiting")
      else securityStatus.push("❌ No Rate Limiting")

      sections.push(`- Security: ${securityStatus.join(", ")}`)

      // Security concerns
      if (endpoint.securityConcerns.length > 0) {
        sections.push("- **Security Issues:**")
        for (const concern of endpoint.securityConcerns) {
          sections.push(`  - ⚠️ ${concern}`)
        }
      }

      // Performance concerns
      if (endpoint.performanceConcerns.length > 0) {
        sections.push("- **Performance Issues:**")
        for (const concern of endpoint.performanceConcerns) {
          sections.push(`  - ⚠️ ${concern}`)
        }
      }
    }

    return sections.join("\n")
  }
}
