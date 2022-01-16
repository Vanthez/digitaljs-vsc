const assert = require('assert');
const vscode = require('vscode');
const path = require('path');
const sinon = require('sinon');

async function changeConfig(setting, value) {
	const config = vscode.workspace.getConfiguration('digitaljs-VSC');
	await config.update(setting, value, 1);
}

async function setDefaultSettings() {
	const config = vscode.workspace.getConfiguration('digitaljs-VSC');
	await config.update('spawnInTheSameColumn', false, 1);
	await config.update('optimizeInYosys', false, 1);
	await config.update('simplifyDiagram', true, 1);
	await config.update('layoutEngine', 'ElkJS', 1);
	await config.update('simulationEngine', 'WebWorker', 1);
	await config.update('experimentalFsmTransform', 'Disabled', 1);
	await config.update('mergeMoreLogicIntoFsm', false, 1);
}

async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

suite('DigitalJS-VSC Successful Scenarios', () => {
	const svUri = vscode.Uri.file(path.join(__dirname , '/testfiles/testfile.sv'));
	const jsonUri = vscode.Uri.file(path.join(__dirname , '/testfiles/testfile.json'));
	const vUri = vscode.Uri.file(path.join(__dirname , '/testfiles/testfile with spaces.v'));

	test('Identify DigitalJS-VSC', async () => {
		const djsvsc = await vscode.extensions.getExtension('michal-markiewicz.digitaljs-vsc');
		assert.notStrictEqual(djsvsc, undefined);
	});

	test('simulate sv', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		await vscode.commands.executeCommand('vscode.open', svUri);
		await setDefaultSettings();
		await vscode.commands.executeCommand('digitaljs-vsc.simulate');
		await sleep(100);
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.called, false);
		errorMessageAppeared.restore();
	});

	test('simulate v (with spaces in filename)', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', vUri);
		await vscode.commands.executeCommand('digitaljs-vsc.simulate');
		await sleep(100);
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.called, false);
		errorMessageAppeared.restore();
	});

	test('simulate json', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', jsonUri);
		await vscode.commands.executeCommand('digitaljs-vsc.simulate');
		await sleep(100);
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.called, false);
		errorMessageAppeared.restore();
	});

	test('jsonize sv', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', svUri);
		await vscode.commands.executeCommand('digitaljs-vsc.jsonize');
		await sleep(100);
		const jsonOutput = await vscode.window.activeTextEditor.document.getText();
		await vscode.commands.executeCommand('vscode.open', jsonUri);
		const targetOutput = await vscode.window.activeTextEditor.document.getText();
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(jsonOutput, targetOutput);
		assert.strictEqual(errorMessageAppeared.called, false);
		errorMessageAppeared.restore();
	});
});

suite('DigitalJS-VSC with non-default configuration', () => {
	const svUri = vscode.Uri.file(path.join(__dirname , '/testfiles/testfile.sv'));

	test('All non-default except mergeMoreLogicIntoFsm', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', svUri);
		await changeConfig('spawnInTheSameColumn', true);
		await changeConfig('optimizeInYosys', true);
		await changeConfig('simplifyDiagram', false);
		await changeConfig('layoutEngine', 'Dagre');
		await changeConfig('simulationEngine', 'Synchronous');
		await changeConfig('experimentalFsmTransform', 'Enabled');
		await changeConfig('mergeMoreLogicIntoFsm', false);
		await vscode.commands.executeCommand('digitaljs-vsc.simulate');
		await sleep(100);
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.called, false);
		errorMessageAppeared.restore();
	});

	test('mergeMoreLogicIntoFsm with experimentalFsmTransform Enabled', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', svUri);
		await changeConfig('experimentalFsmTransform', 'Enabled');
		await changeConfig('mergeMoreLogicIntoFsm', true);
		await vscode.commands.executeCommand('digitaljs-vsc.simulate');
		await sleep(100);
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.called, false);
		errorMessageAppeared.restore();
	});

	test('mergeMoreLogicIntoFsm with experimentalFsmTransform AsCircuitElement', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', svUri);
		await changeConfig('experimentalFsmTransform', 'AsCircuitElement');
		await changeConfig('mergeMoreLogicIntoFsm', true);
		await vscode.commands.executeCommand('digitaljs-vsc.simulate');
		await setDefaultSettings();
		await sleep(100);
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.called, false);
		errorMessageAppeared.restore();
	});
});

suite('DigitalJS-VSC.simulate error handling', () => {
	const txtUri = vscode.Uri.file(path.join(__dirname , '/testfiles/improperExtensionTestfile.txt'));
	const svMisinputUri = vscode.Uri.file(path.join(__dirname , '/testfiles/misinputTestfile.sv'));
	const jsonMisinputUri = vscode.Uri.file(path.join(__dirname , '/testfiles/incompatibleTestfile.json'));

	test('No input file', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('digitaljs-vsc.simulate');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.calledOnce, true);
		errorMessageAppeared.restore();
	});

	test('Improper extension of input file', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', txtUri);
		await vscode.commands.executeCommand('digitaljs-vsc.jsonize');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.calledOnce, true);
		errorMessageAppeared.restore();
	});

	test('Improper sv program', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', svMisinputUri);
		await vscode.commands.executeCommand('digitaljs-vsc.jsonize');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.calledOnce, true);
		errorMessageAppeared.restore();
	});

	test('Incompatible json input', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', jsonMisinputUri);
		await vscode.commands.executeCommand('digitaljs-vsc.jsonize');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.calledOnce, true);
		errorMessageAppeared.restore();
	});
});

suite('DigitalJS-VSC.jsonize error handling', () => {
	const jsonUri = vscode.Uri.file(path.join(__dirname , '/testfiles/testfile.json'));
	const svMisinputUri = vscode.Uri.file(path.join(__dirname , '/testfiles/misinputTestfile.sv'));

	test('No input file', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('digitaljs-vsc.jsonize');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.calledOnce, true);
		errorMessageAppeared.restore();
	});

	test('Improper extension of input file', async () => {
		await vscode.commands.executeCommand('vscode.open', jsonUri);
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('digitaljs-vsc.jsonize');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.calledOnce, true);
		errorMessageAppeared.restore();
	});

	test('Improper sv program', async () => {
		const errorMessageAppeared = sinon.spy(vscode.window, 'showErrorMessage');
		await vscode.commands.executeCommand('vscode.open', svMisinputUri);
		await vscode.commands.executeCommand('digitaljs-vsc.jsonize');
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(errorMessageAppeared.calledOnce, true);
		errorMessageAppeared.restore();
	});
});
