# 🚀 Activate Semgrep in Cursor IDE

## ✅ Setup Complete - Just 2 Steps to Activate!

Everything is configured! Just install the extension and you'll get **real-time security analysis** while coding.

---

## Step 1: Install Semgrep Extension (30 seconds)

Cursor should automatically prompt you to install recommended extensions. If you see the popup:
- Click **"Install All"** or **"Install"** for Semgrep

**Or install manually**:

1. Press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux)
2. Search for: **"Semgrep"**
3. Click **Install** on the official extension by "Semgrep, Inc."
4. Wait for installation to complete

---

## Step 2: Sign In to Semgrep Cloud (1 minute)

Connect the extension to use your team's rules:

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: **"Semgrep: Sign In"**
3. Press Enter
4. Browser opens → Click **"Authorize"**
5. Return to Cursor

✅ **Done!** You're now connected.

---

## 🎉 What You'll See

### Immediate Benefits

As soon as you open a TypeScript/JavaScript file:

**1. Inline Warnings** (while you type):
```typescript
const query = `SELECT * FROM users WHERE id = ${id}`;
//            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//            🔴 SQL injection vulnerability
```

**2. Problems Panel** (press `Cmd+Shift+M`):
- All security findings in one place
- Filter by Semgrep
- Click to jump to code

**3. Hover Tooltips**:
- Detailed explanation
- How to fix
- Code examples

**4. Status Bar** (bottom right):
- Semgrep icon shows scan status
- Click for details

---

## 🔥 Try It Now!

1. Open: `src/components/auth/login.tsx` (or any `.ts`/`.tsx` file)
2. Wait 2-3 seconds for scan
3. Look for squiggles (wavy underlines)
4. Hover over any finding
5. See the magic! ✨

---

## ⚙️ Already Configured

You don't need to configure anything - it's already set up!

**What's configured**:
- ✅ `.vscode/settings.json` - Extension settings
- ✅ `.vscode/extensions.json` - Recommended extensions
- ✅ `.semgrepignore` - Performance optimization
- ✅ Workspace scans: `src/`, `components/`, `app/`, `lib/`
- ✅ Excluded: `node_modules/`, `dist/`, `.next/`, test files

---

## 🎯 How It Works

### Automatic Scanning

Semgrep runs automatically when you:
- ✅ Open a file
- ✅ Save a file (`Cmd+S`)
- ✅ Type code (with smart throttling)

**No manual action needed!**

### Same Rules as CI

When signed in to Semgrep Cloud:
- Uses **your team's rulesets** (configured in Semgrep Cloud)
- Same findings as GitHub PR checks
- **No surprises when you push!**

---

## 🛠️ Quick Commands

Press `Cmd+Shift+P` and type:

| Command | What it does |
|---------|--------------|
| `Semgrep: Scan Workspace` | Scan all files now |
| `Semgrep: Sign In` | Connect to Semgrep Cloud |
| `Semgrep: Show Output` | View extension logs |

---

## 📖 Full Documentation

For advanced usage, troubleshooting, and best practices:

👉 **[docs/cursor-semgrep-setup.md](./docs/cursor-semgrep-setup.md)**

Includes:
- All extension commands
- Custom configuration
- Troubleshooting guide
- Performance optimization
- Best practices

---

## 🎊 That's It!

You now have:
- ✅ **CI checks** (GitHub Actions with baseline scanning)
- ✅ **IDE analysis** (Cursor with real-time feedback)
- ✅ **Same rules** (synced via Semgrep Cloud)
- ✅ **Complete coverage** (catch issues before they reach CI)

**Happy secure coding!** 🛡️

---

## ❓ Need Help?

**Extension not working?**
1. Restart Cursor (`Cmd+Q` then reopen)
2. Check extension is installed: `Cmd+Shift+X` → Search "Semgrep"
3. View logs: `Cmd+Shift+P` → `Semgrep: Show Output`

**No findings showing?**
1. Force scan: `Cmd+Shift+P` → `Semgrep: Scan Workspace`
2. Sign in: `Cmd+Shift+P` → `Semgrep: Sign In`
3. Check file type is supported (TypeScript, JavaScript, etc.)

**Still stuck?**
- See full troubleshooting guide: [docs/cursor-semgrep-setup.md](./docs/cursor-semgrep-setup.md)
- Semgrep Slack: https://go.semgrep.dev/slack

---

*Generated: October 17, 2025*


