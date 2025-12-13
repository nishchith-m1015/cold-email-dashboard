// Shims for path aliases used throughout the project
// This ensures TypeScript recognizes imports like '@/hooks/...' in tests and editor
declare module '@/*';

// Also declare common node modules fallback (optional)
declare module '*/';
