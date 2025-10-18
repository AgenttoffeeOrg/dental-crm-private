# Testing IDs Guide

## Why Test IDs?

Using `data-testid` attributes makes your tests:
- ✅ **Stable** - Won't break when CSS classes change
- ✅ **Readable** - Clear intent in test code
- ✅ **Maintainable** - Easy to update when structure changes
- ✅ **Fast** - More performant than complex CSS selectors

## How to Add Test IDs

### React/Next.js Components

```tsx
// ✅ Good - Add data-testid to key interactive elements
<button data-testid="login-submit" type="submit">
  Sign In
</button>

<input 
  data-testid="email-input"
  type="email"
  name="email"
/>

<nav data-testid="main-navigation">
  <a data-testid="nav-dashboard" href="/dashboard">Dashboard</a>
  <a data-testid="nav-contacts" href="/contacts">Contacts</a>
</nav>

// ❌ Avoid - Don't add test IDs to every element
<div data-testid="wrapper"> <!-- Not needed -->
  <span data-testid="text"> <!-- Not needed -->
    {content}
  </span>
</div>
```

## Naming Conventions

Use this pattern: `{component}-{element}-{action?}`

### Examples:

```tsx
// Buttons
data-testid="login-submit-button"
data-testid="contact-create-button"
data-testid="deal-delete-button"

// Forms
data-testid="login-form"
data-testid="email-input"
data-testid="password-input"

// Navigation
data-testid="nav-dashboard"
data-testid="nav-contacts"
data-testid="mobile-menu-button"

// Modals/Dialogs
data-testid="contact-modal"
data-testid="modal-close-button"
data-testid="modal-confirm-button"

// Lists/Tables
data-testid="contacts-table"
data-testid="contact-row-{id}"
data-testid="deal-card-{id}"

// Status indicators
data-testid="loading-spinner"
data-testid="error-message"
data-testid="success-banner"
```

## Priority Elements

Add test IDs to these elements first:

1. **Forms & Inputs**
   - Form containers
   - Input fields
   - Submit buttons
   - Error messages

2. **Navigation**
   - Main nav links
   - Mobile menu button
   - Breadcrumbs
   - Back buttons

3. **Critical Actions**
   - Create/Edit/Delete buttons
   - Confirmation dialogs
   - Save/Cancel buttons

4. **Data Display**
   - Tables
   - Lists
   - Cards
   - Empty states

5. **User Feedback**
   - Loading states
   - Error messages
   - Success notifications
   - Validation messages

## Using Test IDs in Playwright

```typescript
// ✅ Preferred - Using data-testid
await page.getByTestId('login-submit').click()
await page.getByTestId('email-input').fill('user@example.com')

// ✅ Also good - Using role when appropriate
await page.getByRole('button', { name: 'Sign In' }).click()

// ⚠️ Fallback - CSS selectors (less stable)
await page.locator('button[type="submit"]').click()
```

## Migration Strategy

### Phase 1: Critical Paths (Week 1)
- Login/logout flow
- Main navigation
- Create contact/deal forms

### Phase 2: Core Features (Week 2)
- All forms
- Data tables
- Modals/dialogs

### Phase 3: Everything Else (Week 3+)
- Settings pages
- Admin panels
- Less frequent features

## Testing Without Test IDs

Until test IDs are added, use these strategies:

### 1. Semantic Selectors
```typescript
// Use ARIA roles
await page.getByRole('navigation')
await page.getByRole('button', { name: /sign in/i })
await page.getByRole('textbox', { name: /email/i })

// Use labels
await page.getByLabel('Email address')
await page.getByLabel('Password')

// Use accessible names
await page.getByRole('link', { name: 'Dashboard' })
```

### 2. Text Content
```typescript
await page.getByText('Welcome back')
await page.getByText(/sign in to continue/i)
```

### 3. Placeholder
```typescript
await page.getByPlaceholder('Enter your email')
```

### 4. Fallback to CSS (last resort)
```typescript
await page.locator('input[type="email"]')
await page.locator('button[type="submit"]')
```

## Component Example

```tsx
// ✅ Complete example with test IDs
export function LoginForm() {
  return (
    <form data-testid="login-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          data-testid="email-input"
          id="email"
          type="email"
          name="email"
        />
      </div>
      
      <div>
        <label htmlFor="password">Password</label>
        <input
          data-testid="password-input"
          id="password"
          type="password"
          name="password"
        />
      </div>
      
      {error && (
        <div data-testid="login-error" role="alert">
          {error}
        </div>
      )}
      
      <button 
        data-testid="login-submit"
        type="submit"
      >
        Sign In
      </button>
      
      <a 
        data-testid="forgot-password-link"
        href="/reset-password"
      >
        Forgot Password?
      </a>
    </form>
  )
}
```

## Best Practices

### ✅ DO:
- Use lowercase with hyphens: `data-testid="contact-create-button"`
- Be specific but concise: `data-testid="modal-confirm"` not `data-testid="button1"`
- Add to interactive elements: buttons, links, inputs
- Add to container elements: forms, modals, cards
- Use consistent naming across the app

### ❌ DON'T:
- Don't use camelCase: ~~`data-testid="contactCreateButton"`~~
- Don't be too generic: ~~`data-testid="button"`~~
- Don't add to every element (bloats HTML)
- Don't use for styling (use CSS classes)
- Don't duplicate IDs unnecessarily

## Resources

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [ARIA Roles Reference](https://www.w3.org/TR/wai-aria-1.1/#role_definitions)

---

**Questions?** Ask the team or check the Playwright documentation!

