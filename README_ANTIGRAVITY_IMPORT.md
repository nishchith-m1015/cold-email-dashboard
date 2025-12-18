# Import VS Code extensions into Antigravity

Summary
- Scripts added under `scripts/` to export VS Code extensions, merge with repo recommendations, and bulk-install via the Antigravity CLI.

Files added
- `scripts/export-and-prepare.sh` — exports installed extensions, extracts `./.vscode/extensions.json` recommendations (creates file if missing), and writes a deduped list to `~/vscode-extensions-uniq.txt`.
- `scripts/install-antigravity.sh` — bulk-installs extension IDs from `~/vscode-extensions-uniq.txt` using the Antigravity CLI; logs to `~/antigravity-install-log.txt` and failed installs to `~/antigravity-install-failed.txt`.
- `scripts/manual-install.csv` — empty CSV to track manual mappings or VSIX installs.
- `./.vscode/extensions.json` — project recommendations file (created if not present).

Quick start
1. Export and prepare lists:
```bash
./scripts/export-and-prepare.sh
```
2. Inspect the unique list:
```bash
cat ~/vscode-extensions-uniq.txt
```
3. Run the bulk installer (ensure `antigravity` CLI is on PATH):
```bash
./scripts/install-antigravity.sh
```

If any installs fail, check `~/antigravity-install-failed.txt` and `~/antigravity-install-log.txt`. For failures:
- Try `antigravity extension install ./some-extension.vsix` after downloading the VSIX from the Marketplace.
- Add the extension row to `scripts/manual-install.csv` with notes for manual actions.

Settings/keybindings
- Backup VS Code settings (macOS):
```bash
cp "$HOME/Library/Application Support/Code/User/settings.json" "$HOME/vscode-settings-backup.json"
cp "$HOME/Library/Application Support/Code/User/keybindings.json" "$HOME/vscode-keybindings-backup.json"
```
- Check Antigravity docs for a JSON import path or UI import; if available, import the above files.

Notes
- Some extensions may require signing into marketplaces or paid licenses; these will be listed in the failed installs file for manual resolution.
