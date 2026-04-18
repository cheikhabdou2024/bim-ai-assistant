import { ReactNode, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps page content with a CSS fade+slide-up animation on every route change.
 * Uses a key derived from pathname so React re-mounts the div on navigation.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  // Re-trigger animation on route change by toggling the class
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('page-enter');
    // Force reflow so removing + adding the class actually re-triggers the animation
    void el.offsetHeight;
    el.classList.add('page-enter');
  }, [pathname]);

  return (
    <div ref={ref} className="page-enter">
      {children}
    </div>
  );
}
