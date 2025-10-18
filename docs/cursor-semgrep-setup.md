# Semgrep Integration in Cursor IDE

## 🚀 Automatic Inline Security Analysis

Semgrep is now configured to run automatically in Cursor, showing security issues **inline while you code** - just like spell check for security vulnerabilities!

---

## ✅ Installation (One-Time Setup)

### Step 1: Install Semgrep Extension

Cursor should automatically prompt you to install the recommended extension. If not:

1. **Open Command Palette**: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Extensions: Install Extensions`
3. Search for: **"Semgrep"**
4. Click **Install** on the official "Semgrep" extension by Semgrep, Inc.

**Or install via terminal**:
```bash
# If cursor CLI is available
cursor --install-extension Semgrep.semgrep
```

---

### Step 2: Connect to Semgrep Cloud (Recommended)

For the best experience, connect the extension to your Semgrep Cloud account:

1. **Open Command Palette**: `Cmd+Shift+P`
2. Type: `Semgrep: Sign In`
3. Follow the browser prompt to authenticate
4. Extension will sync with your team's rulesets from Semgrep Cloud

**Benefits of Cloud Connection**:
- ✅ Use the same rules as CI (consistency)
- ✅ Share suppressions across team
- ✅ Track findings over time
- ✅ Access to Semgrep Teams features

---

### Step 3: Verify Installation

1. Open any TypeScript/JavaScript file in `src/`
2. Look for the Semgrep icon in the status bar (bottom right)
3. Check for inline warnings/errors (wavy underlines)
4. Hover over findings to see remediation advice

---

## 🎯 What You'll See

### Inline Diagnostics

As you code, Semgrep will show findings **in real-time**:

```typescript
// ❌ ERROR: SQL injection vulnerability detected
const query = `SELECT * FROM users WHERE id = ${userId}`;
//            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//            Semgrep: Use parameterized queries to prevent SQL injection

// ✅ FIXED: Use parameterized query
const query = sql`SELECT * FROM users WHERE id = ${userId}`;
```

### Severity Indicators

- 🔴 **Red squiggle**: ERROR (High/Critical) - Must fix before PR merges
- 🟡 **Yellow squiggle**: WARNING (Medium) - Should fix
- 🔵 **Blue squiggle**: INFO (Low) - Nice to fix

### Problems Panel

View all findings in one place:

1. **Open Problems Panel**: `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` (Windows/Linux)
2. Filter by: **Semgrep**
3. Click any finding to jump to code

---

## ⚙️ Configuration

### Workspace Settings (Already Configured!)

The following settings are already configured in `.vscode/settings.json`:

```json
{
  "semgrep.enable": true,
  "semgrep.scan": {
    "configuration": ["auto"],
    "exclude": ["node_modules/**", "dist/**", ".next/**"],
    "include": ["src/**", "components/**", "app/**"],
    "jobs": 4
  },
  "semgrep.url": "https://semgrep.dev",
  "semgrep.notification": true
}
```

### Ignored Files

`.semgrepignore` already configured to skip:
- `node_modules/` (dependencies)
- `dist/`, `build/`, `.next/` (build outputs)
- `*.test.ts`, `*.spec.ts` (test files)
- `coverage/` (test coverage)

---

## 🔧 Usage

### Automatic Scanning

Semgrep runs **automatically** on:
- ✅ When you open a file
- ✅ When you save a file
- ✅ When you type (with smart throttling)

**No manual action needed!** 🎉

### Manual Scanning

To force a scan:

1. **Open Command Palette**: `Cmd+Shift+P`
2. Type: `Semgrep: Scan Workspace`
3. Wait for scan to complete

### Scan Specific File

1. Open the file you want to scan
2. **Command Palette**: `Cmd+Shift+P`
3. Type: `Semgrep: Scan Current File`

---

## 🛠️ Actions on Findings

### View Details

**Hover** over any squiggle to see:
- Rule description
- Why it's a problem
- How to fix it
- CWE/OWASP references

### Quick Fixes

Some findings have **automatic fixes**:
1. Click the lightbulb 💡 icon
2. Select **"Quick Fix"**
3. Code is automatically corrected

### Suppress Finding

If it's a false positive:

```typescript
// nosemgrep: rule-id-here
const intentionalCode = dangerousButNecessary();
```

**Always add a comment explaining WHY!**

---

## 🔄 Sync with CI

### Same Rules as CI

When connected to Semgrep Cloud:
- ✅ Extension uses **same rules** as CI workflow
- ✅ Findings match what PR checks will see
- ✅ No surprises when you push!

### Baseline Scanning

The extension scans **all code** (not just changes), but:
- Focus on **ERROR** severity (these block PRs)
- **WARNING/INFO** can be addressed incrementally

---

## 📊 Performance

### Scanning Speed

- **Small files** (< 100 lines): < 1 second
- **Large files** (1000+ lines): 2-5 seconds
- **Full workspace**: 1-2 minutes (first time only)

### Optimization

Semgrep is optimized to:
- ✅ Scan only changed files (incremental)
- ✅ Use multiple threads (parallel scanning)
- ✅ Cache results (fast re-scans)
- ✅ Skip excluded files (.semgrepignore)

---

## 🎛️ Extension Commands

Access via Command Palette (`Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `Semgrep: Scan Workspace` | Scan all files in workspace |
| `Semgrep: Scan Current File` | Scan only the active file |
| `Semgrep: Sign In` | Connect to Semgrep Cloud |
| `Semgrep: Sign Out` | Disconnect from Semgrep Cloud |
| `Semgrep: Show Output` | View Semgrep extension logs |
| `Semgrep: Restart Language Server` | Fix extension issues |

---

## 🐛 Troubleshooting

