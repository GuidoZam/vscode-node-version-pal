import * as vscode from 'vscode';
import { NodeVersionProvider } from './nodeVersionProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Node Version Pal extension is now active');

    // Create the Node version provider
    const nodeVersionProvider = new NodeVersionProvider(context);

    // Register the refresh command
    const refreshCommand = vscode.commands.registerCommand('nodeVersionPal.refresh', async () => {
        await nodeVersionProvider.refresh();
    });

    // Register the switch version command
    const switchCommand = vscode.commands.registerCommand('nodeVersionPal.switchVersion', async () => {
        await nodeVersionProvider.switchVersion();
    });

    // Register the create version file command
    const createCommand = vscode.commands.registerCommand('nodeVersionPal.createVersionFile', async () => {
        await nodeVersionProvider.createVersionFile();
    });

    context.subscriptions.push(refreshCommand, switchCommand, createCommand);
    
    // Register provider dispose in context
    context.subscriptions.push({
        dispose: () => nodeVersionProvider.dispose()
    });
}

export function deactivate() {
    console.log('Node Version Pal extension is now deactivated');
}