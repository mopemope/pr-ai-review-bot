import { debug, info } from "@actions/core"

export type Hunk = {
  filename: string
  startLine: number
  lineCount: number
  content: string[]
  branch?: string
  commitId?: string
}

export type DiffResult = {
  from: Hunk
  to: Hunk
}

/**
 * Parses the header of a diff chunk.
 *
 * @param line - The header line starting with @@ (format: @@ -a,b +c,d @@ context)
 * @returns Parsed values from the header or null if it doesn't match the expected format
 */
const parseChunkHeader = (
  line: string
): {
  fromStart: number
  fromCount: number
  toStart: number
  toCount: number
  firstLine: string
} | null => {
  const headerMatch = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@ (.+)/)
  if (!headerMatch) {
    return null
  }

  return {
    fromStart: Number.parseInt(headerMatch[1], 10),
    fromCount: Number.parseInt(headerMatch[2], 10),
    toStart: Number.parseInt(headerMatch[3], 10),
    toCount: Number.parseInt(headerMatch[4], 10),
    firstLine: headerMatch[5]
  }
}

/**
 * Processes a git conflict marker in the diff.
 *
 * This function handles the sections between conflict markers (<<<<<<<, =======, >>>>>>>)
 * and organizes the content into original and modified sections.
 *
 * @param lines - Array of diff lines
 * @param patchLineNo - Current line number in the patched file
 * @param lineNo - Current index in the lines array
 * @param fromContent - Array to store content from the original file
 * @param toContent - Array to store content from the modified file
 * @returns Object containing branch information and the next index to process
 */
const processConflictMarker = (
  lines: string[],
  patchLineNo: number,
  lineNo: number,
  fromContent: string[],
  toContent: string[]
): {
  origBranch?: string
  modBranch?: string
  modCommitId?: string
  nextIndex: number
} => {
  // start conflict
  // const markerLine = lines[lineNo].replace(/^\+*/, "");
  const markerLine = lines[lineNo]
  const parts = markerLine.split(" ")
  const origBranch = parts[1] // e.g. HEAD
  let index = lineNo + 1

  // original code
  while (
    index < lines.length &&
    !lines[index].replace(/^\+*/, "").startsWith("=======")
  ) {
    // origContent.push(lines[index].replace(/^\+/, ""));
    fromContent.push(lines[index])
    index++
  }

  index++

  // modified code
  while (
    index < lines.length &&
    !lines[index].replace(/^\+*/, "").startsWith(">>>>>>>")
  ) {
    // modContent.push(lines[index].replace(/^\+*/, ""));
    toContent.push(`${patchLineNo} ${lines[index]}`)
    index++
  }

  let modBranch: string | undefined
  let modCommitId: string | undefined

  // parse branch and commit id
  if (index < lines.length) {
    // const marker = lines[index].replace(/^\+*/, "");
    const marker = lines[index]
    const commitMatch = marker.match(/>>>>>>> (\w+)\s+\(([^)]+)\)/)
    if (commitMatch) {
      modCommitId = commitMatch[1]
      modBranch = commitMatch[2]
    }
    index++
  }

  return { origBranch, modBranch, modCommitId, nextIndex: index }
}

/**
 * Processes a normal (non-conflict) line in a diff.
 *
 * Handles lines that start with '+', '-', or neither (context lines).
 * '+' lines are additions in the new file, '-' lines are removals from the original file,
 * and context lines exist in both files.
 *
 * @param lineNo - Current line number
 * @param line - The diff line to process
 * @param fromContent - Array to store content from the original file
 * @param toContent - Array to store content from the modified file
 */
const processNormalLine = (
  lineNo: number,
  line: string,
  fromContent: string[],
  toContent: string[]
): boolean => {
  if (line.startsWith("+")) {
    // Addition line - only in the new file
    toContent.push(`${lineNo + 1} ${line}`)
    return true
  } else if (line.startsWith("-")) {
    // Removal line - only in the original file
    fromContent.push(line)
    return false
  } else {
    // Context line - exists in both files
    fromContent.push(line)
    toContent.push(`${lineNo + 1} ${line}`)
    return true
  }
}

/**
 * Process a diff chunk to extract file change information.
 *
 * @param lines - Array of diff lines
 * @param startIndex - Starting index in the lines array
 * @param filename - Name of the file being processed
 * @returns Object containing the parsed diff result and the next index to process
 */
const processChunk = (
  lines: string[],
  startIndex: number,
  filename: string
): { result: DiffResult | null; nextIndex: number } => {
  const headerResult = parseChunkHeader(lines[startIndex])
  if (!headerResult) {
    return { result: null, nextIndex: startIndex + 1 }
  }

  const { fromStart, fromCount, toStart, toCount } = headerResult
  let lineNo = toStart - 1
  // const fromContent: string[] = [firstLine]
  // const toContent: string[] = [`${lineNo}  ${firstLine}`]
  const fromContent: string[] = []
  const toContent: string[] = []

  let origBranch: string | undefined
  let modBranch: string | undefined
  let modCommitId: string | undefined
  let i = startIndex + 1

  while (i < lines.length && !lines[i].startsWith("@@")) {
    const currentLine = lines[i]

    if (currentLine.includes("<<<<<<<")) {
      lineNo++
      const conflict = processConflictMarker(
        lines,
        lineNo,
        i,
        fromContent,
        toContent
      )

      origBranch = conflict.origBranch
      modBranch = conflict.modBranch
      modCommitId = conflict.modCommitId
      i = conflict.nextIndex
      continue
    }

    if (processNormalLine(lineNo, currentLine, fromContent, toContent)) {
      // Increment line number for context lines and additions
      lineNo++
    }
    i++
    // lineNo++
  }

  info(`from content: ${fromContent.join("\n")}`)
  info(`to content: ${toContent.join("\n")}`)

  const result: DiffResult = {
    from: {
      filename,
      startLine: fromStart,
      lineCount: fromCount,
      content: fromContent,
      branch: origBranch
    },
    to: {
      filename,
      startLine: toStart,
      lineCount: toCount,
      content: toContent,
      branch: modBranch,
      commitId: modCommitId
    }
  }

  return { result, nextIndex: i }
}

/**
 * Parses a git diff patch into structured diff results.
 *
 * This function takes a filename and a patch string, then processes the patch
 * to extract information about the changes. It identifies chunk headers and processes
 * each chunk separately.
 *
 * @param params - Object containing filename and patch
 * @param params.filename - Name of the file being processed
 * @param params.patch - Git diff patch string
 * @returns Array of DiffResult objects representing the changes
 */
export const parsePatch = ({
  filename,
  patch
}: {
  filename: string
  patch?: string
}) => {
  const results: DiffResult[] = []
  if (!patch) {
    // Return empty array if no patch is provided
    return results
  }

  debug(`parsePatch: ${filename} ${patch}`)
  const lines = patch.split("\n")
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("@@")) {
      // Process chunk headers (format: @@ -a,b +c,d @@ ...)
      const { result, nextIndex } = processChunk(lines, i, filename)
      if (result) {
        results.push(result)
      }
      i = nextIndex
    } else {
      // Skip non-chunk header lines
      i++
    }
  }

  return results
}
