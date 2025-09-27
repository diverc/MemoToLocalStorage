#!/bin/bash

# Define the target file
JS_FILE="app.js"

# Check if the file exists
if [ ! -f "$JS_FILE" ]; then
    echo "Error: The file '$JS_FILE' does not exist."
    exit 1
fi

# Get the latest Git commit hash (full hash)
GIT_HASH=$(git rev-parse HEAD)

# Get the latest Git commit message (single line)
# The head commit message, a multi-line string, is passed to sed with newlines converted to spaces.
GIT_MESSAGE=$(git log -1 --pretty=%B | tr '\n' ' ')

# Use sed to replace the GIT_COMMIT_HASH constant
# The script will look for the line that defines GIT_COMMIT_HASH and replace the value with the new hash.
# It uses an alternative delimiter '|' to avoid issues with slashes in the path or special characters in the hash.
sed -i "s|const GIT_COMMIT_HASH = '.*';|const GIT_COMMIT_HASH = '$GIT_HASH';|g" "$JS_FILE"

# Use sed to replace the GIT_COMMIT_MESSAGE constant
# Similarly, this replaces the old message with the new one.
sed -i "s|const GIT_COMMIT_MESSAGE = '.*';|const GIT_COMMIT_MESSAGE = '$GIT_MESSAGE';|g" "$JS_FILE"

echo "Successfully updated Git commit hash and message in $JS_FILE"
echo "Hash: $GIT_HASH"
echo "Message: $GIT_MESSAGE"
