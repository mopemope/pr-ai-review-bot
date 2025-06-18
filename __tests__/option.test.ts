import { jest } from "@jest/globals"
import { Options, PathFilter } from "../src/option"

jest.mock("@actions/core")

describe("Options", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("constructor", () => {
    it("should correctly initialize options", () => {
      const options = new Options(
        true,
        false,
        true,
        ["src/**/*.ts", "!src/**/*.test.ts"],
        "system prompt",
        ["gpt-4-1106-preview"],
        ["gpt-3.5-turbo"],
        "3",
        "60000",
        "ja",
        "Please summarize the changes",
        "Release Notes Title",
        true,
        "review policy",
        "default greeting",
        ["keyword1", "keyword2"],
        "",
        ""
      )

      expect(options.debug).toBe(true)
      expect(options.disableReview).toBe(false)
      expect(options.disableReleaseNotes).toBe(true)
      const expectedRules = [
        ["src/**/*.ts", false],
        ["src/**/*.test.ts", true]
      ]
      expect(JSON.parse(options.pathFilters.toString())).toEqual(expectedRules)
      expect(options.systemPrompt).toBe("system prompt")
      expect(options.summaryModel).toStrictEqual(["gpt-4-1106-preview"])
      expect(options.model).toStrictEqual(["gpt-3.5-turbo"])
      expect(options.retries).toBe(3)
      expect(options.timeoutMS).toBe(60000)
      expect(options.language).toBe("ja")
      expect(options.summarizeReleaseNotes).toBe("Please summarize the changes")
      expect(options.reviewPolicy).toBe("review policy")
      expect(options.commentGreeting).toBe("default greeting")
      expect(options.ignoreKeywords).toEqual(["keyword1", "keyword2"])
    })
  })

  describe("checkPath", () => {
    it("should allow paths matching the path filter", () => {
      const options = new Options(
        false,
        false,
        false,
        ["src/**/*.ts", "!src/**/*.test.ts"],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        true,
        "review policy",
        "",
        [],
        undefined,
        ""
      )

      expect(options.checkPath("src/main.ts")).toBe(true)
      expect(options.checkPath("src/utils/helper.ts")).toBe(true)
      expect(options.checkPath("src/main.test.ts")).toBe(false)
      expect(options.checkPath("dist/main.js")).toBe(false)

      // Verify debug was called
      // expect(mockedCore.debug).toHaveBeenCalledTimes(4);
    })
  })

  describe("getFileType", () => {
    let options: Options

    beforeEach(() => {
      options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        ""
      )
    })

    describe("JavaScript/TypeScript files", () => {
      it("should detect JavaScript files", () => {
        expect(options.getFileType("app.js")).toBe("javascript")
        expect(options.getFileType("component.jsx")).toBe("javascript")
        expect(options.getFileType("module.mjs")).toBe("javascript")
        expect(options.getFileType("config.cjs")).toBe("javascript")
      })

      it("should detect TypeScript files", () => {
        expect(options.getFileType("app.ts")).toBe("typescript")
        expect(options.getFileType("component.tsx")).toBe("typescript")
        expect(options.getFileType("types.d.ts")).toBe("typescript")
      })
    })

    describe("Python files", () => {
      it("should detect Python files", () => {
        expect(options.getFileType("main.py")).toBe("python")
        expect(options.getFileType("extension.pyx")).toBe("python")
        expect(options.getFileType("types.pyi")).toBe("python")
        expect(options.getFileType("script.pyw")).toBe("python")
      })

      it("should detect Python project files", () => {
        expect(options.getFileType("requirements.txt")).toBe("python")
        expect(options.getFileType("pyproject.toml")).toBe("python")
      })
    })

    describe("Java/JVM languages", () => {
      it("should detect Java files", () => {
        expect(options.getFileType("Main.java")).toBe("java")
      })

      it("should detect Kotlin files", () => {
        expect(options.getFileType("Main.kt")).toBe("kotlin")
        expect(options.getFileType("build.gradle.kts")).toBe("kotlin")
      })

      it("should detect other JVM languages", () => {
        expect(options.getFileType("App.scala")).toBe("scala")
        expect(options.getFileType("build.groovy")).toBe("groovy")
      })
    })

    describe("C/C++ files", () => {
      it("should detect C files", () => {
        expect(options.getFileType("main.c")).toBe("c")
        expect(options.getFileType("header.h")).toBe("c")
      })

      it("should detect C++ files", () => {
        expect(options.getFileType("main.cpp")).toBe("cpp")
        expect(options.getFileType("main.cxx")).toBe("cpp")
        expect(options.getFileType("main.cc")).toBe("cpp")
        expect(options.getFileType("header.hpp")).toBe("cpp")
        expect(options.getFileType("header.hxx")).toBe("cpp")
        expect(options.getFileType("header.hh")).toBe("cpp")
      })
    })

    describe("Other compiled languages", () => {
      it("should detect various compiled languages", () => {
        expect(options.getFileType("main.go")).toBe("go")
        expect(options.getFileType("main.rs")).toBe("rust")
        expect(options.getFileType("App.swift")).toBe("swift")
        expect(options.getFileType("Program.cs")).toBe("csharp")
        expect(options.getFileType("Program.fs")).toBe("fsharp")
        expect(options.getFileType("Module.vb")).toBe("vb")
      })
    })

    describe("Scripting languages", () => {
      it("should detect scripting languages", () => {
        expect(options.getFileType("index.php")).toBe("php")
        expect(options.getFileType("app.rb")).toBe("ruby")
        expect(options.getFileType("script.pl")).toBe("perl")
        expect(options.getFileType("script.lua")).toBe("lua")
        expect(options.getFileType("analysis.r")).toBe("r")
      })
    })

    describe("Shell scripts", () => {
      it("should detect shell scripts", () => {
        expect(options.getFileType("script.sh")).toBe("shell")
        expect(options.getFileType("script.bash")).toBe("shell")
        expect(options.getFileType("script.zsh")).toBe("shell")
        expect(options.getFileType("script.fish")).toBe("shell")
        expect(options.getFileType("script.ps1")).toBe("powershell")
      })
    })

    describe("Web technologies", () => {
      it("should detect web files", () => {
        expect(options.getFileType("index.html")).toBe("html")
        expect(options.getFileType("page.htm")).toBe("html")
        expect(options.getFileType("styles.css")).toBe("css")
        expect(options.getFileType("styles.scss")).toBe("scss")
        expect(options.getFileType("styles.sass")).toBe("sass")
        expect(options.getFileType("styles.less")).toBe("less")
      })
    })

    describe("Data formats", () => {
      it("should detect data format files", () => {
        expect(options.getFileType("config.json")).toBe("json")
        expect(options.getFileType("data.xml")).toBe("xml")
        expect(options.getFileType("config.yaml")).toBe("yaml")
        expect(options.getFileType("config.yml")).toBe("yaml")
        expect(options.getFileType("config.toml")).toBe("toml")
        expect(options.getFileType("config.ini")).toBe("ini")
        expect(options.getFileType("config.cfg")).toBe("ini")
        expect(options.getFileType("app.conf")).toBe("config")
      })
    })

    describe("Special filename patterns", () => {
      it("should detect Docker files", () => {
        expect(options.getFileType("Dockerfile")).toBe("docker")
        expect(options.getFileType("dockerfile.dev")).toBe("docker")
        expect(options.getFileType("app.dockerfile")).toBe("docker")
      })

      it("should detect Makefile", () => {
        expect(options.getFileType("Makefile")).toBe("makefile")
        expect(options.getFileType("makefile")).toBe("makefile")
      })

      it("should detect package files", () => {
        expect(options.getFileType("package.json")).toBe("json")
        expect(options.getFileType("package-lock.json")).toBe("json")
        expect(options.getFileType("tsconfig.json")).toBe("json")
        expect(options.getFileType("tsconfig.base.json")).toBe("json")
      })

      it("should detect Go module files", () => {
        expect(options.getFileType("go.mod")).toBe("go")
        expect(options.getFileType("go.sum")).toBe("go")
      })

      it("should detect Rust project files", () => {
        expect(options.getFileType("Cargo.toml")).toBe("toml")
        expect(options.getFileType("cargo.lock")).toBe("toml")
      })
    })

    describe("Database files", () => {
      it("should detect SQL files", () => {
        expect(options.getFileType("schema.sql")).toBe("sql")
        expect(options.getFileType("migration.sql")).toBe("sql")
      })
    })

    describe("Documentation files", () => {
      it("should detect documentation files", () => {
        expect(options.getFileType("README.md")).toBe("markdown")
        expect(options.getFileType("docs.markdown")).toBe("markdown")
        expect(options.getFileType("guide.rst")).toBe("rst")
        expect(options.getFileType("paper.tex")).toBe("latex")
      })
    })

    describe("Configuration files", () => {
      it("should detect configuration files", () => {
        expect(options.getFileType(".gitignore")).toBe("gitignore")
        expect(options.getFileType(".env")).toBe("env")
        expect(options.getFileType(".env.local")).toBe("env")
      })
    })

    describe("Unknown file types", () => {
      it("should return 'generic' for unknown file types", () => {
        expect(options.getFileType("unknown.xyz")).toBe("generic")
        expect(options.getFileType("file_without_extension")).toBe("generic")
        expect(options.getFileType("")).toBe("generic")
      })
    })

    describe("Case sensitivity", () => {
      it("should handle case-insensitive extensions", () => {
        expect(options.getFileType("App.JS")).toBe("javascript")
        expect(options.getFileType("Main.PY")).toBe("python")
        expect(options.getFileType("DOCKERFILE")).toBe("docker")
        expect(options.getFileType("MAKEFILE")).toBe("makefile")
      })
    })

    describe("Path handling", () => {
      it("should work with full paths", () => {
        expect(options.getFileType("src/components/App.tsx")).toBe("typescript")
        expect(options.getFileType("/home/user/project/main.py")).toBe("python")
        expect(options.getFileType("./config/database.sql")).toBe("sql")
      })
    })
  })

  describe("getFileTypePrompt", () => {
    it("should return empty string when no file type prompts are configured", () => {
      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        ""
      )

      expect(options.getFileTypePrompt("app.js")).toBe("")
      expect(options.getFileTypePrompt("main.py")).toBe("")
    })

    it("should return the correct prompt for configured file types", () => {
      const fileTypePrompts = `
javascript: |
  Focus on ES6+ best practices and modern JavaScript patterns.
  Check for proper async/await usage and error handling.

python: |
  Focus on PEP8 compliance and Python best practices.
  Check for proper type hints and exception handling.

typescript: Focus on type safety and TypeScript best practices.
`

      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        fileTypePrompts
      )

      const jsPrompt = options.getFileTypePrompt("app.js")
      expect(jsPrompt).toContain("Focus on ES6+ best practices")
      expect(jsPrompt).toContain("Check for proper async/await usage")

      const pyPrompt = options.getFileTypePrompt("main.py")
      expect(pyPrompt).toContain("Focus on PEP8 compliance")
      expect(pyPrompt).toContain("Check for proper type hints")

      const tsPrompt = options.getFileTypePrompt("app.ts")
      expect(tsPrompt).toBe(
        "Focus on type safety and TypeScript best practices."
      )
    })

    it("should return empty string for file types without configured prompts", () => {
      const fileTypePrompts = `
javascript: |
  JavaScript specific prompt
`

      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        fileTypePrompts
      )

      expect(options.getFileTypePrompt("app.js")).toContain(
        "JavaScript specific prompt"
      )
      expect(options.getFileTypePrompt("main.py")).toBe("") // No Python prompt configured
      expect(options.getFileTypePrompt("unknown.xyz")).toBe("") // Generic file type
    })
  })

  describe("parseFileTypePrompts", () => {
    it("should handle empty input", () => {
      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        ""
      )

      expect(options.fileTypePrompts.size).toBe(0)
    })

    it("should parse simple key-value pairs", () => {
      const fileTypePrompts = `
javascript: Focus on modern JavaScript practices
python: Focus on PEP8 compliance
typescript: Focus on type safety
`

      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        fileTypePrompts
      )

      expect(options.fileTypePrompts.get("javascript")).toBe(
        "Focus on modern JavaScript practices"
      )
      expect(options.fileTypePrompts.get("python")).toBe(
        "Focus on PEP8 compliance"
      )
      expect(options.fileTypePrompts.get("typescript")).toBe(
        "Focus on type safety"
      )
    })

    it("should parse multiline values with pipe syntax", () => {
      const fileTypePrompts = `
javascript: |
  Focus on ES6+ best practices and modern JavaScript patterns.
  Check for proper async/await usage and error handling.
  Verify performance optimizations and security considerations.

python: |
  Focus on PEP8 compliance and Python best practices.
  Check for proper type hints and exception handling.
`

      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        fileTypePrompts
      )

      const jsPrompt = options.fileTypePrompts.get("javascript")
      expect(jsPrompt).toContain("Focus on ES6+ best practices")
      expect(jsPrompt).toContain("Check for proper async/await usage")
      expect(jsPrompt).toContain("Verify performance optimizations")

      const pyPrompt = options.fileTypePrompts.get("python")
      expect(pyPrompt).toContain("Focus on PEP8 compliance")
      expect(pyPrompt).toContain("Check for proper type hints")
    })

    it("should handle mixed single-line and multiline values", () => {
      const fileTypePrompts = `
javascript: |
  Multiline JavaScript prompt
  with multiple lines

python: Single line Python prompt

go: |
  Multiline Go prompt
  focusing on performance
`

      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        fileTypePrompts
      )

      expect(options.fileTypePrompts.get("javascript")).toContain(
        "Multiline JavaScript prompt"
      )
      expect(options.fileTypePrompts.get("python")).toBe(
        "Single line Python prompt"
      )
      expect(options.fileTypePrompts.get("go")).toContain("Multiline Go prompt")
    })

    it("should ignore comments and empty lines", () => {
      const fileTypePrompts = `
# This is a comment
javascript: JavaScript prompt

# Another comment
python: |
  Python prompt
  # This is not a comment inside multiline value
  with multiple lines

# Final comment
`

      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        fileTypePrompts
      )

      expect(options.fileTypePrompts.get("javascript")).toBe(
        "JavaScript prompt"
      )
      expect(options.fileTypePrompts.get("python")).toContain(
        "# This is not a comment inside multiline value"
      )
    })

    it("should handle indentation correctly", () => {
      const fileTypePrompts = `
javascript: |
  First line
    Indented line
  Back to normal indent
      More indented line

python: |
\tTab indented line
\t  Mixed tab and space
  Space indented line
`

      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        fileTypePrompts
      )

      const jsPrompt = options.fileTypePrompts.get("javascript")
      expect(jsPrompt).toContain("First line")
      expect(jsPrompt).toContain("  Indented line") // Should preserve relative indentation
      expect(jsPrompt).toContain("    More indented line")

      const pyPrompt = options.fileTypePrompts.get("python")
      expect(pyPrompt).toContain("Tab indented line")
      expect(pyPrompt).toContain("Space indented line")
    })

    it("should handle malformed YAML gracefully", () => {
      const fileTypePrompts = `
javascript: Valid prompt
invalid_key_without_colon
python: |
  Valid multiline
: invalid_key_starting_with_colon
go: Another valid prompt
`

      const options = new Options(
        false,
        false,
        false,
        [],
        "",
        [""],
        [""],
        "0",
        "0",
        "",
        "",
        "",
        false,
        "",
        "",
        [],
        undefined,
        fileTypePrompts
      )

      expect(options.fileTypePrompts.get("javascript")).toBe("Valid prompt")
      expect(options.fileTypePrompts.get("python")).toContain("Valid multiline")
      expect(options.fileTypePrompts.get("go")).toBe("Another valid prompt")
      expect(options.fileTypePrompts.has("invalid_key_without_colon")).toBe(
        false
      )
    })
  })
})

