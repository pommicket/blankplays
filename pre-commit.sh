#!/bin/sh
was_modified() {
	git diff --name-status HEAD -- $1 | grep -q 'M\s*'"$1"
}

if was_modified blankplays.js; then
	npx eslint blankplays.js || exit 1
fi
