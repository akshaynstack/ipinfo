#!/usr/bin/env bash

# IP Lookup CLI for ipapi-hono
# Usage: ./lookup.sh [optional_ip]

# 1. Colors for better UI
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}--- ipapi-hono CLI Lookup ---${NC}"

# 2. Try to extract API key from .env
# It looks for the specific comment pattern or a variable
ENV_FILE=".env"
API_KEY=""

if [[ -f "$ENV_FILE" ]]; then
    # Look for a line that contains ipapi_ but is NOT the prefix definition
    API_KEY=$(grep 'ipapi_' "$ENV_FILE" | grep -v 'API_KEY_PREFIX' | grep -o 'ipapi_[a-zA-Z0-9_\-]*' | head -n 1)
fi

if [[ -z "$API_KEY" ]]; then
    echo -e "${RED}Error: API Key not found in .env${NC}"
    read -p "Please enter your API Key: " API_KEY
fi

# 3. Get the IP (either from argument or prompt)
TARGET_IP=$1

if [[ -z "$TARGET_IP" ]]; then
    read -p "Enter IP address to lookup (or leave empty for your current IP): " TARGET_IP
fi

# Clean potentially hidden \r from Windows input
TARGET_IP=$(echo "$TARGET_IP" | tr -d '\r')
API_KEY=$(echo "$API_KEY" | tr -d '\r')

# 4. Perform the lookup
echo -e "${BLUE}Looking up [${TARGET_IP:-your local IP}]...${NC}"

# We use -H "X-Forwarded-For" to simulate a real IP if one is provided
# We use the ?api= query param for authentication
if [[ -n "$TARGET_IP" ]]; then
    RESPONSE=$(curl -s "http://localhost:8787/v1/ip?api=$API_KEY" -H "X-Forwarded-For: $TARGET_IP")
else
    RESPONSE=$(curl -s "http://localhost:8787/v1/ip?api=$API_KEY")
fi

# 5. Display the result
if [[ -z "$RESPONSE" ]]; then
    echo -e "${RED}Error: Received empty response from API. Is the server running?${NC}"
elif echo "$RESPONSE" | grep -q 'error'; then
    echo -e "${RED}Error from API:${NC}"
    # Try formatting with python3, then python, then just raw
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${GREEN}Success!${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"
fi
