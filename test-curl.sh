#!/bin/bash

echo "Testing SSE stream..."
echo ""

curl -N -X POST http://localhost:3000/api/agent/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Create a simple hello world HTML page"
      }
    ],
    "projectType": "landing page",
    "agents": []
  }' 2>&1 | head -100
