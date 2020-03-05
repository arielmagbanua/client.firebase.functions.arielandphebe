#!/bin/sh
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/arielandphebe-functions-ai.json"
echo "Verifying Access Token..."
gcloud auth application-default print-access-token
echo "Starting Emulators..."
firebase emulators:start
