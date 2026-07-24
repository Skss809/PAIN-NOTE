/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { Notepad } from './components/Notepad';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return user ? <Notepad /> : <AuthScreen />;
}