describe("PathFilter", () => {
  describe("constructor", () => {
    it("should use empty array when rules are null", () => {
      const filter = new PathFilter(null)
      expect(filter.toString()).toBe("[]")
    })

    it("should correctly parse provided rules", () => {
      const filter = new PathFilter([
        "src/**/*.ts",
        "!src/**/*.test.ts",
        " !dist/ ", // Rule with whitespace
        "" // Empty rule
      ])

      expect(JSON.parse(filter.toString())).toEqual([
        ["src/**/*.ts", false],
        ["src/**/*.test.ts", true],
        ["dist/", true]
      ])
    })
  })

  describe("check", () => {
    it("should always return true when there are no rules", () => {
      const filter = new PathFilter([])
      expect(filter.check("any/path.ts")).toBe(true)
    })

    it("should return true only for matching paths when only include rules exist", () => {
      const filter = new PathFilter(["src/**/*.ts", "doc/**/*.md"])
      expect(filter.check("src/file.ts")).toBe(true)
      expect(filter.check("doc/readme.md")).toBe(true)
      expect(filter.check("other/file.js")).toBe(false)
    })

    it("should return false for paths matching exclude rules", () => {
      const filter = new PathFilter(["src/**/*.ts", "!src/**/*.test.ts"])
      expect(filter.check("src/file.ts")).toBe(true)
      expect(filter.check("src/file.test.ts")).toBe(false)
    })

    it("should return true only for paths not matching exclude rules when no include rules exist", () => {
      const filter = new PathFilter(["!src/**/*.test.ts"])
      expect(filter.check("src/file.ts")).toBe(true)
      expect(filter.check("src/file.test.ts")).toBe(false)
      expect(filter.check("other/file.js")).toBe(true)
    })
  })
})
