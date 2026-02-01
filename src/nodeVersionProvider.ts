import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { NodeVersionUtils } from './nodeVersionUtils';

export class NodeVersionProvider {
    private statusBarItem: vscode.StatusBarItem;
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private currentVersion: string | null = null;
    private currentProject: string | null = null;

    constructor(private context: vscode.ExtensionContext) {
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'nodeVersionPal.switchVersion';
        this.statusBarItem.tooltip = 'Click to switch Node version';
        this.context.subscriptions.push(this.statusBarItem);

        // Initial check
        this.updateVersion();

        // Watch for workspace changes
        this.setupFileWatcher();

        // Listen to workspace folder changes
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.setupFileWatcher();
            this.updateVersion();
        });
    }

    private setupFileWatcher() {
        // Dispose existing watcher
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }

        // Create new watcher for .nvmrc and .node-version files
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/{.nvmrc,.node-version}');
        
        this.fileWatcher.onDidCreate(() => this.updateVersion());
        this.fileWatcher.onDidChange(() => this.updateVersion());
        this.fileWatcher.onDidDelete(() => this.updateVersion());

        this.context.subscriptions.push(this.fileWatcher);
    }

    public async refresh() {
        await this.updateVersion();
        vscode.window.showInformationMessage('Node version refreshed');
    }

    private async updateVersion() {
        const nodeInfo = await this.detectNodeVersion();
        
        if (nodeInfo) {
            this.currentVersion = nodeInfo.version;
            this.currentProject = nodeInfo.projectName;
            
            this.statusBarItem.text = `$(nodejs) Node ${nodeInfo.version}`;
            this.statusBarItem.tooltip = `Node.js v${nodeInfo.version}\nProject: ${nodeInfo.projectName}${nodeInfo.relativePath ? `\nLocation: ${nodeInfo.relativePath}` : ''}\nClick to switch version`;
            this.statusBarItem.command = 'nodeVersionPal.switchVersion';
            this.statusBarItem.show();
        } else {
            this.currentVersion = null;
            this.currentProject = null;
            
            // Show "Create" button when no version file exists
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                this.statusBarItem.text = `$(file-add) Create Node Version`;
                this.statusBarItem.tooltip = 'Click to create .nvmrc or .node-version file';
                this.statusBarItem.command = 'nodeVersionPal.createVersionFile';
                this.statusBarItem.show();
            } else {
                this.statusBarItem.hide();
            }
        }
    }

    public async switchVersion() {
        if (!this.currentVersion) {
            vscode.window.showWarningMessage('No Node version file found in the workspace');
            return;
        }

        try {
            const versionManager = await this.detectVersionManager();
            
            if (!versionManager) {
                vscode.window.showErrorMessage('No Node version manager (nvm/fnm) found. Please install nvm or fnm to switch Node versions.');
                return;
            }

            // Show confirmation dialog
            const choice = await vscode.window.showInformationMessage(
                `Switch to Node.js ${this.currentVersion} using ${versionManager}?`,
                'Switch',
                'Cancel'
            );

            if (choice === 'Switch') {
                await this.executeVersionSwitch(versionManager, this.currentVersion);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to switch Node version: ${error}`);
        }
    }

    public async createVersionFile() {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            // Ask user which file type to create
            const fileType = await vscode.window.showQuickPick([
                { label: '.nvmrc', description: 'Traditional nvm version file' },
                { label: '.node-version', description: 'Alternative Node version file format' }
            ], {
                placeHolder: 'Select the type of Node version file to create'
            });

            if (!fileType) {
                return; // User cancelled
            }

            // Get current Node version from system with direct approach
            let currentVersion: string = '';
            
            // Method 1: Try direct execution with enhanced environment
            try {
                currentVersion = await this.getCurrentNodeVersion();
                console.log('Detected Node version:', currentVersion);
            } catch (error) {
                console.log('Failed to detect Node version:', error);
                currentVersion = ''; // Will show empty instead of wrong version
            }

            // Ask user for Node version
            const version = await vscode.window.showInputBox({
                prompt: `Enter Node.js version for ${fileType.label}${currentVersion ? ` (current: ${currentVersion})` : ''}`,
                placeHolder: currentVersion ? `Current: ${currentVersion} (or enter: lts, latest, current)` : 'e.g., 18.17.0, lts, lts/hydrogen',
                value: currentVersion,
                validateInput: (value) => {
                    if (!value || !value.trim()) {
                        return 'Please enter a Node.js version';
                    }
                    if (!NodeVersionUtils.isValidVersion(value.trim())) {
                        return 'Please enter a valid Node.js version (e.g., 18.17.0, lts, lts/hydrogen)';
                    }
                    return undefined;
                }
            });

            if (!version) {
                return; // User cancelled
            }

            // Choose workspace folder if multiple
            let targetFolder: vscode.WorkspaceFolder;
            if (vscode.workspace.workspaceFolders.length === 1) {
                targetFolder = vscode.workspace.workspaceFolders[0];
            } else {
                const folderChoice = await vscode.window.showWorkspaceFolderPick({
                    placeHolder: 'Select workspace folder to create the version file in'
                });
                if (!folderChoice) {
                    return; // User cancelled
                }
                targetFolder = folderChoice;
            }

            // Create the file
            const filePath = path.join(targetFolder.uri.fsPath, fileType.label);
            
            // Check if file already exists
            if (fs.existsSync(filePath)) {
                const overwrite = await vscode.window.showWarningMessage(
                    `${fileType.label} already exists. Do you want to overwrite it?`,
                    'Overwrite',
                    'Cancel'
                );
                if (overwrite !== 'Overwrite') {
                    return;
                }
            }

            // Write the version to the file
            fs.writeFileSync(filePath, version.trim() + '\n');

            // Show success message and offer to switch
            const switchNow = await vscode.window.showInformationMessage(
                `${fileType.label} created with Node.js ${version}`,
                'Switch Now',
                'Done'
            );

            if (switchNow === 'Switch Now') {
                // Refresh to detect the new file
                await this.updateVersion();
                // Try to switch to the version
                await this.switchVersion();
            } else {
                // Just refresh to update the status bar
                await this.updateVersion();
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create version file: ${error}`);
        }
    }

    private async detectVersionManager(): Promise<'nvm' | 'fnm' | null> {
        try {
            // Check for fnm first (faster)
            await this.execAsync('fnm --version');
            return 'fnm';
        } catch {
            // fnm not found, try nvm
            try {
                // Check if nvm is available
                await this.execAsync('source ~/.nvm/nvm.sh && nvm --version');
                return 'nvm';
            } catch {
                return null;
            }
        }
    }

    private async executeVersionSwitch(manager: 'nvm' | 'fnm', version: string): Promise<void> {
        const terminal = vscode.window.createTerminal({
            name: `Node Version Switch`,
            hideFromUser: false
        });

        let command: string;
        if (manager === 'fnm') {
            command = `fnm use ${version}`;
        } else {
            command = `source ~/.nvm/nvm.sh && nvm use ${version}`;
        }

        terminal.sendText(command);
        terminal.show();

        vscode.window.showInformationMessage(`Switching to Node.js ${version} using ${manager}...`);
    }

    private async getCurrentNodeVersion(): Promise<string> {
        // Try multiple approaches to get current Node version
        const attempts = [
            // Method 1: Standard node command with shell sourcing
            () => this.execAsync('source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null || true; node --version'),
            // Method 2: Direct node command
            () => this.execAsync('node --version'),
            // Method 3: Common installation paths
            () => this.execAsync('/usr/local/bin/node --version'),
            () => this.execAsync('/opt/homebrew/bin/node --version'),
            // Method 4: Version manager commands
            () => this.execAsync('source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null || true; fnm current 2>/dev/null || nvm current 2>/dev/null || node --version'),
            // Method 5: Which node then version
            async () => {
                const nodePath = await this.execAsync('which node 2>/dev/null || echo ""');
                if (nodePath.trim()) {
                    return this.execAsync(`${nodePath.trim()} --version`);
                }
                throw new Error('Node not found in PATH');
            }
        ];

        for (const attempt of attempts) {
            try {
                const result = await attempt();
                if (result && result.trim() && !result.includes('command not found')) {
                    const version = result.replace(/^v/, '').trim();
                    // Validate it looks like a version number
                    if (/^\d+\.\d+\.\d+/.test(version)) {
                        return version;
                    }
                }
            } catch (error) {
                continue; // Try next method
            }
        }

        throw new Error('Could not detect Node version');
    }

    private async execAsync(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // Enhanced environment setup to include common paths where Node might be installed
            const env = { 
                ...process.env,
                PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin:/Users/${process.env.USER}/.nvm/versions/node:/Users/${process.env.USER}/.fnm/node-versions`
            };
            
            cp.exec(command, { 
                env: env,
                shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
                timeout: 5000 // 5 second timeout
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Command failed: ${error.message}`));
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }

    private async detectNodeVersion(): Promise<{ version: string, projectName: string, relativePath?: string } | null> {
        if (!vscode.workspace.workspaceFolders) {
            return null;
        }

        // Collect all Node version files found
        const nodeProjects: Array<{ version: string, projectName: string, path: string, workspacePath: string, fileName: string }> = [];

        for (const folder of vscode.workspace.workspaceFolders) {
            const foundProjects = await this.findNodeVersionFilesInDirectory(folder.uri.fsPath);
            // Add workspace path info to each project
            const projectsWithWorkspace = foundProjects.map(project => ({
                ...project,
                workspacePath: folder.uri.fsPath
            }));
            nodeProjects.push(...projectsWithWorkspace);
        }

        // Return the first Node version file found (prioritize by depth - deeper projects first)
        if (nodeProjects.length > 0) {
            // Sort by path depth (deeper paths first) to prioritize subprojects over root projects
            nodeProjects.sort((a, b) => {
                const aDepth = a.path.split(path.sep).length;
                const bDepth = b.path.split(path.sep).length;
                return bDepth - aDepth;
            });
            
            const selectedProject = nodeProjects[0];
            const relativePath = path.relative(selectedProject.workspacePath, selectedProject.path);
            
            return {
                version: selectedProject.version,
                projectName: selectedProject.projectName,
                relativePath: relativePath || undefined
            };
        }

        return null;
    }

    private async findNodeVersionFilesInDirectory(dirPath: string): Promise<Array<{ version: string, projectName: string, path: string, fileName: string }>> {
        const nodeProjects: Array<{ version: string, projectName: string, path: string, fileName: string }> = [];
        
        try {
            // Check for Node version files in current directory
            const versionFileNames = NodeVersionUtils.getVersionFileNames();
            
            for (const fileName of versionFileNames) {
                const filePath = path.join(dirPath, fileName);
                if (fs.existsSync(filePath)) {
                    try {
                        const fileContent = fs.readFileSync(filePath, 'utf8');
                        const nodeVersion = NodeVersionUtils.extractNodeVersion(fileContent);
                        
                        if (nodeVersion) {
                            // Try to get project name from package.json, fallback to directory name
                            let projectName = path.basename(dirPath);
                            const packageJsonPath = path.join(dirPath, 'package.json');
                            
                            if (fs.existsSync(packageJsonPath)) {
                                try {
                                    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
                                    const packageJson = JSON.parse(packageJsonContent);
                                    projectName = packageJson.name || projectName;
                                } catch (error) {
                                    // Ignore package.json parsing errors
                                }
                            }
                            
                            nodeProjects.push({
                                version: nodeVersion,
                                projectName,
                                path: dirPath,
                                fileName
                            });
                            
                            // Found a version file, no need to check others in this directory
                            break;
                        }
                    } catch (error) {
                        console.error(`Error reading ${fileName} at ${filePath}:`, error);
                    }
                }
            }

            // Recursively check subdirectories (but skip node_modules and common build/output folders)
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            const subDirectories = entries.filter(entry => 
                entry.isDirectory() && 
                !entry.name.startsWith('.') && 
                !['node_modules', 'dist', 'lib', 'build', 'out', 'temp', 'coverage', '.git'].includes(entry.name)
            );

            for (const subDir of subDirectories) {
                const subDirPath = path.join(dirPath, subDir.name);
                const subProjects = await this.findNodeVersionFilesInDirectory(subDirPath);
                nodeProjects.push(...subProjects);
            }
        } catch (error) {
            // Silently ignore directories we can't read (permissions, etc.)
            console.debug(`Could not read directory ${dirPath}:`, error);
        }

        return nodeProjects;
    }

    dispose() {
        this.statusBarItem.dispose();
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
    }
}