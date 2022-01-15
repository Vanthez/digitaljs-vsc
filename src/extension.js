const vscode = require('vscode');
const {readFileSync} = require('fs');
const {basename} = require('path');
const {verilogToYosys, yosysToDigitalJson} = require('./converter');

function getDigitaljsPanelOptions(extensionUri) {
	return {
		enableScripts: true,
		retainContextWhenHidden: true,
		localResourceRoots:
		[
			vscode.Uri.joinPath(extensionUri, 'media'),
			vscode.Uri.joinPath(extensionUri, 'src'),
			vscode.Uri.joinPath(extensionUri, 'node_modules', 'digitaljs', 'dist')
		]
	};
}

function readCurrentFile() {
	try {
		const currentWindowPath = vscode.window.activeTextEditor.document.uri.fsPath;
		return readFileSync(currentWindowPath, 'utf-8');
	} catch (err) {
		vscode.window.showErrorMessage('Currently active input file provided is not saved on the disk or could not be read. ' + err.message);
	}
}

function getCurrentFileName() {
	const currentFileName = basename(vscode.window.activeTextEditor.document.uri.fsPath);
	return currentFileName;
}

function getFsmOptions(digitalVscConfig) {
	const fsmTransform = digitalVscConfig.get('experimentalFsmTransform');
	if (fsmTransform == 'Disabled') {
		return '';
	} else {
		const expand = (digitalVscConfig.get('mergeMoreLogicIntoFsm')) ? ' -expand' : '';
		return '; fsm' + ((fsmTransform == 'Enabled') ? '' : (' -nomap')) + expand;
	}
}

function randomizeNonce() {
	let nonce = '';
	const alphabet = '1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
	for (let i = 0; i < 32; i++) {
		nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
	}
	return nonce;
}

async function tryVerilogToYosys(verilogInput, fileNameWithoutExtension, fileExtension, optimizeInYosys, fsmOpt) {
	try {
		const yosysJson = await verilogToYosys(verilogInput, fileNameWithoutExtension, fileExtension, optimizeInYosys, fsmOpt);
		return yosysJson;
	} catch {
		vscode.window.showErrorMessage('yosys.js experienced a problem. Please check whether provided input file is valid System Verilog/Verilog program. You can check debug console to review Yosys error logs.');
		return;
	}
}

