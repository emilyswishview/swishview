
// Comprehensive security utilities
export const initSecurity = () => {
  // Console protection
  console.clear();
  console.log('%c🛡️ SwishView Security Active', 'color: #10b981; font-size: 16px; font-weight: bold;');
  console.log('%c⚠️ Warning: Do not paste code from unknown sources', 'color: #f59e0b; font-size: 14px;');
  
  // Production security logging only
  if (import.meta.env.PROD) {
    // Allow all default browser interactions (right-click, inspect, etc.)
  }
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Remove HTML tags and script content
  const cleanInput = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
    
  return cleanInput.trim();
};

// URL validation
export const isValidURL = (url: string): boolean => {
  try {
    const parsedURL = new URL(url);
    return ['http:', 'https:'].includes(parsedURL.protocol);
  } catch {
    return false;
  }
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Rate limiting utility
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (identifier: string, limit: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
};

// Secure local storage wrapper
export const secureStorage = {
  set: (key: string, value: any) => {
    try {
      const encrypted = btoa(JSON.stringify(value));
      localStorage.setItem(`sw_${key}`, encrypted);
    } catch (error) {
      console.error('Failed to store data securely:', error);
    }
  },
  
  get: (key: string) => {
    try {
      const encrypted = localStorage.getItem(`sw_${key}`);
      if (!encrypted) return null;
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.error('Failed to retrieve data securely:', error);
      return null;
    }
  },
  
  remove: (key: string) => {
    localStorage.removeItem(`sw_${key}`);
  }
};

// Content Security Policy
export const setSecurityHeaders = () => {
  if (typeof document !== 'undefined') {
    // Add meta tags for security
    const addMetaTag = (name: string, content: string) => {
      const existing = document.querySelector(`meta[${name.includes('http-equiv') ? 'http-equiv' : 'name'}="${name.replace('http-equiv=', '')}"]`);
      if (!existing) {
        const meta = document.createElement('meta');
        if (name.includes('http-equiv')) {
          meta.setAttribute('http-equiv', name.replace('http-equiv=', ''));
        } else {
          meta.setAttribute('name', name);
        }
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };

    // Security headers
    addMetaTag('http-equiv=X-Content-Type-Options', 'nosniff');
    addMetaTag('http-equiv=X-Frame-Options', 'DENY');
    addMetaTag('http-equiv=X-XSS-Protection', '1; mode=block');
    addMetaTag('referrer', 'strict-origin-when-cross-origin');
  }
};
