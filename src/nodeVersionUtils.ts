import * as semver from 'semver';

/**
 * Utility functions for Node.js version detection and parsing
 */
export class NodeVersionUtils {
    /**
     * Extract Node.js version from .nvmrc or .node-version content
     */
    static extractNodeVersion(content: string): string | null {
        if (!content || !content.trim()) {
            return null;
        }

        const trimmedContent = content.trim();
        
        // Try to clean and parse the version
        const cleanVersion = NodeVersionUtils.cleanVersionString(trimmedContent);
        
        return cleanVersion;
    }

    /**
     * Clean version string by removing prefixes and extracting semantic version
     */
    static cleanVersionString(version: string): string | null {
        if (!version) { return null; }
        
        try {
            // Try semver clean first
            const cleanVersion = semver.clean(version);
            if (cleanVersion) {
                return cleanVersion;
            }
        } catch (error) {
            // Fall back to manual cleaning
        }

        // Remove common prefixes like 'v', 'node-v', 'nodejs-'
        let cleaned = version.replace(/^(v|node-v|nodejs-)/i, '');
        
        // Handle special keywords
        if (cleaned.toLowerCase() === 'lts' || cleaned.toLowerCase() === 'stable') {
            return cleaned.toLowerCase();
        }
        
        // Handle LTS codenames like 'lts/hydrogen', 'lts/gallium'
        const ltsMatch = cleaned.match(/^lts\/([a-zA-Z]+)$/i);
        if (ltsMatch) {
            return `lts/${ltsMatch[1].toLowerCase()}`;
        }

        // Manual version cleaning - capture full semantic version including pre-release
        // Matches: major.minor.patch[-prerelease][+build]
        const versionMatch = cleaned.match(/(\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+(?:\.\d+)*)?(?:\+[a-zA-Z0-9-]+)?)/);
        if (versionMatch) {
            return versionMatch[1];
        }

        // Fallback: try to match just major.minor.patch
        const basicVersionMatch = cleaned.match(/(\d+\.\d+\.\d+)/);
        if (basicVersionMatch) {
            return basicVersionMatch[1];
        }

        // Handle major.minor format (add .0)
        const majorMinorMatch = cleaned.match(/^(\d+\.\d+)$/);
        if (majorMinorMatch) {
            return `${majorMinorMatch[1]}.0`;
        }

        // Handle just major version (add .0.0)
        const majorMatch = cleaned.match(/^(\d+)$/);
        if (majorMatch) {
            return `${majorMatch[1]}.0.0`;
        }

        // If no standard version found, return null for invalid strings
        return null;
    }

    /**
     * Check if a version string is valid
     */
    static isValidVersion(version: string): boolean {
        if (!version) { return false; }
        
        // Special cases for LTS and other keywords
        if (['lts', 'stable', 'latest', 'current'].includes(version.toLowerCase())) {
            return true;
        }
        
        // LTS codenames
        if (/^lts\/[a-zA-Z]+$/i.test(version)) {
            return true;
        }
        
        // Semantic versions
        return semver.valid(version) !== null;
    }

    /**
     * Get common Node version file names
     */
    static getVersionFileNames(): string[] {
        return ['.nvmrc', '.node-version'];
    }

    /**
     * Check if a file is a Node version file
     */
    static isNodeVersionFile(fileName: string): boolean {
        return NodeVersionUtils.getVersionFileNames().includes(fileName);
    }
}