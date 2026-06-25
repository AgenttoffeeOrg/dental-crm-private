# SonarCloud Setup Guide

Your project is already configured for SonarCloud! Here's how to run it.

## ✅ Current Configuration

Your `sonar-project.properties` is already set up:
- **Project Key:** `AgenttoffeeOrg_dental-crm-private`
- **Organization:** `agenttoffeeorg`
- **Sources:** `src/`
- **Tests:** `tests/`, `__tests__/`

---

## 🚀 Quick Start

### Option 1: Using the Script (Easiest)

```bash
# 1. Get your token from https://sonarcloud.io → My Account → Security
# 2. Set it:
export SONAR_TOKEN=your_token_here

# 3. Run analysis
npm run analyze:sonarcloud
```

### Option 2: Manual Run

```bash
# 1. Install SonarScanner
npm install -g sonarqube-scanner

# 2. Set token
export SONAR_TOKEN=your_token_here

# 3. Run
sonar-scanner
```

---

## 📋 Detailed Setup Steps

### Step 1: Get Your SonarCloud Token

1. Go to **https://sonarcloud.io**
2. Log in with your GitHub account
3. Navigate to **My Account** → **Security**
4. Click **Generate Token**
5. Name it "dental-crm-analysis"
6. **Copy the token** (you'll only see it once!)

### Step 2: Install SonarScanner

**Option A: Using npm (Recommended)**
```bash
npm install -g sonarqube-scanner
```

**Option B: Using Homebrew (macOS)**
```bash
brew install sonar-scanner
```

**Option C: Using Docker**
```bash
docker pull sonarsource/sonar-scanner-cli
```

### Step 3: Set Your Token

**Temporary (for this session):**
```bash
export SONAR_TOKEN=your_token_here
```

**Permanent (add to `.env.local`):**
```bash
echo "SONAR_TOKEN=your_token_here" >> .env.local
```

**Note:** Add `.env.local` to `.gitignore` if not already there!

### Step 4: Run Analysis

**Using the script:**
```bash
npm run analyze:sonarcloud
```

**Or manually:**
```bash
sonar-scanner
```

---

## 🔄 Automated Analysis (GitHub Actions)

I've created a GitHub Actions workflow (`.github/workflows/sonarcloud.yml`) that will:
- ✅ Run SonarCloud analysis on every push to `main` or `develop`
- ✅ Run on pull requests
- ✅ Can be triggered manually

### Setup GitHub Actions:

1. **Add SonarCloud token to GitHub Secrets:**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SONAR_TOKEN`
   - Value: Your SonarCloud token
   - Click "Add secret"

2. **Push the workflow file:**
   ```bash
   git add .github/workflows/sonarcloud.yml
   git commit -m "Add SonarCloud GitHub Actions workflow"
   git push
   ```

3. **View results:**
   - Go to Actions tab in GitHub
   - SonarCloud analysis will run automatically
   - Results appear at: https://sonarcloud.io

---

## 📊 What SonarCloud Analyzes

- ✅ **Code Quality:** Complexity, maintainability, reliability
- ✅ **Security:** Vulnerabilities, security hotspots
- ✅ **Code Smells:** Bad practices, technical debt
- ✅ **Duplication:** Code duplication detection
- ✅ **Test Coverage:** Coverage metrics
- ✅ **Bugs:** Potential bugs and issues

---

## 🎯 View Results

After running analysis, view results at:
**https://sonarcloud.io/project/overview?id=AgenttoffeeOrg_dental-crm-private**

You'll see:
- **Quality Gate Status** (Pass/Fail)
- **Code Coverage** percentage
- **Security Vulnerabilities**
- **Code Smells**
- **Technical Debt**
- **Hotspots** (files needing attention)

---

## 🔧 Troubleshooting

### Error: "sonar-scanner: command not found"
```bash
# Install SonarScanner
npm install -g sonarqube-scanner
# or
brew install sonar-scanner
```

### Error: "SONAR_TOKEN is not set"
```bash
# Set the token
export SONAR_TOKEN=your_token_here

# Or add to .env.local
echo "SONAR_TOKEN=your_token_here" >> .env.local
```

### Error: "Project not found"
- Make sure your project exists at: https://sonarcloud.io
- Check `sonar-project.properties` has correct project key
- Verify organization name matches

### Error: "Authentication failed"
- Check your token is correct
- Make sure token hasn't expired
- Regenerate token if needed

---

## 📝 Configuration File

Your `sonar-project.properties` includes:
- Source directories: `src/`
- Test directories: `tests/`, `__tests__/`
- Exclusions: `node_modules`, `.next`, test files
- SQL file patterns

You can customize it if needed. See: https://docs.sonarcloud.io/getting-started/analysis/

---

## 🚀 Next Steps

1. **Get your token** from SonarCloud
2. **Install SonarScanner:** `npm install -g sonarqube-scanner`
3. **Set token:** `export SONAR_TOKEN=your_token_here`
4. **Run analysis:** `npm run analyze:sonarcloud`
5. **View results:** https://sonarcloud.io

---

## 💡 Tips

- **Run regularly:** Add to your CI/CD pipeline
- **Fix critical issues first:** Focus on security and bugs
- **Set up quality gates:** Configure pass/fail criteria
- **Track technical debt:** Monitor and reduce over time

---

**Need help?** Check SonarCloud docs: https://docs.sonarcloud.io/
