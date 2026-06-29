#!/bin/bash
npm run build -w apps/web

BUCKET_NAME="nanithefuck-website"      # Replace with your bucket name
BUILD_DIR="dist"                      # Folder containing your final build
REGION="sa-east-1"                     # AWS region of your bucket

# ===============================
# DEPLOYMENT
# ===============================

echo "Removing old files from S3 bucket..."
aws s3 rm s3://$BUCKET_NAME/ --recursive --region $REGION

echo "Starting deployment to S3 bucket: $BUCKET_NAME"

# Optional: force index.html to not be cached
aws s3 cp apps/web/$BUILD_DIR/index.html s3://$BUCKET_NAME/ \
    --region $REGION \
    --cache-control "no-cache, no-store, must-revalidate"

aws s3 sync apps/web/$BUILD_DIR/assets s3://$BUCKET_NAME/assets/ \
    --region $REGION \
    --exact-timestamps \
    --cache-control "no-cache, no-store, must-revalidate" \
    --delete

echo "Deployment completed!"
echo "Your site should be live at: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com/index.html"