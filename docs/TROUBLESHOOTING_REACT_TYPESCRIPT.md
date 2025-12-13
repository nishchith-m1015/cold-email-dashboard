# 🔧 Troubleshooting React & TypeScript Version Mismatches

This guide helps you diagnose and fix common React version-related issues in the cold-email-dashboard project.

---

## 🚨 Common Error Patterns

### **Error 1: "Hook X is not a function"**
```
TypeError: __TURBOPACK__imported__module__$...$react.js.default.useActionState is not a function or its return value is not iterable
```

### **Error 2: "Hook not exported from React"**
```
TS2305: Module '"react"' has no exported member 'useCallback'
```

### **Error 3: TypeScript doesn't recognize React APIs**
```
Property 'useTransition' does not exist on type 'typeof React'
```

**👉 Root Cause:** Your TypeScript type definitions don't match your React runtime version.

---

## 🔍 Step-by-Step Diagnosis

### **Step 1: Check Your Installed Versions**

Run these commands to see what's actually installed:

```bash
# Check React version
npm ls react

# Check React types version
npm ls @types/react

# Check React-DOM version
npm ls react-dom

# Check React-DOM types version
npm ls @types/react-dom
```

**Expected output should show matching versions:**
```
react@19.2.1
@types/react@19.2.1
react-dom@19.2.1
@types/react-dom@19.2.1
```

### **Step 2: Compare package.json Versions**

Open `package.json` and verify these sections match:

```json
{
  "dependencies": {
    "react": "^19.2.1",         // ← Your ACTUAL React runtime
    "react-dom": "^19.2.1"      // ← Your ACTUAL React-DOM runtime
  },
  "devDependencies": {
    "@types/react": "^19.2.1",     // ← MUST match react version
    "@types/react-dom": "^19.2.1"  // ← MUST match react-dom version
  }
}
```

**❌ Bad (Mismatched):**
```json
{
  "dependencies": {
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  },
  "devDependencies": {
    "@types/react": "18.2.64",      // ← WRONG! Should be 19.x
    "@types/react-dom": "18.2.22"   // ← WRONG! Should be 19.x
  }
}
```

---

## ✅ How to Fix

### **Option A: Manual Update (Recommended for Learning)**

1. **Open `package.json`** in your editor
2. **Find the `devDependencies` section**
3. **Update `@types/react` and `@types/react-dom`** to match your `dependencies` versions:

```bash
# Example: If you have react@19.2.1, update types to:
"@types/react": "^19.2.1",
"@types/react-dom": "^19.2.1"
```

4. **Save the file**

### **Option B: Automatic Update (Quickest)**

Run this command in your terminal:

```bash
# Update types to match your current React version
npm install --save-dev @types/react@latest @types/react-dom@latest
```

---

## 🔄 Recovery Process

After updating versions, follow this exact sequence:

### **Step 1: Clear Cache**
```bash
# Remove Next.js build cache
rm -rf .next

# Remove npm cache
rm -rf node_modules/.cache
```

### **Step 2: Reinstall Dependencies**
```bash
npm install
```

### **Step 3: Restart Dev Server**
```bash
npm run dev
```

### **Step 4: Clear Browser Cache (Optional but recommended)**
- Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
- Or clear browser cache in DevTools

---

## 🎯 Full Recovery Checklist

Use this if nothing else works:

```bash
# Nuclear option - full clean rebuild
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
npm install
npm run dev
```

### **If Still Broken:**

```bash
# Clear everything and start fresh
rm -rf .next
rm -rf node_modules
rm -rf package-lock.json
npm install
npm run dev
```

---

## 📋 Quick Reference: Version Compatibility

### **Current Project Setup (as of Dec 2024)**

| Package | Version | Status |
|---------|---------|--------|
| `next` | `^14.2.33` | ✅ Current |
| `react` | `^19.2.1` | ✅ Current (React 19) |
| `react-dom` | `^19.2.1` | ✅ Current (React 19) |
| `@types/react` | `^19.2.1` | ✅ **Must be 19.x** |
| `@types/react-dom` | `^19.2.1` | ✅ **Must be 19.x** |
| `@clerk/nextjs` | `^6.35.6` | ✅ Compatible with React 19 |

---

## 🧠 Understanding the Issue

### **Why This Happens**

1. **React Runtime** = The actual JavaScript code that runs in your browser
2. **TypeScript Definitions** = Tells TypeScript what APIs exist in React

**When they don't match:**
- ✅ Runtime: "I have `useActionState` hook"
- ❌ TypeScript: "React doesn't have `useActionState`"
- 💥 Error: Hook appears to work but TypeScript complains (or runtime crashes)

### **Real-World Scenario**

You upgrade React from 18 to 19:
- ✅ React 19 adds new hooks like `useActionState`
- ❌ But you forgot to update `@types/react` from 18
- 💥 Now `@clerk/nextjs` tries to use `useActionState`
- 💥 Error: "useActionState is not a function"

---

## 🚀 Prevention Tips

### **1. Regular Version Checks**
Run monthly to catch mismatches early:
```bash
npm ls react @types/react react-dom @types/react-dom
```

### **2. Update Together**
Always update React and types together:
```bash
npm install react@latest react-dom@latest
npm install --save-dev @types/react@latest @types/react-dom@latest
```

### **3. Use npm audit**
Check for security and version issues:
```bash
npm audit
npm audit fix
```

### **4. Keep Next.js Updated**
Next.js often requires specific React versions:
```bash
npm install next@latest
```

---

## 🔗 When to Use This Guide

- ❓ Your app won't load after upgrading React
- ❓ TypeScript errors about React hooks not existing
- ❓ Runtime errors saying a hook "is not a function"
- ❓ Build succeeds but app crashes at runtime
- ❓ Clerk authentication gives mysterious errors

---

## 📞 Debugging Workflow

If you're still stuck, follow this workflow:

1. **Check versions** → `npm ls react @types/react`
2. **Compare with package.json** → Are they the same major version?
3. **Clear cache** → `rm -rf .next node_modules/.cache`
4. **Reinstall** → `npm install`
5. **Restart server** → `npm run dev`
6. **Check terminal output** → Look for compilation errors

---

## 🎓 Learning Resources

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Next.js TypeScript Setup](https://nextjs.org/docs/basic-features/typescript)
- [NPM Version Management](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)

---

## 📝 Notes for Your Team

- **Always commit `package-lock.json`** - ensures everyone has same versions
- **Before pushing changes**, verify: `npm ls react @types/react`
- **Clerk.js is sensitive** to React versions - always update types when upgrading React
- **Clear `.next` cache** after pulling changes from git

---

## ✨ Last Updated
December 13, 2024 - After fixing `useActionState` error with React 19 types update

