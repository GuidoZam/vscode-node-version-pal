# Change Log

All notable changes to the "Node Version Pal" extension will be documented in this file.

## [0.0.1] - 2026-02-10

### Added
- Initial release of Node Version Pal
- Automatic detection of Node.js versions from `.nvmrc` and `.node-version` files
- Status bar display with Node.js icon showing current version
- Support for multiple workspace folders
- Recursive scanning for version files in subdirectories
- Integration with nvm (Node Version Manager)
- Integration with fnm (Fast Node Manager)
- Command to refresh Node version detection
- Command to switch Node versions using detected version manager
- Support for various version formats:
  - Semantic versions (18.17.0, v20.5.1)
  - Major versions (18)
  - Major.minor versions (18.16)
  - LTS versions (lts, lts/hydrogen)
  - Keywords (stable, latest, current)
  - Pre-release versions (19.0.0-alpha.1)
- Auto-refresh when version files are created, modified, or deleted
- Tooltip showing project name, version, and location
- Comprehensive test suite
- Cross-platform support (macOS, Linux, Windows)

### Features
- **Smart Detection**: Prioritizes version files in deeper subdirectories
- **Version Manager Auto-Detection**: Automatically detects nvm or fnm installation
- **Terminal Integration**: Opens terminal to execute version switching commands
- **Project Context**: Shows project name and relative path in tooltip
- **File Watching**: Monitors changes to version files automatically
- **Error Handling**: Graceful handling of invalid version files and missing version managers

### Technical
- Built with TypeScript
- Uses semver for version validation and parsing
- Implements file system watching for automatic updates
- Supports both nvm and fnm version managers
- Recursive directory scanning with smart filtering
- Comprehensive error handling and logging
- Full test coverage with mocha and assert

### Known Limitations
- nvm on Windows is not supported (nvm doesn't run natively on Windows)
- Requires terminal access for version switching
- Version switching is executed in VS Code's integrated terminal