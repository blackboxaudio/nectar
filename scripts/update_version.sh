#!/bin/bash

# Get old and new versions
old_version=$(jq '.version' package.json | tr -d '"')
new_version=$(echo "$1" | tr -d '"')

# Update package.json
tmp=$(mktemp)
jq --arg nv "$new_version" '.version = $nv' package.json > "$tmp"
mv "$tmp" package.json

# Clear spaces, tabs, and other whitespace characters present in IFS
IFS=''

# Update README.md
tmp=$(mktemp)
while read line;
do
  if [[ "$line" =~ .*"$old_version".* ]]; then
    echo "$line" | sed "s/$old_version/$new_version/g" >> "$tmp"
  else
    echo "$line" >> "$tmp"
  fi
done < README.md
mv "$tmp" README.md

echo "Updated from $old_version to $new_version"
