import * as assert from 'assert';
import { NodeVersionUtils } from '../../nodeVersionUtils';

suite('Node Version Utils Test Suite', () => {

	test('Should extract version from .nvmrc content', () => {
		const testCases = [
			{ input: '18.17.0', expected: '18.17.0' },
			{ input: 'v18.17.0', expected: '18.17.0' },
			{ input: 'node-v18.17.0', expected: '18.17.0' },
			{ input: 'nodejs-18.17.0', expected: '18.17.0' },
			{ input: '20', expected: '20.0.0' },
			{ input: '18.16', expected: '18.16.0' },
		];

		testCases.forEach(({ input, expected }) => {
			const result = NodeVersionUtils.extractNodeVersion(input);
			assert.strictEqual(result, expected, `Failed for input: ${input}`);
		});
	});

	test('Should handle LTS versions', () => {
		const testCases = [
			{ input: 'lts', expected: 'lts' },
			{ input: 'LTS', expected: 'lts' },
			{ input: 'lts/hydrogen', expected: 'lts/hydrogen' },
			{ input: 'lts/Gallium', expected: 'lts/gallium' },
			{ input: 'stable', expected: 'stable' },
			{ input: 'STABLE', expected: 'stable' },
		];

		testCases.forEach(({ input, expected }) => {
			const result = NodeVersionUtils.extractNodeVersion(input);
			assert.strictEqual(result, expected, `Failed for input: ${input}`);
		});
	});

	test('Should handle pre-release versions', () => {
		const testCases = [
			{ input: '18.0.0-alpha.1', expected: '18.0.0-alpha.1' },
			{ input: 'v19.0.0-beta.2', expected: '19.0.0-beta.2' },
			{ input: '20.0.0-rc.1', expected: '20.0.0-rc.1' },
		];

		testCases.forEach(({ input, expected }) => {
			const result = NodeVersionUtils.extractNodeVersion(input);
			assert.strictEqual(result, expected, `Failed for input: ${input}`);
		});
	});

	test('Should return null for invalid input', () => {
		const invalidInputs = ['', '   ', 'invalid', 'not-a-version'];

		invalidInputs.forEach(input => {
			const result = NodeVersionUtils.extractNodeVersion(input);
			assert.strictEqual(result, null, `Should return null for: ${input}`);
		});
	});

	test('Should validate version strings correctly', () => {
		const validVersions = [
			'18.17.0',
			'lts',
			'stable',
			'latest',
			'current',
			'lts/hydrogen',
			'18.0.0-alpha.1'
		];

		const invalidVersions = [
			'',
			'invalid',
			'not-a-version',
			'abc.def.ghi'
		];

		validVersions.forEach(version => {
			assert.strictEqual(NodeVersionUtils.isValidVersion(version), true, `${version} should be valid`);
		});

		invalidVersions.forEach(version => {
			assert.strictEqual(NodeVersionUtils.isValidVersion(version), false, `${version} should be invalid`);
		});
	});

	test('Should identify Node version files correctly', () => {
		const versionFiles = ['.nvmrc', '.node-version'];
		const nonVersionFiles = ['package.json', '.gitignore', 'README.md'];

		versionFiles.forEach(file => {
			assert.strictEqual(NodeVersionUtils.isNodeVersionFile(file), true, `${file} should be a version file`);
		});

		nonVersionFiles.forEach(file => {
			assert.strictEqual(NodeVersionUtils.isNodeVersionFile(file), false, `${file} should not be a version file`);
		});
	});

	test('Should clean version strings correctly', () => {
		const testCases = [
			{ input: 'v18.17.0', expected: '18.17.0' },
			{ input: 'node-v18.17.0', expected: '18.17.0' },
			{ input: 'nodejs-18.17.0', expected: '18.17.0' },
			{ input: '18.17.0', expected: '18.17.0' },
			{ input: '18', expected: '18.0.0' },
			{ input: '18.16', expected: '18.16.0' },
			{ input: 'lts/hydrogen', expected: 'lts/hydrogen' },
			{ input: 'LTS/Gallium', expected: 'lts/gallium' },
			{ input: 'stable', expected: 'stable' },
			{ input: '', expected: null },
			{ input: 'invalid', expected: null },
		];

		testCases.forEach(({ input, expected }) => {
			const result = NodeVersionUtils.cleanVersionString(input);
			assert.strictEqual(result, expected, `Failed for input: ${input}`);
		});
	});
});