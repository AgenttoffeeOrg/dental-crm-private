# SQLFluff Setup Guide

## 🗄️ SQL Linting with SQLFluff for Postgres/Supabase

This project uses [SQLFluff](https://www.sqlfluff.com/) to maintain SQL code quality and consistency across our Supabase migrations and queries.

## 📁 SQL Files Covered

SQLFluff will lint all SQL files in:
- `supabase/migrations/*.sql` - Database migrations
- `supabase/functions/*.sql` - SQL functions
- `supabase/sql/*.sql` - Utility SQL scripts
- `supabase/seed/*.sql` - Seed data scripts
- `scripts/*.sql` - Deployment and test scripts
- `tests/verification/sql/*.sql` - Test SQL files
- `docs/hardening/*.sql` - Documentation SQL examples

**Total: 150+ SQL files**

## 🚀 Quick Start

### Option 1: Using pipx (Recommended)

```bash
# Install pipx if you don't have it
brew install pipx  # macOS
# or: python3 -m pip install --user pipx

# Install SQLFluff
pipx install sqlfluff

# Lint all SQL files
sqlfluff lint .

# Auto-fix SQL formatting issues
sqlfluff fix . --force
```

### Option 2: Using pip

```bash
# Install SQLFluff
pip install sqlfluff

# Or install globally
python3 -m pip install --user sqlfluff

# Lint all SQL files
sqlfluff lint .

# Auto-fix SQL formatting issues
sqlfluff fix . --force
```

### Option 3: Using npm scripts

```bash
# Lint SQL files (requires SQLFluff installed)
npm run lint:sql

# Auto-fix SQL formatting
npm run fix:sql
```

## 🔧 Pre-commit Hooks

To automatically lint SQL files before each commit:

```bash
# Install pre-commit (if not already installed)
pip install pre-commit
# or: brew install pre-commit

# Install the git hooks
pre-commit install

# Run manually on all files
pre-commit run --all-files
```

Now SQLFluff will run automatically on your SQL files whenever you commit!

## 📋 Configuration

SQLFluff is configured via `.sqlfluff` with these settings:
- **Dialect**: PostgreSQL (Supabase)
- **Templater**: Jinja (for basic templating)
- **Max line length**: 120 characters
- **Keyword style**: UPPERCASE
- **Identifier style**: lowercase

## 🎯 Common Rules Enforced

- **L001**: Indentation consistency
- **L003**: Comma placement and spacing
- **L010**: Keywords should be uppercase (SELECT, FROM, WHERE)
- **L014**: Unquoted identifiers should be lowercase
- **L019**: Comma placement (trailing preferred)
- **L042**: No unnecessary INNER JOIN (use JOIN)
- **L045**: Query should define column aliases

## 🔍 Example Usage

```bash
# Lint a specific file
sqlfluff lint supabase/migrations/20251018_001_extend_tenants.sql

# Lint migrations only
sqlfluff lint supabase/migrations/

# Fix issues in a specific directory
sqlfluff fix supabase/migrations/ --force

# Show diff of what would be changed
sqlfluff fix . --show-lint-violations

# Use verbose mode for more details
sqlfluff lint . --verbose
```

## ❌ Ignoring Rules

To ignore specific rules, add them to `.sqlfluff`:

```ini
[sqlfluff]
exclude_rules = L003,L014
```

Or ignore inline with comments:

```sql
-- noqa: L003
SELECT col1,col2,col3 FROM table;

-- noqa (disables all rules for next line)
SELECT * FROM users;
```

## 🤖 CI/CD Integration

SQLFluff runs automatically on:
- ✅ Pull requests to `main`
- ✅ Pushes to `main`
- ✅ Manual workflow dispatch

Failed SQL lints will block PR merges.

## 📚 Resources

- [SQLFluff Documentation](https://docs.sqlfluff.com/)
- [Postgres Dialect Rules](https://docs.sqlfluff.com/en/stable/dialects.html#postgres)
- [Rule Reference](https://docs.sqlfluff.com/en/stable/rules.html)

## 💡 Tips

1. **Fix automatically**: Most issues can be auto-fixed with `sqlfluff fix . --force`
2. **Run before commit**: Use pre-commit hooks to catch issues early
3. **Batch fixes**: Fix migrations in batches to avoid breaking changes
4. **Document exceptions**: Use `-- noqa` comments with explanations
5. **Team consistency**: All team members should use the same SQLFluff version

## 🆘 Troubleshooting

**"sqlfluff: command not found"**
- Ensure SQLFluff is installed: `pipx install sqlfluff`
- Add to PATH: `export PATH="$HOME/.local/bin:$PATH"`

**"No SQL files found"**
- Check you're in the project root
- Verify `.sqlfluffignore` isn't excluding too much

**"Templating errors"**
- We ignore templating errors in CI (`ignore_templating_errors = True`)
- For local development, you can wrap variables in jinja: `{{ variable }}`

## 🎨 VS Code Integration

Install the [SQLFluff extension](https://marketplace.visualstudio.com/items?itemName=dorzey.vscode-sqlfluff) for:
- Real-time SQL linting
- Inline error annotations  
- Quick-fix suggestions
- Format-on-save

Add to `.vscode/settings.json`:

```json
{
  "sqlfluff.executablePath": "sqlfluff",
  "sqlfluff.dialect": "postgres",
  "[sql]": {
    "editor.defaultFormatter": "dorzey.vscode-sqlfluff",
    "editor.formatOnSave": true
  }
}
```

---

**Questions?** Check the [SQLFluff docs](https://docs.sqlfluff.com/) or ask the team!

