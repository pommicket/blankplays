#!/bin/sh
RCLONE_ENDPOINT="${RCLONE_ENDPOINT:-linode-fr:/blankplays.pommicket.com/}"
S3CMD_HOST="${S3_HOST:-fr-par-1.linodeobjects.com}"
S3CMD_ENDPOINT="${S3_ENDPOINT:-s3://blankplays.pommicket.com}"

EXCL2=
if [ "$1" = 'skip-challenges' ]; then
	EXCL2='--exclude=/challenges-{{.*}}'
fi

ls pub
printf "Copy this stuff to ${RCLONE_ENDPOINT} [y/n]? "
read ok
if [ "$ok" != 'y' ]; then
	echo 'Aborted.'
	exit 1
fi

rclone -P --transfers=16 --checkers=16 --exclude=/blankplays.js $EXCL2 --s3-acl=public-read copy pub/ "$RCLONE_ENDPOINT" || exit 1
gzip -9 -c pub/blankplays.js > blankplays.gz.js || exit 1
s3cmd -P -m 'text/javascript; charset=utf-8' \
	--host="$S3CMD_HOST" \
	--host-bucket='%(bucket)s.'"$S3CMD_HOST" \
	--add-header 'Content-Encoding: gzip' \
	put blankplays.gz.js "$S3CMD_ENDPOINT/blankplays.js" || exit 1
rm blankplays.gz.js
echo 'Done.'
