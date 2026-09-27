import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DBContext = createContext(null);
const API_URL = 'http://localhost:5000/api';

export const DBProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    }
  }, []);

  // Poll every 5 seconds to simulate real-time updates
  useEffect(() => {
    fetchPosts(); // Initial fetch
    const interval = setInterval(fetchPosts, 5000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  const addPost = async (postData) => {
    const res = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
    const newPost = await res.json();
    setPosts(prev => [newPost, ...prev]);
    return newPost;
  };

  const updatePostStatus = async (postId, status, ngoId = null) => {
    const body = { status };
    if (ngoId) body.claimedByNgoId = ngoId;

    await fetch(`${API_URL}/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, status, claimedByNgoId: ngoId || p.claimedByNgoId };
      }
      return p;
    }));
  };

  return (
    <DBContext.Provider value={{ posts, addPost, updatePostStatus }}>
      {children}
    </DBContext.Provider>
  );
};

export const useDB = () => useContext(DBContext);
