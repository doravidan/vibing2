#!/bin/bash

echo "Testing JavaScript game generation..."
echo ""

curl -N -X POST http://localhost:3000/api/agent/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Create a simple Pong game"
      }
    ],
    "projectType": "mobile app",
    "agents": []
  }' 2>&1 | tee /tmp/pong-output.txt | grep -E "(__CHANGES__|__METRICS__|language|javascript)" | head -20
