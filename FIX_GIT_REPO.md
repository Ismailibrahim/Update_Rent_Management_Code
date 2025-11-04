# Fix Git Repository - Remove All Unwanted Files

## Current Status
- **Before**: 23,088 files staged
- **After node_modules removal**: ~14,000 files still staged
- **Problem**: Entire home directory is tracked as a git repository

## SOLUTION: Reset Everything and Start Fresh

### Step 1: Reset all staged files
```bash
cd /home/htmaldives
git reset HEAD .
```

### Step 2: Add only .gitignore
```bash
git add .gitignore
```

### Step 3: Add only your actual project
```bash
git add rent-management/
# Only if you want to track other specific directories
```

### Step 4: Verify before committing
```bash
git status
# Should show only a few files now (< 100)
```

### Step 5: Commit
```bash
git commit -m "chore: Add .gitignore and track only project files"
```

## Quick Fix Command (Run This)
```bash
cd /home/htmaldives
git reset HEAD .
git add .gitignore
git add rent-management/ 2>/dev/null || true
git status
```

After running this, you should see < 100 files instead of 23,000+ files.

## Why This Happened
- Your home directory (`/home/htmaldives`) was initialized as a git repository
- `git add .` was run, adding EVERYTHING (node_modules, logs, system files, etc.)
- Cursor IDE disabled Git features because 23,000+ files is too many

## After Fix
Once you have < 1000 files, Cursor's Commit & Push button will work normally again.

