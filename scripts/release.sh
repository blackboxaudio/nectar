#!/bin/bash

# Get current version
version=$(echo "$1" | tr -d '"')

# Update local files
./scripts/update_version.sh "$version"

# Commit and push version increment
git add .
git commit -m "Increment version to \`$version\`"
git push

# Tag new version and push to remote
git tag "v$version"
git push origin "v$version"

echo "Published version v$version @ https://npmjs.com/package/@bloom-labs/template-lib"
