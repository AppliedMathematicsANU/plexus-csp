#!/usr/bin/env sh

webpack -p &&
for file in spec/es6/*.es6.js
do
    out=spec/build/$(basename $file .es6.js).js
    ./node_modules/.bin/regenerator $file >$out
done &&
./node_modules/.bin/jasmine-node spec

