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
      commitId: undefined,
      content: [
        "import {",
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
        "1  import {",
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
      commitId: undefined,
      content: [
        "export async function run(): Promise<void> {",
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
        "79  export async function run(): Promise<void> {",
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
      commitId: undefined,
      content: [
        "export async function run(): Promise<void> {",
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
        "84  export async function run(): Promise<void> {",
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
})
