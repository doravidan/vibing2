# Authentication UI Component Guide

## Overview

A beautiful, modern React authentication modal for the Vibing2 Desktop app with full Tauri IPC integration.

## Features

- **Three Auth States**: Checking auth, authenticated, not authenticated
- **Keychain Detection**: Automatically detects Claude Code credentials from macOS Keychain
- **Manual API Key Entry**: Form with real-time validation
- **API Key Validation**: Validates with Anthropic API before storing
- **Subscription Tier Display**: Shows user's plan when authenticated
- **Toast Notifications**: Success/error messages with auto-dismiss
- **Loading States**: Spinners and disabled states during async operations
- **Smooth Animations**: Fade in, slide in, and shake effects
- **Dark Mode Support**: Full dark mode with automatic system detection
- **Accessibility**: ARIA labels, roles, and keyboard navigation

## File Structure

```
vibing2-desktop/
├── src/
│   ├── components/
│   │   └── AuthenticationModal.tsx    # Main authentication component
│   ├── types.ts                        # TypeScript type definitions
│   ├── main.tsx                        # React app entry point
│   ├── styles.css                      # Global styles with Tailwind
│   └── index.html                      # HTML entry point
├── vite.config.ts                      # Vite configuration
├── tsconfig.json                       # TypeScript configuration
├── tailwind.config.js                  # Tailwind CSS configuration
├── postcss.config.js                   # PostCSS configuration
└── package.json                        # Dependencies and scripts
```

## Installation

### 1. Install Dependencies

```bash
cd vibing2-desktop
pnpm install
```

### 2. Run Development Server

```bash
# Start Vite dev server and Tauri app
pnpm run dev

# Or run separately:
pnpm run dev:vite    # Start Vite only
pnpm run dev:tauri   # Start Tauri only
```

### 3. Build for Production

```bash
pnpm run build
```

## Component API

### AuthenticationModal

```typescript
interface AuthenticationModalProps {
  onAuthComplete?: () => void;
}
```

**Props:**
- `onAuthComplete` (optional): Callback fired when authentication succeeds

**Example Usage:**

```tsx
import { AuthenticationModal } from './components/AuthenticationModal';

function App() {
  const handleAuthComplete = () => {
    console.log('User authenticated successfully!');
  };

  return <AuthenticationModal onAuthComplete={handleAuthComplete} />;
}
```

## Tauri IPC Commands

The component uses three Tauri IPC commands:

### 1. check_claude_auth()

Checks authentication status by looking for credentials in macOS Keychain or database.

```typescript
const status = await invoke<AuthStatus>('check_claude_auth');
// Returns: { authenticated: boolean, source: string, email?: string }
```

### 2. save_api_key(api_key, email)

Validates and saves an API key with Anthropic.

```typescript
await invoke('save_api_key', {
  apiKey: 'sk-ant-...',
  email: 'user@example.com' // optional
});
```

### 3. get_credentials()

Retrieves stored credentials from the database.

```typescript
const creds = await invoke<ClaudeCredentials>('get_credentials');
// Returns: { api_key: string, email?: string, subscription_tier?: string }
```

## TypeScript Types

### AuthStatus

```typescript
interface AuthStatus {
  authenticated: boolean;
  source: 'keychain' | 'database' | 'none';
  email?: string;
}
```

### ClaudeCredentials

```typescript
interface ClaudeCredentials {
  api_key: string;
  email?: string;
  subscription_tier?: string;
}
```

### AuthState

```typescript
type AuthState = 'checking' | 'authenticated' | 'not-authenticated';
```

### ToastMessage

```typescript
interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
```

## UI States

### 1. Checking Auth (Loading)

- Shows animated spinner
- Displays "Checking Authentication" message
- Automatically transitions to authenticated or not-authenticated state

### 2. Authenticated

- Green checkmark icon
- Shows authentication source (Keychain or Manual)
- Displays email if available
- Shows subscription tier badge
- Masked API key display
- "Use Different API Key" button

### 3. Not Authenticated

- Purple lock icon
- Keychain status indicator
- API key input field (password type)
- Optional email input field
- Real-time error messages
- "Connect to Claude Code" button
- Link to Anthropic Console

## Styling

Built with Tailwind CSS:

- **Colors**: Purple/Indigo gradient theme
- **Dark Mode**: Automatic with `prefers-color-scheme`
- **Animations**: Custom fadeIn, slideIn, shake animations
- **Responsive**: Mobile-first design
- **Glassmorphism**: Backdrop blur effects

### Custom Animations

```css
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes shake {
  /* Shake animation for errors */
}
```

## Accessibility Features

- **ARIA Labels**: All interactive elements have descriptive labels
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Clear focus indicators
- **Screen Reader Support**: Proper roles and live regions
- **Error Announcements**: aria-live regions for dynamic errors
- **Form Validation**: Required fields marked and validated

## Error Handling

The component handles various error scenarios:

1. **Invalid API Key Format**: Checks for "sk-ant-" prefix
2. **API Validation Failure**: Catches Anthropic API errors
3. **Database Errors**: Handles connection issues
4. **Network Errors**: Graceful degradation

## Toast Notifications

Toast messages appear in the top-right corner:

- **Success**: Green background, checkmark icon
- **Error**: Red background, X icon
- **Info**: Blue background, info icon
- **Auto-dismiss**: Removes after 5 seconds
- **Manual dismiss**: Click X to close

## Best Practices

1. **API Key Security**: Never log or expose full API keys
2. **Error Messages**: User-friendly, actionable error text
3. **Loading States**: Always disable inputs during async operations
4. **Validation**: Client-side + server-side validation
5. **Accessibility**: Test with VoiceOver/screen readers

## Customization

### Changing Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    },
  },
}
```

### Adding New States

Update `AuthState` type in `types.ts` and add corresponding UI in component.

### Custom Animations

Add to `styles.css` and use Tailwind classes:

```css
@keyframes customAnim {
  /* your animation */
}

.animate-customAnim {
  animation: customAnim 0.3s ease-out;
}
```

## Troubleshooting

### Vite not starting

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript errors

```bash
# Rebuild TypeScript
pnpm run build:frontend
```

### Tauri IPC errors

Check that:
1. Tauri commands are registered in `src-tauri/src/main.rs`
2. Command signatures match frontend calls
3. Database is initialized

### Styling issues

```bash
# Rebuild Tailwind
pnpm run dev
```

## Development Tips

1. **Hot Reload**: Vite provides instant hot module replacement
2. **DevTools**: Open with Cmd+Option+I (macOS) in dev mode
3. **Console Logging**: Use `console.log()` for debugging
4. **React DevTools**: Install browser extension for component inspection
5. **Tauri DevTools**: Enabled automatically in debug mode

## Testing Checklist

- [ ] Keychain detection works
- [ ] Manual API key entry validates
- [ ] Error messages display correctly
- [ ] Loading states show during async operations
- [ ] Toast notifications appear and dismiss
- [ ] Dark mode switches properly
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Form validation prevents invalid input
- [ ] API validation succeeds/fails appropriately

## Resources

- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Tauri Documentation](https://tauri.app/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

## Support

For issues or questions:
1. Check console logs for errors
2. Review Tauri backend logs
3. Verify API key format
4. Test with different auth states
5. Open an issue on GitHub

---

**Built with love by the Vibing2 team**
