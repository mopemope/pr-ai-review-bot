import type { ApiEndpoint } from "./types.js"

/**
 * API-specific review prompt templates
 */
export class ApiPrompts {
  /**
   * Generates API-specific review instructions based on detected endpoints
   */
  static generateApiReviewPrompt(endpoints: ApiEndpoint[]): string {
    if (endpoints.length === 0) return ""

    const sections: string[] = []

    sections.push("## API Endpoint Review Guidelines")
    sections.push("")
    sections.push(
      "The following API endpoints have been detected in this code change. Please pay special attention to these areas:"
    )
    sections.push("")

    // Group endpoints by framework for better organization
    const endpointsByFramework = this.groupEndpointsByFramework(endpoints)

    for (const [framework, frameworkEndpoints] of Object.entries(
      endpointsByFramework
    )) {
      sections.push(`### ${framework} API Endpoints`)
      sections.push("")

      for (const endpoint of frameworkEndpoints) {
        sections.push(
          `**${endpoint.method} ${endpoint.path}** (Line ${endpoint.line})`
        )

        // Security analysis
        const securityIssues = this.analyzeSecurityIssues(endpoint)
        if (securityIssues.length > 0) {
          sections.push("- **Security Review Focus:**")
          securityIssues.forEach((issue) => sections.push(`  - ${issue}`))
        }

        // Performance analysis
        const performanceIssues = this.analyzePerformanceIssues(endpoint)
        if (performanceIssues.length > 0) {
          sections.push("- **Performance Review Focus:**")
          performanceIssues.forEach((issue) => sections.push(`  - ${issue}`))
        }

        sections.push("")
      }
    }

    // Add general API review guidelines
    sections.push("### General API Review Checklist")
    sections.push("")
    sections.push("Please ensure the following aspects are properly addressed:")
    sections.push("")

    sections.push("**Security:**")
    sections.push(
      "- Authentication and authorization mechanisms are properly implemented"
    )
    sections.push("- Input validation is comprehensive and handles edge cases")
    sections.push("- SQL injection and XSS vulnerabilities are prevented")
    sections.push("- Sensitive data is not exposed in responses or logs")
    sections.push("- Rate limiting is implemented to prevent abuse")
    sections.push("- CORS policies are properly configured")
    sections.push("- Error messages don't leak sensitive information")
    sections.push("")

    sections.push("**Performance:**")
    sections.push("- Database queries are optimized and avoid N+1 problems")
    sections.push("- Appropriate caching strategies are implemented")
    sections.push("- Pagination is used for large data sets")
    sections.push("- Asynchronous operations are used where appropriate")
    sections.push("- Resource cleanup is properly handled")
    sections.push("")

    sections.push("**Design & Architecture:**")
    sections.push("- RESTful principles are followed consistently")
    sections.push("- HTTP status codes are used appropriately")
    sections.push("- API versioning strategy is consistent")
    sections.push("- Request/response formats are well-defined")
    sections.push("- Error handling is comprehensive and user-friendly")
    sections.push("- Logging and monitoring are adequate")
    sections.push("")

    sections.push("**Testing:**")
    sections.push("- Unit tests cover both success and failure scenarios")
    sections.push("- Integration tests validate API contracts")
    sections.push("- Security tests verify authentication and authorization")
    sections.push("- Performance tests ensure acceptable response times")
    sections.push("")

    return sections.join("\n")
  }

  /**
   * Groups endpoints by framework for better organization
   */
  private static groupEndpointsByFramework(
    endpoints: ApiEndpoint[]
  ): Record<string, ApiEndpoint[]> {
    const grouped: Record<string, ApiEndpoint[]> = {}

    for (const endpoint of endpoints) {
      if (!grouped[endpoint.framework]) {
        grouped[endpoint.framework] = []
      }
      grouped[endpoint.framework].push(endpoint)
    }

    return grouped
  }

