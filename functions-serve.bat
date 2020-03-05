@ECHO OFF
set PROJECT_PATH=%cd%
set GOOGLE_APPLICATION_CREDENTIALS=%PROJECT_PATH%\arielandphebe-functions-ai.json
echo "Verifying Access Token..."
call gcloud auth application-default print-access-token
echo "Starting Emulators..."
firebase emulators:start
