# Push Project to New GitHub Repository

## Steps to Push to a New Repository

### Step 1: Create New Repository on GitHub
1. Go to https://github.com
2. Click the "+" icon in the top right
3. Select "New repository"
4. Name your repository (e.g., `rent-management-new`)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"
7. Copy the repository URL (SSH or HTTPS):
   - SSH: `git@github.com:yourusername/rent-management-new.git`
   - HTTPS: `https://github.com/yourusername/rent-management-new.git`

### Step 2: Add New Remote and Push

**Option A: Keep Old Repository (Add New Remote)**
```bash
cd /home/htmaldives/rent-management
git remote add new-origin <NEW_REPO_URL>
git push -u new-origin master
```

**Option B: Replace Old Repository (Change Remote)**
```bash
cd /home/htmaldives/rent-management
git remote set-url origin <NEW_REPO_URL>
git push -u origin master
```

**Option C: Push All Branches and Tags**
```bash
cd /home/htmaldives/rent-management
git remote add new-origin <NEW_REPO_URL>
git push -u new-origin --all          # Push all branches
git push -u new-origin --tags        # Push all tags
```

### Step 3: Verify
```bash
git remote -v  # Check remotes
git log --oneline -5  # Verify commits
```

### Step 4: Clone on New Server
Once pushed, you can clone on any new server:
```bash
git clone <NEW_REPO_URL>
cd rent-management
```

## Current Repository Info
- **Current Remote**: git@github.com:lugmanahmed/Rent-Managment.git
- **Branch**: master
- **Latest Commits**: All your code including SMS system, CORS fixes, etc.

## Important Notes
- Make sure `.env` files are NOT committed (they're in .gitignore)
- Make sure database credentials are in `.env` (not in code)
- Run `composer install` and `npm install` after cloning
- Run migrations: `php artisan migrate`

