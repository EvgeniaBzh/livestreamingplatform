# Prettier + Husky Setup Guide

This document explains the automatic code formatting system configured in this project.

## 🎯 What This Setup Does

- **Automatically formats code** when you commit
- **Ensures consistent styling** across the entire project
- **Works for all contributors** with zero manual setup
- **Prevents poorly formatted code** from entering the repository

## 🛠️ How It Works

### The Tools

- **Prettier:** Code formatter that fixes spacing, quotes, semicolons, etc.
- **Husky:** Manages Git hooks to run scripts during Git events
- **lint-staged:** Only runs Prettier on files you're committing (not all files)

### The Flow

```
1. Developer commits code: git commit -m "my changes"
2. Git triggers pre-commit hook
3. Husky runs .husky/pre-commit script
4. Script executes: npx lint-staged
5. lint-staged finds staged .js/.jsx files
6. Prettier formats those files
7. Formatted files are staged automatically
8. Commit proceeds with clean code
```

## 📁 Configuration Files

### `.prettierrc` - Formatting Rules

```json
{
  "semi": true, // Use semicolons
  "trailingComma": "es5", // Add commas where ES5 allows
  "singleQuote": true, // Use single quotes
  "printWidth": 80, // Wrap lines at 80 characters
  "tabWidth": 2, // Use 2 spaces for indentation
  "useTabs": false // Use spaces, not tabs
}
```

### `.prettierignore` - Files to Skip

```
node_modules/
build/
dist/
*.min.js
*.min.css
```

### `.husky/pre-commit` - Git Hook

```bash
npx lint-staged
```

### `package.json` - Scripts and Configuration

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,jsx}": ["prettier --write"]
  }
}
```

## 🚀 Getting Started

### For New Contributors

1. Clone the repository
2. Run `npm install`
3. Start coding! Formatting happens automatically on commit.

**That's it!** No manual setup required.

## 🔨 Initial Setup (How This Was Configured)

_This section documents how the formatting system was originally set up in this project. New contributors don't need to do this - it's already configured!_

### Step 1: Install Dependencies

```bash
npm install --save-dev prettier husky lint-staged
```

### Step 2: Create Prettier Configuration

Create `.prettierrc` in project root:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Step 3: Create Prettier Ignore File

Create `.prettierignore` in project root:

```
node_modules/
build/
dist/
*.min.js
*.min.css
```

### Step 4: Add Scripts to package.json

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{js,jsx}": ["prettier --write"]
  }
}
```

### Step 5: Initialize Husky

```bash
npx husky init
```

### Step 6: Create Pre-commit Hook

```bash
echo "npx lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Step 7: Format Existing Files

```bash
npm run format
```

### Step 8: Test the Setup

```bash
# Make a small change and commit to verify it works
echo "// test" >> src/someFile.js
git add .
git commit -m "test prettier setup"
```

### Step 9: Commit the Configuration

```bash
git add .prettierrc .prettierignore .husky/ package.json
git commit -m "Add Prettier with automatic formatting"
```

### Example: What Gets Formatted

**Before commit:**

```javascript
const user = { name: 'John', age: 25, city: 'NYC' };
if (user.age > 18) {
  console.log('Adult');
}
```

**After automatic formatting:**

```javascript
const user = { name: 'John', age: 25, city: 'NYC' };
if (user.age > 18) {
  console.log('Adult');
}
```

## 📋 Available Commands

### Manual Formatting

```bash
# Format all files in the project
npm run format

# Check if any files need formatting (doesn't change files)
npm run format:check

# Format specific files
npx prettier --write src/AdminPanel.js
```

### Testing the Setup

```bash
# Create a test file with messy formatting
echo "const x={a:1,b:2}" > test.js

# Stage and commit
git add test.js
git commit -m "test formatting"

# Check the file - it should be automatically formatted!
cat test.js
```

## 🔧 Troubleshooting

### If automatic formatting isn't working:

```bash
# Reinstall Husky hooks
npm run prepare

# Check if .husky/pre-commit exists
ls -la .husky/

# Make sure the hook is executable (Mac/Linux)
chmod +x .husky/pre-commit
```

### If you need to skip formatting for one commit:

```bash
git commit -m "emergency fix" --no-verify
```

### If you want to see what Prettier would change:

```bash
npx prettier --check .
```

## 📊 Project Structure

After setup, your project should have:

```
your-project/
├── .husky/
│   └── pre-commit          # Git hook script
├── .prettierrc             # Prettier configuration
├── .prettierignore         # Files to ignore
├── package.json            # Scripts and dependencies
└── src/
    └── your files...
```

## 🎨 Customizing Prettier Rules

To change formatting rules, edit `.prettierrc`:

```json
{
  "semi": false, // Remove semicolons
  "singleQuote": false, // Use double quotes
  "tabWidth": 4, // Use 4 spaces
  "printWidth": 120 // Longer line length
}
```

After changing rules, run `npm run format` to reformat all files.

## 🤝 Team Benefits

### ✅ Consistency

- All code follows the same formatting rules
- No more style discussions in code reviews
- Professional, uniform codebase

### ✅ Automation

- Developers can't commit poorly formatted code
- No need to remember to format manually
- Works seamlessly with any editor

### ✅ Efficiency

- Code reviews focus on logic, not style
- New team members automatically follow standards
- Reduced mental overhead

## 🔍 How to Verify Setup

1. **Check dependencies:**

   ```bash
   npm list prettier husky lint-staged
   ```

2. **Verify configuration files exist:**

   ```bash
   ls .prettierrc .prettierignore .husky/pre-commit
   ```

3. **Test automatic formatting:**
   ```bash
   echo "const test={ugly:true}" > format-test.js
   git add format-test.js
   git commit -m "test"
   cat format-test.js  # Should be formatted
   rm format-test.js   # Clean up
   ```

## 📚 Learn More

- [Prettier Documentation](https://prettier.io/docs/en/index.html)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)

## 🆘 Getting Help

If you encounter issues:

1. **Check this guide first**
2. **Try the troubleshooting commands above**
3. **Ask a team member** who has the setup working
4. **Check if you're in a Git repository:** `git status`
5. **Verify Node.js version:** `node --version` (should be 14+)

---
