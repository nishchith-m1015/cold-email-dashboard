# 🤝 Contributing to Cold Email Dashboard

Thank you for your interest in contributing! This document provides guidelines for contributing to the Cold Email Analytics Dashboard project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

---

## 🤗 Code of Conduct

This project follows a simple code of conduct:

- **Be respectful**: Treat everyone with respect and kindness
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together to improve the project
- **Be inclusive**: Welcome contributors of all skill levels

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- Supabase account (for database testing)
- Clerk account (for auth testing)

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/cold-email-dashboard.git
   cd cold-email-dashboard
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/nishchith-m1015/cold-email-dashboard.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials
   ```

6. **Run development server**:
   ```bash
   npm run dev
   ```

7. **Run tests** to ensure everything works:
   ```bash
   npm run test:ci
   ```

---

## 💻 Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feat/` - New features (e.g., `feat/add-export-csv`)
- `fix/` - Bug fixes (e.g., `fix/chart-timezone-bug`)
- `docs/` - Documentation updates (e.g., `docs/update-api-reference`)
- `test/` - Test additions/fixes (e.g., `test/add-dashboard-tests`)
- `refactor/` - Code refactoring (e.g., `refactor/simplify-metrics-hook`)
- `chore/` - Maintenance tasks (e.g., `chore/upgrade-dependencies`)

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```bash
feat(dashboard): add CSV export functionality

Add export button to campaign table that downloads
current filtered data as CSV file.

Closes #123
```

```bash
fix(charts): correct timezone offset in daily sends chart

Date labels were showing incorrect timezone due to
Date.UTC usage. Switched to local timezone formatting.

Fixes #456
```

### Development Commands

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Testing
npm test                    # Watch mode
npm run test:ci            # Single run
npm run test:coverage      # With coverage

# E2E tests
npm run test:e2e           # Headless
npm run test:e2e:ui        # Interactive UI
npm run test:e2e:debug     # Debug mode

# Build
npm run build
npm start                  # Production server
```

---

## 📏 Coding Standards

### TypeScript

- **Strict mode enabled**: No `any` types without justification
- **Use interfaces** for object shapes
- **Export types** for reusable type definitions
- **Document complex types** with JSDoc comments

```typescript
// ✅ Good
interface CampaignMetrics {
  sends: number;
  opens: number;
  clicks: number;
  replies: number;
}

// ❌ Bad
type Data = any;
```

### React Components

- **Use functional components** with hooks
- **Props interfaces** for all components
- **Meaningful component names** (PascalCase)
- **Keep components small** (<200 lines)
- **Extract logic** into custom hooks

```typescript
// ✅ Good
interface MetricCardProps {
  title: string;
  value: number;
  change?: number;
  isLoading?: boolean;
}

export function MetricCard({ title, value, change, isLoading }: MetricCardProps) {
  // Component logic
}

// ❌ Bad
export function Card(props: any) {
  // Component logic
}
```

### File Organization

- **Co-locate related files** (component + test + types)
- **Index exports** for clean imports
- **Barrel exports** for component libraries

```
components/
  dashboard/
    metric-card.tsx
    metric-card.test.tsx
    index.ts              # Export { MetricCard }
```

### Styling

- **Tailwind CSS first** for styling
- **Consistent spacing** using Tailwind spacing scale
- **Dark theme support** for all new components
- **Responsive design** (mobile-first approach)

```tsx
// ✅ Good
<div className="flex flex-col gap-4 p-4 bg-background dark:bg-background-dark">
  <h1 className="text-2xl font-bold text-foreground">Title</h1>
</div>

// ❌ Bad
<div style={{ display: 'flex', padding: '16px' }}>
  <h1 style={{ fontSize: '24px' }}>Title</h1>
