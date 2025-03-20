import { parsePatch } from "../src/patchParser"

describe("parsePatch", () => {
  it("should parse patch correctly", () => {
    const patch = `@@ -2,6 +2,7 @@ import {
   getBooleanInput,
   getInput,
   getMultilineInput,
+  debug,
   info,
   setFailed,
 } from "@actions/core";
@@ -79,7 +80,10 @@ export async function run(): Promise<void> {
         info(JSON.stringify(modifiedFile, null, 2));
       }
     });
+
+    info("done");
   } catch (error) {
+    debug("error");
     // Fail the workflow run if an error occurs
     if (error instanceof Error) {
       setFailed(error.message);`

    const results = parsePatch({ filename: "filename", patch })

    expect(results[0].from).toEqual({
      filename: "filename",
      startLine: 2,
      lineCount: 6,
      branch: undefined,
      content: [
        "   getBooleanInput,",
        "   getInput,",
        "   getMultilineInput,",
        "   info,",
        "   setFailed,",
        ' } from "@actions/core";'
      ]
    })
    expect(results[0].to).toEqual({
      filename: "filename",
      startLine: 2,
      lineCount: 7,
      branch: undefined,
      commitId: undefined,
      content: [
        "2    getBooleanInput,",
        "3    getInput,",
        "4    getMultilineInput,",
        "5 +  debug,",
        "6    info,",
        "7    setFailed,",
        '8  } from "@actions/core";'
      ]
    })

    expect(results[1].from).toEqual({
      filename: "filename",
      startLine: 79,
      lineCount: 7,
      branch: undefined,
      content: [
        "         info(JSON.stringify(modifiedFile, null, 2));",
        "       }",
        "     });",
        "   } catch (error) {",
        "     // Fail the workflow run if an error occurs",
        "     if (error instanceof Error) {",
        "       setFailed(error.message);"
      ]
    })
    expect(results[1].to).toEqual({
      filename: "filename",
      startLine: 80,
      lineCount: 10,
      branch: undefined,
      commitId: undefined,
      content: [
        "80          info(JSON.stringify(modifiedFile, null, 2));",
        "81        }",
        "82      });",
        "83 +",
        '84 +    info("done");',
        "85    } catch (error) {",
        '86 +    debug("error");',
        "87      // Fail the workflow run if an error occurs",
        "88      if (error instanceof Error) {",
        "89        setFailed(error.message);"
      ]
    })
  })

  it("should parse patch with conflict markers correctly", () => {
    const patch = `@@ -85,6 +85,10 @@ export async function run(): Promise<void> {
       info(\`deletions: \${file.deletions}\`);
       info(\`changes: \${file.changes}\`);
     });
+<<<<<<< HEAD
+=======
+    info("done");
+>>>>>>> 9b50671 (wip)
   } catch (error) {
     // Fail the workflow run if an error occurs
     if (error instanceof Error) {`

    const results = parsePatch({ filename: "filename", patch })

    expect(results[0].from).toEqual({
      filename: "filename",
      startLine: 85,
      lineCount: 6,
      branch: "HEAD",
      content: [
        "       info(`deletions: ${file.deletions}`);",
        "       info(`changes: ${file.changes}`);",
        "     });",
        "   } catch (error) {",
        "     // Fail the workflow run if an error occurs",
        "     if (error instanceof Error) {"
      ] // 変更前コードは空
    })
    expect(results[0].to).toEqual({
      filename: "filename",
      startLine: 85,
      lineCount: 10,
      branch: "wip",
      commitId: "9b50671",
      content: [
        "85        info(`deletions: ${file.deletions}`);",
        "86        info(`changes: ${file.changes}`);",
        "87      });",
        '88 +    info("done");',
        "89    } catch (error) {",
        "90      // Fail the workflow run if an error occurs",
        "91      if (error instanceof Error) {"
      ]
    })
  })

  it("fix hunk lineno", () => {
    const patch = `
@@ -3,7 +3,6 @@ import OpenAI from "openai"
 import type { PullRequestContext } from "../context.js"
 import type { Options } from "../option.js"
 import { type ChatBot, type Message, getModelName } from "./index.js"
-import { sleep } from "openai/core.mjs"

 const apiKey = process.env.OPENAI_API_KEY || ""

@@ -12,15 +11,15 @@ export class OpenAIClient implements ChatBot {
   private options: Options
   private fullModelName: string
   private model: string
-  private retries: number

   constructor(modelName: string, options: Options) {
     this.fullModelName = modelName
     this.model = getModelName(modelName)
-    this.retries = options.retries
     this.options = options
     this.client = new OpenAI({
-      apiKey: apiKey
+      apiKey: apiKey,
+      timeout: options.timeoutMS,
+      maxRetries: options.retries
     })

     if (this.options.debug) {
@@ -35,33 +34,31 @@ export class OpenAIClient implements ChatBot {
   async create(ctx: PullRequestContext, prompts: Message[]): Promise<string> {
     try {
       // Call the OpenAI API
-      const response = await this.client.chat.completions.create({
-        model: this.model,
-        messages: [
-          { role: "system", content: this.options.systemPrompt } as const,
-          ...prompts.map((prompt) => ({
-            role: prompt.role as "user" | "assistant" | "system",
-            content: prompt.text
-          }))
-        ],
-        temperature: 0.1
-        // max_tokens: 2000,
-      })
-      // reset retries
-      this.retries = this.options.retries
+      const response = await this.client.chat.completions.create(
+        {
+          model: this.model,
+          messages: [
+            { role: "system", content: this.options.systemPrompt } as const,
+            ...prompts.map((prompt) => ({
+              role: prompt.role as "user" | "assistant" | "system",
+              content: prompt.text
+            }))
+          ],
+          temperature: 0.1
+          // max_tokens: 2000,
+        },
+        {
+          timeout: this.options.timeoutMS,
+          maxRetries: this.options.retries
+        }
+      )
+
       return response.choices[0]?.message?.content || ""
     } catch (error) {
       warning(
         \`Failed to review code for : \${error instanceof Error ? error.message : String(error)}\`
       )

-      // Retry logic
-      if (this.retries > 0) {
-        this.retries--
-        await sleep(1000) // Wait for 1 second before retrying
-        return this.create(ctx, prompts)
-      }
-
       throw new Error("Failed to review this file due to an API error.")
     }
   }
`
    const results = parsePatch({ filename: "filename", patch })

    expect(results[0].from).toEqual({
      filename: "filename",
      startLine: 3,
      lineCount: 7,
      branch: undefined,
      content: [
        ' import type { PullRequestContext } from "../context.js"',
        ' import type { Options } from "../option.js"',
        ' import { type ChatBot, type Message, getModelName } from "./index.js"',
        '-import { sleep } from "openai/core.mjs"',
        "",
        ' const apiKey = process.env.OPENAI_API_KEY || ""',
        ""
      ]
    })
    expect(results[0].to).toEqual({
      filename: "filename",
      startLine: 3,
      lineCount: 6,
      branch: undefined,
      commitId: undefined,
      content: [
        '3  import type { PullRequestContext } from "../context.js"',
        '4  import type { Options } from "../option.js"',
        '5  import { type ChatBot, type Message, getModelName } from "./index.js"',
        "6 ",
        '7  const apiKey = process.env.OPENAI_API_KEY || ""',
        "8 "
      ]
    })
    expect(results[1].from).toEqual({
      filename: "filename",
      startLine: 12,
      lineCount: 15,
      branch: undefined,
      content: [
        "   private options: Options",
        "   private fullModelName: string",
        "   private model: string",
        "-  private retries: number",
        "",
        "   constructor(modelName: string, options: Options) {",
        "     this.fullModelName = modelName",
        "     this.model = getModelName(modelName)",
        "-    this.retries = options.retries",
        "     this.options = options",
        "     this.client = new OpenAI({",
        "-      apiKey: apiKey",
        "     })",
        "",
        "     if (this.options.debug) {"
      ]
    })
    expect(results[1].to).toEqual({
      filename: "filename",
      startLine: 11,
      lineCount: 15,
      branch: undefined,
      commitId: undefined,
      content: [
        "11    private options: Options",
        "12    private fullModelName: string",
        "13    private model: string",
        "14 ",
        "15    constructor(modelName: string, options: Options) {",
        "16      this.fullModelName = modelName",
        "17      this.model = getModelName(modelName)",
        "18      this.options = options",
        "19      this.client = new OpenAI({",
        "20 +      apiKey: apiKey,",
        "21 +      timeout: options.timeoutMS,",
        "22 +      maxRetries: options.retries",
        "23      })",
        "24 ",
        "25      if (this.options.debug) {"
      ]
    })
    expect(results[2].from).toEqual({
      filename: "filename",
      startLine: 35,
      lineCount: 33,
      branch: undefined,
      content: [
        "   async create(ctx: PullRequestContext, prompts: Message[]): Promise<string> {",
        "     try {",
        "       // Call the OpenAI API",
        "-      const response = await this.client.chat.completions.create({",
        "-        model: this.model,",
        "-        messages: [",
        '-          { role: "system", content: this.options.systemPrompt } as const,',
        "-          ...prompts.map((prompt) => ({",
        '-            role: prompt.role as "user" | "assistant" | "system",',
        "-            content: prompt.text",
        "-          }))",
        "-        ],",
        "-        temperature: 0.1",
        "-        // max_tokens: 2000,",
        "-      })",
        "-      // reset retries",
        "-      this.retries = this.options.retries",
        '       return response.choices[0]?.message?.content || ""',
        "     } catch (error) {",
        "       warning(",
        "         `Failed to review code for : ${error instanceof Error ? error.message : String(error)}`",
        "       )",
        "",
        "-      // Retry logic",
        "-      if (this.retries > 0) {",
        "-        this.retries--",
        "-        await sleep(1000) // Wait for 1 second before retrying",
        "-        return this.create(ctx, prompts)",
        "-      }",
        "-",
        '       throw new Error("Failed to review this file due to an API error.")',
        "     }",
        "   }",
        ""
      ]
    })
    expect(results[2].to).toEqual({
      filename: "filename",
      startLine: 34,
      lineCount: 31,
      branch: undefined,
      commitId: undefined,
      content: [
        "34    async create(ctx: PullRequestContext, prompts: Message[]): Promise<string> {",
        "35      try {",
        "36        // Call the OpenAI API",
        "37 +      const response = await this.client.chat.completions.create(",
        "38 +        {",
        "39 +          model: this.model,",
        "40 +          messages: [",
        '41 +            { role: "system", content: this.options.systemPrompt } as const,',
        "42 +            ...prompts.map((prompt) => ({",
        '43 +              role: prompt.role as "user" | "assistant" | "system",',
        "44 +              content: prompt.text",
        "45 +            }))",
        "46 +          ],",
        "47 +          temperature: 0.1",
        "48 +          // max_tokens: 2000,",
        "49 +        },",
        "50 +        {",
        "51 +          timeout: this.options.timeoutMS,",
        "52 +          maxRetries: this.options.retries",
        "53 +        }",
        "54 +      )",
        "55 +",
        '56        return response.choices[0]?.message?.content || ""',
        "57      } catch (error) {",
        "58        warning(",
        "59          `Failed to review code for : ${error instanceof Error ? error.message : String(error)}`",
        "60        )",
        "61 ",
        '62        throw new Error("Failed to review this file due to an API error.")',
        "63      }",
        "64    }",
        "65 "
      ]
    })
  })
})
