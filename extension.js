const vscode = require("vscode");

/**
 * Get repo info using VS Code Git API (NOT shell)
 */
async function getRepo() {
	const gitExtension = vscode.extensions.getExtension("vscode.git");

	if (!gitExtension) return null;

	const git = gitExtension.exports.getAPI(1);

	const repos = git.repositories;

	if (!repos || repos.length === 0) return null;

	const repo = repos[0];

	const remote = repo.state.remotes.find(r => r.name === "origin");

	if (!remote || !remote.fetchUrl) return null;

	const match = remote.fetchUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);

	if (!match) return null;

	return {
		repo: `${match[1]}/${match[2]}`,
		branch: repo.state.HEAD?.name || "unknown"
	};
}

function activate(context) {
	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		100
	);

	async function update() {
		const data = await getRepo();

		if (!data) {
			statusBarItem.text = `$(git-branch) no-repo`;
			statusBarItem.show();
			return;
		}

		statusBarItem.text = `$(repo) ${data.repo}`;
		statusBarItem.tooltip = `Git repository: ${data.repo}`;
		statusBarItem.show();
	}

	update();

	// React to Git changes
	vscode.window.onDidChangeActiveTextEditor(update, null, context.subscriptions);
	vscode.workspace.onDidSaveTextDocument(update, null, context.subscriptions);

	// Git state updates (IMPORTANT FIX)
	const gitExtension = vscode.extensions.getExtension("vscode.git");

	if (gitExtension) {
		gitExtension.activate().then(() => {
			const git = gitExtension.exports.getAPI(1);

			git.onDidOpenRepository(update);
		});
	}

	// fallback refresh
	const interval = setInterval(update, 3000);

	context.subscriptions.push({
		dispose: () => clearInterval(interval)
	});
}

function deactivate() { }

module.exports = { activate, deactivate };
