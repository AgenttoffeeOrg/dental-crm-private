# CodeRabbit Setup Guide

This document describes the CodeRabbit AI code review setup for the Dental CRM repository.

## Configuration File

- `.coderabbit.yaml` - CodeRabbit configuration file

## Setup Steps

1. **Install CodeRabbit GitHub App**:
   - Go to https://coderabbit.ai
   - Install the GitHub App for your repository
   - Grant necessary permissions

2. **Configure Repository**:
   - The `.coderabbit.yaml` file is already configured
   - CodeRabbit will automatically use this configuration

3. **Enable Analyzers** (if not already done):
   - Go to your repository settings in CodeRabbit
   - Ensure the following analyzers are enabled:
     - JavaScript (with React and NodeJS environments)
     - Secrets detection
     - Shell script analysis
     - SQL analysis
     - Test coverage

## Configuration Details

### Analyzers Enabled

- **JavaScript**: Analyzes TypeScript/JavaScript code with React and Node.js support
- **Secrets**: Detects accidentally committed API keys and credentials
- **Shell**: Analyzes shell scripts in `scripts/` directory
- **SQL**: Analyzes SQL migrations in `supabase/migrations/`
- **Test Coverage**: Tracks test coverage metrics

### Review Settings

- **Always Review**: CodeRabbit reviews all pull requests
- **Comment on PRs**: Provides detailed feedback on code changes
- **Request Changes**: Automatically requests changes for security, performance, or breaking changes

### Custom Prompts

The configuration includes custom prompts for:

- Next.js 14 best practices
- React 19 patterns
- Database and Supabase best practices

### Ignored Paths

The following paths are excluded from analysis:

- `node_modules/`
- `.next/`
- Test files (`*.test.ts`, `*.spec.ts`)
- Test directories (`tests/`, `__tests__/`)

## Features

- **Security Checks**: Detects secrets, SQL injection, XSS, CSRF vulnerabilities
- **Code Quality**: Checks complexity, duplication, maintainability
- **Performance**: Monitors bundle size, database queries, API response times
- **Best Practices**: Enforces TypeScript, error handling, logging, accessibility

## Usage

CodeRabbit will automatically:

1. Review all pull requests
2. Comment on code changes
3. Request changes for critical issues
4. Provide suggestions for improvements

## Customization

To modify CodeRabbit behavior, edit `.coderabbit.yaml`:

- Add/remove analyzers
- Change review thresholds
- Modify ignore patterns
- Add custom prompts

## Documentation

- [CodeRabbit Documentation](https://docs.coderabbit.ai/)
- [Configuration Reference](https://docs.coderabbit.ai/configuration)
