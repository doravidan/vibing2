# Testing Guide - InstantDB Save Implementation

## 🚀 System Status

✅ **Server Running**: http://localhost:3000
✅ **Socket.io Ready**: ws://localhost:3000/api/socket
✅ **InstantDB Migration**: Complete
✅ **All Routes Updated**: save, load, list, [projectId]

---

## 🧪 Test Plan

### Test 1: Create New Project and Save

**Steps:**

1. **Open the application**
   ```
   Open: http://localhost:3000
   ```

2. **Log in to your account**
   - Use your existing credentials
   - Verify you see the dashboard

3. **Create a new project**
   - Click "New Project" or navigate to `/create`
   - Select project type (website, game, tool, etc.)
   - Select agents if needed

4. **Generate code with AI**
   - Enter a prompt like: "Create a simple landing page with a hero section"
   - Wait for AI to generate code
   - Verify preview renders correctly
   - Verify file structure panel shows extracted files

5. **Save the project**
   - Click "Save Project" button
   - Enter project name: "Test Landing Page"
   - Enter description: "Testing InstantDB save functionality"
   - Click confirm

6. **Verify save succeeded**
   - Check browser console for success message
   - Check server logs for `🔵 Save route POST called (InstantDB)`
   - Look for success response with project ID

**Expected Result:**
```json
{
  "success": true,
  "project": {
    "id": "abc-123-def-456",
    "name": "Test Landing Page",
    "userId": "your-user-id"
  }
}
```

---

### Test 2: Manual Save Test (Browser Console)

**Steps:**

1. **Open browser DevTools** (F12 or Cmd+Option+I)

2. **Navigate to Console tab**

3. **Run this code:**

```javascript
fetch('/api/projects/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: "Console Test Project",
    description: "Testing from browser console",
    projectType: "website",
    activeAgents: ["code-generation"],
    currentCode: `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Hello from Console Test!</h1></body>
</html>`,
    messages: [
      {
        role: "user",
        content: "Create a test page",
        createdAt: Date.now()
      }
    ]
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Save Response:', data);
  if (data.success) {
    console.log('🎉 Project saved successfully!');
    console.log('📋 Project ID:', data.project.id);

    // Now test loading it back
    return fetch(`/api/projects/load?projectId=${data.project.id}`);
  } else {
    console.error('❌ Save failed:', data.error);
  }
})
.then(res => res?.json())
.then(data => {
  if (data) {
    console.log('✅ Load Response:', data);
    console.log('🎉 Project loaded successfully!');
  }
})
.catch(err => console.error('🔴 Error:', err));
```

**Expected Result:**
- Save succeeds with 200 status
- Returns project ID
- Load succeeds and returns full project data

---

### Test 3: Load Existing Project

**Steps:**

1. **Navigate to projects list**
   ```
   Open: http://localhost:3000/projects
   ```

2. **Verify projects display**
   - Should show list of your projects
   - Check for project names, descriptions, message counts

3. **Click on a project**
   - Should navigate to `/create?projectId=<id>`
   - Should load project data
   - Should restore chat messages
   - Should show code in preview
   - Should show file structure

4. **Verify in console:**
   ```javascript
   // Check what data was loaded
   console.log('Project loaded:', window.location.search);
   ```

**Expected Result:**
- Project loads without errors
- Chat history restored
- Code preview renders
- File structure displays

---

### Test 4: Update Existing Project

**Steps:**

1. **Load an existing project** (from Test 3)

2. **Make changes**
   - Send new message to AI: "Add a footer section"
   - Wait for AI response
   - Verify preview updates

3. **Save again**
   - Click "Save Project"
   - Should update existing project (not create new one)

4. **Verify update**
   - Reload page
   - Check that new messages appear
   - Check that code is updated

**Expected Result:**
- Existing project updated (same ID)
- New messages saved
- Code updated

---

### Test 5: Delete Project

**Steps:**

1. **Navigate to project page**
   ```
   http://localhost:3000/create?projectId=<your-project-id>
   ```

2. **Open browser console and run:**
   ```javascript
   const projectId = new URLSearchParams(window.location.search).get('projectId');

   fetch(`/api/projects/${projectId}`, {
     method: 'DELETE'
   })
   .then(res => res.json())
   .then(data => {
     console.log('✅ Delete Response:', data);
     if (data.success) {
       console.log('🎉 Project deleted successfully!');
     }
   })
   .catch(err => console.error('🔴 Error:', err));
   ```

3. **Verify deletion**
   - Navigate to projects list
   - Verify project no longer appears

**Expected Result:**
- Delete succeeds
- Project removed from list

---

## 🔍 Server Logs to Watch For

### Success Logs:
```
🔵 Save route POST called (InstantDB)
✅ Project saved successfully
```

### Error Logs:
```
🔴 SAVE ERROR: [error message]
🔴 User not found
🔴 Unauthorized
```

---

## 🐛 Troubleshooting

### Error: "Unauthorized" (401)
**Cause**: Not logged in
**Solution**: Log in first at http://localhost:3000

### Error: "Project not found" (404)
**Cause**: Invalid project ID
**Solution**: Check project ID in URL/request

### Error: "Forbidden" (403)
**Cause**: Trying to access another user's project
**Solution**: Use your own project IDs

### No response / timeout
**Cause**: Server not running
**Solution**: Check server logs, restart if needed:
```bash
pnpm run dev
```

### InstantDB errors
**Cause**: InstantDB connection issues
**Solution**: Check `.env.local` has correct `INSTANT_APP_ID`

---

## 📊 Database Verification

To verify data is actually saved in InstantDB:

1. **Visit InstantDB Dashboard**
   ```
   https://instantdb.com/dash
   ```

2. **Select your app**

3. **Go to "Explorer" tab**

4. **Check entities:**
   - **projects**: Should show your saved projects
   - **messages**: Should show chat messages
   - Look for:
     - `userId` matches your user ID
     - `createdAt` and `updatedAt` timestamps
     - `activeAgents` stored as JSON string
     - `currentCode` contains HTML

---

## ✅ Success Criteria

All tests pass if:

1. ✅ Can create new project and save successfully
2. ✅ Can load existing project with all data
3. ✅ Can update existing project
4. ✅ Can delete project
5. ✅ Server logs show success messages (🔵)
6. ✅ No 404 errors on save endpoint
7. ✅ Data appears in InstantDB dashboard
8. ✅ File structure panel displays correctly
9. ✅ Preview renders code correctly

---

## 🎯 Next Steps After Testing

If all tests pass:
- ✅ Mark InstantDB migration as complete
- ✅ Remove Prisma dependencies (optional)
- ✅ Update documentation
- ✅ Deploy to production

If tests fail:
- Check server logs for specific errors
- Verify InstantDB credentials in `.env.local`
- Check browser console for client-side errors
- Review [INSTANTDB_MIGRATION.md](INSTANTDB_MIGRATION.md) for rollback steps
