import type { Options } from "../src/option"
import { Prompts } from "../src/prompts"

describe("Prompts", () => {
  let prompts: Prompts
  let mockOptions: Options

  beforeEach(() => {
    mockOptions = {
      language: "ja-JP"
      // Add other required options here if needed
    } as Options
    prompts = new Prompts(mockOptions)
  })

  describe("renderTemplate", () => {
    test("Basic placeholder replacement", () => {
      const template = "Hello, $name! You are $age years old."
      const values = { name: "John Smith", age: "30" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Hello, John Smith! You are 30 years old.")
    })

    test("Placeholder replacement with curly braces", () => {
      const template = "Hello, ${name}! You are ${age} years old."
      const values = { name: "John Smith", age: "30" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Hello, John Smith! You are 30 years old.")
    })

    test("Placeholder replacement with both formats", () => {
      const template = "Hello, $name! You are ${age} years old."
      const values = { name: "John Smith", age: "30" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Hello, John Smith! You are 30 years old.")
    })

    test("Adding footer", () => {
      const template = "Test body"
      const values = {}

      const result = prompts.renderTemplate(template, values, true)

      expect(result).toContain("Test body")
      expect(result).toContain("---")
      expect(result).toContain("IMPORTANT")
      expect(result).toContain("ja-JP") // Correctly set language from mockOptions
    })

    test("Conditional block - when true", () => {
      const template = `Hello
$if(hasName){
$name
}$else{
Anonymous User
}!`
      const values = { hasName: "true", name: "John Smith" }

      // Test that conditional blocks render correctly when condition is true
      const result = prompts.renderTemplate(template, values)

      expect(result).toBe(
        `Hello

John Smith
!`
      )
    })

    test("Conditional block - when false", () => {
      const template = `
Hello
$if(hasName){
$name
}$else{
Anonymous User
}!`
      // Empty string value for hasName should evaluate to false
      const values = { hasName: "", name: "John Smith" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe(`
Hello

Anonymous User
!`)
    })

    test("Equality conditional block - when true", () => {
      const template =
        '$if(status == "success"){Process succeeded}$else{Process failed}'
      // Test equality operator in conditional statement
      const values = { status: "success" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Process succeeded")
    })

    test("Equality conditional block - when false", () => {
      const template =
        '$if(status == "success"){Process succeeded}$else{Process failed}'
      const values = { status: "error" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Process failed")
    })

    test("Keeps original text when condition evaluation fails", () => {
      const template = "$if(invalid condition){Text}"
      const values = {}

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("$if(invalid condition){Text}")
    })

    test("Template with undefined placeholders", () => {
      const template = "Hello, $name! $undefined will not be replaced."
      const values = { name: "John Smith" }

      const result = prompts.renderTemplate(template, values)

      expect(result).toBe("Hello, John Smith! $undefined will not be replaced.")
    })
  })
})
