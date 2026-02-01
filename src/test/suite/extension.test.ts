import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('nodepal.vscode-node-version-pal'));
	});

	test('Extension should activate', async () => {
		const ext = vscode.extensions.getExtension('nodepal.vscode-node-version-pal');
		await ext?.activate();
		assert.ok(ext?.isActive);
	});

	test('Should register refresh command', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('nodeVersionPal.refresh'));
	});

	test('Should register switch version command', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('nodeVersionPal.switchVersion'));
	});

	test('Should register create version file command', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('nodeVersionPal.createVersionFile'));
	});
});