// components/no-ssr.tsx
'use client';

import React, { useState, useEffect } from 'react';

const NoSsr = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

export default NoSsr;