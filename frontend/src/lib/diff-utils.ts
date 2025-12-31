export type DiffType = 'add' | 'remove' | 'keep';

export interface DiffResult<T = string> {
    type: DiffType;
    value: T;
    // For string diffs, count is implicit length or word count
}

/**
 * A simple implementation of Myers difference algorithm
 * to find the difference between two texts.
 */
export function computeDiff(text1: string, text2: string): DiffResult<string>[] {
    const words1 = text1.split(/(\s+)/); // Keep whitespace as tokens
    const words2 = text2.split(/(\s+)/);
    return computeGenericDiff(words1, words2, (a, b) => a === b);
}

/**
 * Generic diff for arrays of items (e.g. TextItems)
 */
export function computeGenericDiff<T>(
    items1: T[],
    items2: T[],
    isEqual: (a: T, b: T) => boolean
): DiffResult<T>[] {
    const matrix: number[][] = [];
    for (let i = 0; i <= items1.length; i++) {
        matrix[i] = new Array(items2.length + 1).fill(0);
    }

    for (let i = 1; i <= items1.length; i++) {
        for (let j = 1; j <= items2.length; j++) {
            if (isEqual(items1[i - 1], items2[j - 1])) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }

    const diff: DiffResult<T>[] = [];
    let i = items1.length;
    let j = items2.length;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && isEqual(items1[i - 1], items2[j - 1])) {
            diff.unshift({ type: 'keep', value: items1[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
            diff.unshift({ type: 'add', value: items2[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
            diff.unshift({ type: 'remove', value: items1[i - 1] });
            i--;
        }
    }

    // Coalesce? For objects, typically not helpful to coalesce into a string equivalent.
    // We return array of individual diff items.
    return diff;
}
