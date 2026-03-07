# Auto-commit and push script for 2d-game
# This script will be run after each file change

param(
    [string]$CommitMessage = "Update game files"
)

# Add Git to PATH
$env:PATH = "C:\Program Files\Git\cmd;C:\Program Files (x86)\Git\cmd;$env:PATH"

# Set working directory
Set-Location "c:\Users\albsh.ALB-SH-LAPTOP\OneDrive\Desktop\game"

# Configure Git if needed
git config user.name "albshia" -ErrorAction SilentlyContinue
git config user.email "developer@example.com" -ErrorAction SilentlyContinue

# Initialize repo if not already done
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..."
    git init
    git remote add origin https://github.com/albshia/2d-game.git
}

# Add all changes
git add -A

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Committing changes: $CommitMessage"
    git commit -m $CommitMessage
    
    # Push to GitHub
    Write-Host "Pushing to GitHub..."
    git push -u origin main
    Write-Host "Successfully pushed to GitHub!"
} else {
    Write-Host "No changes to commit."
}
