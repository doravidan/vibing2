#!/bin/bash

# Test the save endpoint
curl -X POST http://localhost:3000/api/projects/save \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$(sqlite3 prisma/dev.db "SELECT sessionToken FROM Session LIMIT 1")" \
  -d '{
    "name": "Test Project",
    "description": "Testing save functionality",
    "projectType": "website",
    "activeAgents": ["code-agent"],
    "currentCode": "<html><body>Test</body></html>",
    "messages": [
      {"id": "1", "role": "user", "content": "Create a test project"}
    ]
  }'
