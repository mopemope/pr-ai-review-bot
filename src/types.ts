import type { Hunk } from "./patchParser.js"

export type ChangeFile = {
  filename: string
  sha: string
  status: string
  additions: number
  deletions: number
  changes: number
  url: string
  patch: string
  diff: FileDiff[]
  summary: string
  content: string | undefined
}

export type FileDiff = {
  filename: string
  from: Hunk
  to: Hunk
}
