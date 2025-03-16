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
export declare const parsePatch: ({ filename, patch }: {
    filename: string;
    patch?: string;
}) => DiffResult[];
