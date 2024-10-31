/**
 * Validates if a string could be a valid Git commit hash.
 * Git commits are 40 characters long in full form (SHA-1) 
 * or 7+ characters in short form, containing only hexadecimal characters.
 */
export function isInGitCommitHashFormat(str: string): boolean {
    // Remove any whitespace
    const cleaned = str.trim();

    // Check if string only contains hexadecimal characters (0-9, a-f)
    const isHex = /^[0-9a-f]+$/i.test(cleaned);

    // Check length - full SHA-1 is 40 chars, but short forms can be 7+ chars
    const hasValidLength = cleaned.length >= 7 && cleaned.length <= 40;

    return isHex && hasValidLength;
}