#!/bin/bash

# Script to deploy AFFiNE to Vercel

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to handle errors
handle_error() {
  echo "Error: $1"
  exit 1
}

# 1. Install Vercel CLI
echo "Installing Vercel CLI..."
npm install -g vercel || handle_error "Failed to install Vercel CLI"

# 2. Authenticate with Vercel
echo "Authenticating with Vercel..."
vercel login || handle_error "Vercel login failed. Ensure you have a Vercel account."

# 3. Deploy to Vercel
echo "Deploying to Vercel..."
vercel deploy --prod || handle_error "Vercel deploy failed."

echo "AFFiNE deployed successfully to Vercel!"