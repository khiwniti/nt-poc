#!/bin/bash

# Script to delete all branches except those starting with 001-

echo "🗑️  Cleaning up branches (keeping only 001-* branches)..."
echo ""

# Count branches before
TOTAL_BEFORE=$(git branch | wc -l)
echo "📊 Total branches before: $TOTAL_BEFORE"

# Get list of worktree branches (cannot delete these)
WORKTREE_BRANCHES=$(git worktree list | awk '{print $3}' | sed 's/\[//' | sed 's/\]//' | grep -v "HEAD")

DELETED=0
SKIPPED=0
WORKTREE_SKIPPED=0

# Delete local branches
for branch in $(git branch | grep -v "^\*" | grep -v "001-" | sed 's/^[+ ]//'); do
    # Check if branch is in a worktree
    if echo "$WORKTREE_BRANCHES" | grep -q "^$branch$"; then
        echo "⚠️  Skipping worktree branch: $branch"
        ((WORKTREE_SKIPPED++))
    else
        # Try to delete
        if git branch -D "$branch" 2>&1 | grep -q "Deleted"; then
            echo "✅ Deleted: $branch"
            ((DELETED++))
        else
            echo "⚠️  Could not delete: $branch"
            ((SKIPPED++))
        fi
    fi
done

echo ""
echo "📊 Summary:"
echo "  ✅ Deleted: $DELETED branches"
echo "  ⚠️  Worktree (skipped): $WORKTREE_SKIPPED branches"
echo "  ⚠️  Other (skipped): $SKIPPED branches"
echo ""

# Count branches after
TOTAL_AFTER=$(git branch | wc -l)
echo "📊 Total branches after: $TOTAL_AFTER"
echo ""

# Show remaining branches
echo "📋 Remaining branches:"
git branch | grep "001-"

echo ""
echo "✨ Done!"