async function tryYosysToDigitalJson(yosysJson) {
	try {
		const digitalJson = await yosysToDigitalJson(yosysJson);
		return digitalJson;
	} catch {
		vscode.window.showErrorMessage('yosys2digitaljs experienced a problem.');
		return;
	}
}

 class DigitaljsPanel {
	static currentPanel = null;
	static viewType = 'DigitalJS-VSC';

	_panel;
	_extensionUri;
	_digitaljsInput = '';

	constructor(panel, extensionUri, digitaljsInput, fileName) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._digitaljsInput = digitaljsInput || '';
		this._updatePanel(fileName);
		this._panel.onDidDispose(() => this.dispose(), null);
	}

	static spawnPanel(extensionUri, digitaljsInput, fileName) {
		const config = vscode.workspace.getConfiguration('digitaljs-VSC');
		const spawnInTheSameColumn = config.get('spawnInTheSameColumn');
		const column = vscode.window.activeTextEditor
			? (spawnInTheSameColumn ? vscode.window.activeTextEditor.viewColumn : -2)
			: undefined;

		if (DigitaljsPanel.currentPanel) {
			DigitaljsPanel.currentPanel._digitaljsInput = digitaljsInput || '';
			DigitaljsPanel.currentPanel._updatePanel(fileName);
			DigitaljsPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			DigitaljsPanel.viewType,
			'DigitalJS-VSC',
			column,
			getDigitaljsPanelOptions(extensionUri),
		);
		const iconUri = vscode.Uri.joinPath(extensionUri, 'media', 'img', 'logo', 'digitaljs_logo.png');
		panel.iconPath = iconUri;
		DigitaljsPanel.currentPanel = new DigitaljsPanel(panel, extensionUri, digitaljsInput, fileName);
	}

	dispose() {
		DigitaljsPanel.currentPanel = undefined;
		this._panel.dispose();
	}

	async _updatePanel(fileName) {
		const webview = this._panel.webview;
		this._panel.title = 'DigitalJS-VSC' + ' (' + fileName + ')';
		this._panel.webview.html = this._getHtml(webview);
	}

	_getHtml(webview) {
		const digitaljsPath = vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'digitaljs', 'dist', 'main.js');
		const indexPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'index.js');
		const stylesPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.css');
		const digitaljsLogoSrc = 'https://raw.githubusercontent.com/tilk/digitaljs_online/master/public/android-chrome-192x192.png';

		const digitaljsUri = webview.asWebviewUri(digitaljsPath);
		const indexUri = (indexPath).with( { 'scheme': 'vscode-resource' } );
		const stylesUri = webview.asWebviewUri(stylesPath);
		const config = vscode.workspace.getConfiguration('digitaljs-VSC');
		const simplifyDiagram = config.get('simplifyDiagram');
		const layoutEngine = (config.get('layoutEngine') == 'ElkJS') ? 'elkjs' : 'dagre';
		const simulationEngine = config.get('simulationEngine');
		
		const randomNonce = randomizeNonce();
		const digitaljsInput = this._digitaljsInput;

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${digitaljsLogoSrc} data:; script-src 'nonce-${randomNonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
				<link href="${stylesUri}" rel="stylesheet">
				<title>DigitalJS-VSC</title>
			</head>
			<body>
				<div id="mediabox">
					<a href="https://digitaljs.tilk.eu/">
						<img src="${digitaljsLogoSrc}" width="40" height="40"/>
					</a>

					<button name="pause" class="prm left indentleft" type="button" title="Pause" disabled="true">⏸</button>
					<button name="resume" class="prm mid" type="button" title="Resume" disabled="true">▶️</button>
					<button name="fastFw" class="prm mid" type="button" title="Fast-forward" disabled="true">⏩</button>
					<button name="single" class="prm mid" type="button" title="Single step forward" disabled="true">➡️</button>
					<button name="next" class="prm right" type="button" title="Run until the next event" disabled="true">⏭</button>

					<input type="text" class="clock" placeholder="⏱" title="Current tick" disabled="disabled"/>
					<input type="text" id="tick" class="tickTimer" disabled="disabled" title="Current tick"/>
				</div>
				<div id="paper">
				</div>
				<div id="checkboxes">
					<input type="checkbox" name="fixed" class="check" title="Blocks moving and inspecting elements">Fixed Mode</input>
					<input type="checkbox" name="layout" class="check">Include layout information</button>
				</div>
				<div>
					<button name="serialize" class="serialize" type="button">Serialize and Reload</button>
				</div>
				<div id="mediabox">
						<button name="pptUp" class="snd left" type="button" title="Increase pixels per tick">+</button>
						<button name="pptDown" class="snd rightsnd" type="button" title="Decrease pixels per tick">-</button>

						<button name="live" class="snd left" type="button" title="Live mode">▶</button>
						<button name="left" class="snd mid" type="button" title="Move left">←</button>
						<button name="right" class="snd rightsnd" type="button" title="Move right">→</button>
				</div>
				<div id="monitor">
				</div>
				<div id="iopanel">
				</div>
				<script nonce="${randomNonce}">
					Object.assign(document, { digitaljsInput: ${digitaljsInput} }, ${JSON.stringify({simplifyDiagram, layoutEngine, simulationEngine})});
				</script>
				<script nonce="${randomNonce}" src="${digitaljsUri}"></script>
				<script nonce="${randomNonce}" src="${indexUri}"></script>
			</body>
			</html>`;
	}
}

function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerCommand('digitaljs-vsc.simulate', async () => {
			const verilogInput = readCurrentFile();
			if (!verilogInput) { return; }
			const fileName = getCurrentFileName();
			const fileNameArray = fileName.split('.');
			const fileExtension = fileNameArray[fileNameArray.length - 1];
			const fileNameWithoutExtension = fileName.replaceAll(' ', '_').replaceAll('.' + fileExtension, '');
			if (fileExtension != 'sv' && fileExtension != 'v') {
				vscode.window.showErrorMessage('Input file for "simulate" command needs to have ".sv" or ".v" extension.');
				return;
			}
			const config = vscode.workspace.getConfiguration('digitaljs-VSC');
			const optimizeInYosys = config.get('optimizeInYosys');
			const fsmOpt = getFsmOptions(config);
			const yosysJson = await tryVerilogToYosys(verilogInput, fileNameWithoutExtension, fileExtension, optimizeInYosys, fsmOpt);
			if (!yosysJson) { return; }
			const digitalJson = await tryYosysToDigitalJson(yosysJson);
			if (!digitalJson) { return; }
			DigitaljsPanel.spawnPanel(context.extensionUri, JSON.stringify(digitalJson), fileName);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('digitaljs-vsc.digitalize', async () => {
			const digitalJson = readCurrentFile();
			if (!digitalJson) { return; }
			const fileName = getCurrentFileName();
			const fileNameArray = fileName.split('.');
			const fileExtension = fileNameArray[fileNameArray.length - 1];
			if (fileExtension != 'json') { 
				vscode.window.showErrorMessage('Input file for "digitalize" command needs to be of ".json" extension.');
				return;
			}
			DigitaljsPanel.spawnPanel(context.extensionUri, digitalJson, fileName);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('digitaljs-vsc.jsonize', async () => {
			const verilogInput = readCurrentFile();
			if (!verilogInput) { return; }
			const fileName = getCurrentFileName();
			const fileNameArray = fileName.split('.');
			const fileExtension = fileNameArray[fileNameArray.length - 1];
			const fileNameWithoutExtension = fileName.replaceAll(' ', '_').replaceAll('.' + fileExtension, '');
			if (fileExtension != 'sv' && fileExtension != 'v') {
				vscode.window.showErrorMessage('Input file for "jsonize" command needs to have ".sv" or ".v" extension.');
				return;
			}
			const config = vscode.workspace.getConfiguration('digitaljs-VSC');
			const optimizeInYosys = config.get('optimizeInYosys');
			const fsmOpt = getFsmOptions(config);
			const yosysJson = await tryVerilogToYosys(verilogInput, fileNameWithoutExtension, fileExtension, optimizeInYosys, fsmOpt);
			if (!yosysJson) { return; }
			const digitalJson = await tryYosysToDigitalJson(yosysJson);
			if (!digitalJson) { return; }
			const circuit = JSON.stringify(digitalJson, null, 2);
			const doc = await vscode.workspace.openTextDocument( {language: 'json', content: circuit} );
			vscode.window.showTextDocument(doc);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('digitaljs-vsc.examples', async () => {
			const examplesUri = vscode.Uri.joinPath(context.extensionUri, 'examples');
			vscode.commands.executeCommand('vscode.openFolder', examplesUri);
		})
	);
}

function deactivate() {
	if (DigitaljsPanel.currentPanel) {
		DigitaljsPanel.currentPanel.dispose();
	}
}

module.exports = {
	activate,
	deactivate
}
