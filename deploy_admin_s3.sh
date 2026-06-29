#!/bin/bash
npm run build -w apps/admin

BUCKET_NAME="nanithefuck-admin"      # Replace with your bucket name
BUILD_DIR="dist"                      # Folder containing your final build
REGION="sa-east-1"                     # AWS region of your bucket

# ===============================
# DEPLOYMENT
# ===============================

echo "Removing old files from S3 bucket..."
aws s3 rm s3://$BUCKET_NAME/ --recursive --region $REGION

echo "Starting deployment to S3 bucket: $BUCKET_NAME"

# Optional: force index.html to not be cached
aws s3 sync apps/admin/$BUILD_DIR s3://$BUCKET_NAME/ \
    --region $REGION \
    --exact-timestamps \
    --cache-control "no-cache, no-store, must-revalidate"

echo "Deployment completed!"
echo "Your site should be live at: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com/index.html"