### Issue: "Semgrep extension not working"

**Solutions**:
1. Check extension is installed:
   - `Cmd+Shift+X` → Search "Semgrep" → Should show "Installed"
2. Restart Cursor:
   - `Cmd+Q` (Mac) or close and reopen
3. Check Semgrep is running:
   - Status bar (bottom right) should show Semgrep icon
4. View logs:
   - Command Palette → `Semgrep: Show Output`

### Issue: "No findings showing up"

**Solutions**:
1. Force a scan:
   - Command Palette → `Semgrep: Scan Workspace`
2. Check file is not ignored:
   - Review `.semgrepignore`
3. Verify file type supported:
   - TypeScript, JavaScript, Python, Go, Java, etc.
4. Sign in to Semgrep Cloud:
   - Command Palette → `Semgrep: Sign In`

### Issue: "Too many false positives"

**Solutions**:
1. Suppress with justification:
   ```typescript
   // nosemgrep: rule-id
   // JUSTIFICATION: This is safe because...
   ```
2. Report false positive:
   - Click "Report Issue" in hover
   - Helps improve Semgrep rules
3. Configure in Semgrep Cloud:
   - Disable overly noisy rules
   - Adjust severity levels

### Issue: "Extension is slow"

**Solutions**:
1. Add more exclusions to `.semgrepignore`:
   ```
   vendor/
   third_party/
   ```
2. Reduce parallel jobs in settings:
   ```json
   "semgrep.scan": { "jobs": 2 }
   ```
3. Scan only on save (not on type):
   ```json
   "semgrep.scan.onSave": true,
   "semgrep.scan.onChange": false
   ```

---

## 🔐 Security & Privacy

### What Data is Sent?

When connected to Semgrep Cloud:
- ✅ **Code snippets** with findings (for analysis)
- ✅ **File paths** (relative to project root)
- ✅ **Finding metadata** (severity, rule ID)

**NOT sent**:
- ❌ Full source code
- ❌ Credentials or secrets
- ❌ Environment variables
- ❌ Personal information

### Offline Mode

To scan locally without cloud connection:
1. Don't sign in to Semgrep Cloud
2. Extension uses local rules only
3. No data sent to Semgrep servers

---

## 📚 Comparison: IDE vs CI

### Semgrep in Cursor (IDE)

**When**: While you code (real-time)  
**Purpose**: Catch issues early, before commit  
**Scope**: Files you're editing  
**Baseline**: Scans all code (shows all findings)

### Semgrep in CI (GitHub Actions)

**When**: On PR and push to main  
**Purpose**: Enforce security standards, block bad code  
**Scope**: Entire codebase  
**Baseline**: Only NEW findings (compares with main)

### Together

**Best workflow**:
1. 🟢 **Code in Cursor** → See findings inline
2. 🟡 **Fix ERROR severity** → Before committing
3. 🔵 **Commit & push** → CI scans with baseline
4. ✅ **PR passes** → Only new issues (if any) block

---

## 🎯 Best Practices

### 1. Fix as You Code
Don't wait for CI - fix ERROR severity findings immediately in IDE.

### 2. Use Quick Fixes
When available, use automatic fixes (💡 lightbulb icon).

### 3. Suppress Thoughtfully
Only suppress false positives, and **always explain why**:
```typescript
// nosemgrep: rule-id
// JUSTIFICATION: This is safe because [specific reason]
```

### 4. Review Warnings
Even if they don't block, warnings often indicate real issues.

### 5. Keep Extension Updated
Semgrep releases new rules weekly. Keep extension current:
- Command Palette → `Extensions: Check for Extension Updates`

### 6. Share Configuration
This workspace is already configured! When others clone the repo:
- They'll see the same settings
- Cursor will prompt to install Semgrep
- Consistent experience across team

---

## 🚀 Advanced Usage

### Custom Rules

Create `.semgrep.yml` in project root:

```yaml
rules:
  - id: no-console-in-production
    pattern: console.log(...)
    languages: [javascript, typescript]
    severity: WARNING
    message: Don't use console.log in production
```

Extension will automatically use custom rules.

### Override Settings (Personal)

Add to your **User Settings** (not workspace):

```json
{
  "semgrep.notification": false,  // Disable notifications
  "semgrep.scan.jobs": 8          // More threads
}
```

### Keybindings

Add custom shortcuts in `keybindings.json`:

```json
{
  "key": "cmd+shift+s",
  "command": "semgrep.scanWorkspace"
}
```

---

## 📊 Metrics & Insights

### View Statistics

- **Total findings**: Problems panel count
- **By severity**: Filter in Problems panel
- **By rule**: Hover over findings

### Track Progress

- Fix findings over time
- See improvement in Semgrep Cloud dashboard
- Compare with team metrics

---

## 🔗 Resources

- **Semgrep Docs**: https://semgrep.dev/docs
- **Semgrep Extension**: https://marketplace.visualstudio.com/items?itemName=Semgrep.semgrep
- **Rule Registry**: https://semgrep.dev/r (browse all rules)
- **Playground**: https://semgrep.dev/playground (test rules)
- **Community**: https://go.semgrep.dev/slack

---

## ✅ Quick Checklist

- [ ] Install Semgrep extension in Cursor
- [ ] Sign in to Semgrep Cloud (optional but recommended)
- [ ] Open a TypeScript file and verify findings appear
- [ ] Check status bar for Semgrep icon
- [ ] Review Problems panel (`Cmd+Shift+M`)
- [ ] Fix any ERROR severity findings
- [ ] Commit and push (CI will run with baseline)

---

**Congratulations!** 🎉 You now have **real-time security analysis** while coding. No more surprises in CI!

---

*Last updated: October 17, 2025*


