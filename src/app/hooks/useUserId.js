'use client'

import { useState, useEffect } from 'react';

export function useUserId() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function getOrCreateUserId() {
      if (typeof window !== 'undefined') {
        let id = localStorage.getItem('userId');
        if (!id) {
          const response = await fetch('/api/generateUserId');
          const data = await response.json();
          id = data.userId;
          localStorage.setItem('userId', id);
        }
        setUserId(id);
      }
    }

    getOrCreateUserId();
  }, []);

  return userId;
}