</div>
```

### API Routes

- **Validate inputs** using Zod or similar
- **Handle errors gracefully** with appropriate status codes
- **Use TypeScript** for request/response types
- **Document endpoints** in API_REFERENCE.md

```typescript
// ✅ Good
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    if (!body.campaign) {
      return NextResponse.json(
        { error: 'Campaign name required' },
        { status: 400 }
      );
    }
    
    // Process request
    const result = await processData(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 🧪 Testing Requirements

### Unit Tests

- **Required for**:
  - Utility functions
  - Custom hooks
  - Complex component logic
- **Target**: 80%+ code coverage
- **Use**: Jest + React Testing Library

```typescript
// Example test
describe('calculateCostPerReply', () => {
  it('should calculate cost per reply correctly', () => {
    expect(calculateCostPerReply(100, 10)).toBe(10);
  });

  it('should return 0 when replies is 0', () => {
    expect(calculateCostPerReply(100, 0)).toBe(0);
  });
});
```

### E2E Tests

- **Required for**:
  - Critical user paths
  - New features affecting user flow
- **Use**: Playwright

```typescript
// Example E2E test
test('should display campaign metrics', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Campaign Metrics')).toBeVisible();
});
```

### Test Before Submitting

```bash
# Run all tests
npm run test:ci
npm run test:e2e

# Check types
npm run type-check

# Check linting
npm run lint
```

---

## 🔄 Pull Request Process

### 1. Sync Your Fork

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. Create Feature Branch

```bash
git checkout -b feat/your-feature-name
```

### 3. Make Changes

- Write code following our coding standards
- Add tests for new functionality
- Update documentation as needed

### 4. Test Your Changes

```bash
# Run tests
npm run test:ci
npm run test:e2e

# Check types and linting
npm run type-check
npm run lint

# Test in browser
npm run dev
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

### 6. Push to Fork

```bash
git push origin feat/your-feature-name
```

### 7. Create Pull Request

1. Go to your fork on GitHub
2. Click "Pull Request"
3. Fill out the PR template:
   - **Title**: Clear, descriptive title
   - **Description**: What does this PR do?
   - **Testing**: How did you test this?
   - **Screenshots**: If UI changes, include before/after
   - **Related Issues**: Link to related issues

### PR Title Format

```
<type>(<scope>): <description>

Examples:
feat(dashboard): add CSV export functionality
fix(charts): correct timezone offset issue
docs(readme): update installation instructions
```

### PR Checklist

Before submitting, ensure:

- [ ] Code follows project coding standards
- [ ] Tests added/updated and passing
- [ ] Documentation updated (if needed)
- [ ] No console errors or warnings
- [ ] Tested in Chrome and Safari
- [ ] Mobile responsive (if UI changes)
- [ ] Dark theme works (if UI changes)
- [ ] TypeScript types are correct
- [ ] No breaking changes (or documented)

---

## 📁 Project Structure

Understanding the project structure helps you navigate the codebase:

```
cold-email-dashboard/
├── app/                        # Next.js 14 App Router
│   ├── api/                    # API routes
│   ├── (auth)/                 # Auth pages
│   ├── page.tsx                # Overview dashboard
│   ├── analytics/              # Analytics page
│   └── layout.tsx              # Root layout
├── components/
│   ├── dashboard/              # Dashboard components
│   ├── layout/                 # Layout components
│   └── ui/                     # Base UI components
├── hooks/                      # Custom React hooks
├── lib/                        # Utilities and configs
├── __tests__/                  # Jest tests
├── e2e/                        # Playwright tests
├── docs/                       # Documentation
└── supabase/                   # Database schema
```

### Key Directories

- **`app/api/`**: API routes for data ingestion and metrics
- **`components/dashboard/`**: Dashboard-specific components (charts, tables, cards)
- **`hooks/`**: Custom hooks (data fetching, state management)
- **`lib/`**: Utility functions, constants, clients (Supabase, SWR)
- **`__tests__/`**: Unit tests
- **`e2e/tests/`**: End-to-end tests

---

## 🎯 Areas for Contribution

Looking to contribute but not sure where to start? Here are some ideas:

### 🐛 Bug Fixes
- Check the [Issues](https://github.com/nishchith-m1015/cold-email-dashboard/issues) page for bugs
- Look for issues labeled `good first issue` or `bug`

### ✨ Features
- Implement features from the [roadmap](docs/PHASED_OPTIMIZATION_ROADMAP.md)
- Suggest new features by opening an issue first

### 📚 Documentation
- Improve existing documentation
- Add code examples
- Fix typos or unclear explanations

### 🧪 Testing
- Add tests to improve coverage
- Write E2E tests for uncovered user paths
- Improve test organization

### 🎨 UI/UX
- Improve component designs
- Add animations and micro-interactions
- Enhance mobile responsiveness

---

## 💬 Questions?

- **General questions**: Open a [Discussion](https://github.com/nishchith-m1015/cold-email-dashboard/discussions)
- **Bug reports**: Open an [Issue](https://github.com/nishchith-m1015/cold-email-dashboard/issues)
- **Feature requests**: Open an [Issue](https://github.com/nishchith-m1015/cold-email-dashboard/issues) with `[Feature Request]` prefix

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! 🎉**

Your contributions help make this project better for everyone.
