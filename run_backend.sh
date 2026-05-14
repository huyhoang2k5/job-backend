#!/bin/bash
echo "Starting Job Backend..."
cd "$(dirname "$0")/job-backend"
npm run dev
