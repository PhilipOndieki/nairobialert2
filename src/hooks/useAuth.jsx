// File: src/hooks/useAuth.js
// Purpose: Firebase Auth state hook — provides current user and loading state via context
// Dependencies: react, firebase/auth, ../firebase/config

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the app and makes auth state available everywhere.
 * Avoids prop drilling by using React context.
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // onAuthStateChanged returns its own unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    }, (err) => {
      console.error('Auth state error:', err);
      setError(err.message);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email, password) {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(mapAuthError(err.code));
      throw err;
    }
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — consume auth context in any component.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Map Firebase error codes to human-readable messages */
function mapAuthError(code) {
  const map = {
    'auth/invalid-email':        'Invalid email address.',
    'auth/user-not-found':       'No account found with that email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/too-many-requests':    'Too many attempts. Please wait before trying again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] ?? 'Authentication failed. Please try again.';
}