  /**
   * Analyzes security issues for a specific endpoint
   */
  private static analyzeSecurityIssues(endpoint: ApiEndpoint): string[] {
    const issues: string[] = []

    if (!endpoint.hasAuthentication) {
      issues.push(
        "⚠️ **Authentication Missing**: Verify if this endpoint should be protected by authentication"
      )
    }

    if (!endpoint.hasValidation) {
      issues.push(
        "⚠️ **Input Validation Missing**: Ensure all input parameters are properly validated and sanitized"
      )
    }

    if (!endpoint.hasRateLimit) {
      issues.push(
        "⚠️ **Rate Limiting Missing**: Consider implementing rate limiting to prevent abuse"
      )
    }

    // Add specific security concerns detected
    endpoint.securityConcerns.forEach((concern) => {
      issues.push(
        `🚨 **${concern}**: Review and fix this security vulnerability`
      )
    })

    // Method-specific security considerations
    if (
      endpoint.method === "POST" ||
      endpoint.method === "PUT" ||
      endpoint.method === "PATCH"
    ) {
      issues.push(
        "🔍 **Data Modification**: Verify CSRF protection and data integrity checks"
      )
    }

    if (endpoint.method === "DELETE") {
      issues.push(
        "🔍 **Data Deletion**: Ensure proper authorization and consider soft delete patterns"
      )
    }

    return issues
  }

  /**
   * Analyzes performance issues for a specific endpoint
   */
  private static analyzePerformanceIssues(endpoint: ApiEndpoint): string[] {
    const issues: string[] = []

    // Add specific performance concerns detected
    endpoint.performanceConcerns.forEach((concern) => {
      issues.push(`⚠️ **${concern}**: Optimize this performance bottleneck`)
    })

    // Method-specific performance considerations
    if (endpoint.method === "GET") {
      issues.push(
        "🔍 **Caching Strategy**: Consider implementing appropriate caching mechanisms"
      )
      issues.push(
        "🔍 **Query Optimization**: Ensure database queries are efficient and use proper indexing"
      )
    }

    if (endpoint.method === "POST" || endpoint.method === "PUT") {
      issues.push(
        "🔍 **Bulk Operations**: Consider batch processing for multiple items"
      )
      issues.push(
        "🔍 **Async Processing**: Evaluate if long-running operations should be asynchronous"
      )
    }

    // Path-specific considerations
    if (endpoint.path.includes("/:id") || endpoint.path.includes("{id}")) {
      issues.push(
        "🔍 **Single Resource**: Verify efficient single-item retrieval patterns"
      )
    }

    if (endpoint.path.includes("/list") || endpoint.path.includes("/search")) {
      issues.push(
        "🔍 **Collection Endpoint**: Ensure proper pagination and filtering capabilities"
      )
    }

    return issues
  }

  /**
   * Generates framework-specific review guidelines
   */
  static generateFrameworkSpecificGuidelines(framework: string): string {
    const guidelines: Record<string, string[]> = {
      Express: [
        "Verify middleware order and error handling",
        "Check for proper use of express-validator or similar validation libraries",
        "Ensure helmet.js or similar security middleware is used",
        "Verify CORS configuration is appropriate",
        "Check for proper async/await error handling"
      ],
      FastAPI: [
        "Verify Pydantic models are used for request/response validation",
        "Check dependency injection is used properly for authentication",
        "Ensure proper use of HTTPException for error responses",
        "Verify async/await is used consistently",
        "Check OpenAPI documentation is accurate"
      ],
      Spring: [
        "Verify @Valid annotations are used for request validation",
        "Check Spring Security configuration is appropriate",
        "Ensure proper exception handling with @ControllerAdvice",
        "Verify transaction management is correct",
        "Check for proper use of DTOs and entity mapping"
      ],
      Go: [
        "Verify proper error handling and HTTP status codes",
        "Check for goroutine leaks in concurrent operations",
        "Ensure proper context usage for request cancellation",
        "Verify middleware chain is correctly implemented",
        "Check for proper JSON marshaling/unmarshaling"
      ]
    }

    const frameworkGuidelines = guidelines[framework]
    if (!frameworkGuidelines) return ""

    const sections: string[] = []
    sections.push(`### ${framework}-Specific Review Guidelines`)
    sections.push("")
    frameworkGuidelines.forEach((guideline) => {
      sections.push(`- ${guideline}`)
    })
    sections.push("")

    return sections.join("\n")
  }
}
