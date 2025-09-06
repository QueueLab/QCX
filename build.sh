#!/bin/bash
env $(cat .env.local | xargs) ./node_modules/.bin/next build
