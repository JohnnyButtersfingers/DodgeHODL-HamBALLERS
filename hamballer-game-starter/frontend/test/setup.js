import '@testing-library/jest-dom';

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:3001',
    NODE_ENV: 'test'
  },
  writable: true
});

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  }
}));

// Mock lucide-react icons to avoid icon rendering issues in tests
vi.mock('lucide-react', () => ({
  Trophy: ({ className, ...props }) => <div className={className} data-testid="trophy-icon" {...props}>🏆</div>,
  Crown: ({ className, ...props }) => <div className={className} data-testid="crown-icon" {...props}>👑</div>,
  Medal: ({ className, ...props }) => <div className={className} data-testid="medal-icon" {...props}>🥈</div>,
  Star: ({ className, ...props }) => <div className={className} data-testid="star-icon" {...props}>⭐</div>,
  User: ({ className, ...props }) => <div className={className} data-testid="user-icon" {...props}>👤</div>,
  RefreshCw: ({ className, ...props }) => <div className={className} data-testid="refresh-icon" {...props}>🔄</div>,
}));