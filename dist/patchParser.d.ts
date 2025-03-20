export type Hunk = {
    filename: string;
    startLine: number;
    lineCount: number;
    content: string[];
    branch?: string;
    commitId?: string;
};
export type DiffResult = {
    from: Hunk;
    to: Hunk;
};
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
export declare const parsePatch: ({ filename, patch }: {
    filename: string;
    patch?: string;
}) => DiffResult[];
