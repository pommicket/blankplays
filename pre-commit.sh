#!/bin/sh
was_modified() {
	git diff --name-status HEAD -- $1 | grep -q 'M\s*'"$1"
}

if was_modified pub/blankplays.js; then
	npx eslint || exit 1
fi
