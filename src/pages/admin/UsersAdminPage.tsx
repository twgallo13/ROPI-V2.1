import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

interface UserRow {
  id: string;
  email: string;
  displayName?: string;
  role?: 'admin' | 'specialist';
}

const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('email'));
    const unsub = onSnapshot(q, (snap) => {
      const list: UserRow[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateRole = async (id: string, role: 'admin' | 'specialist') => {
    try {
      setUpdatingId(id);
      await setDoc(doc(db, 'users', id), { role, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.error('[admin-users] Failed to update role', e);
      alert('Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Admin: Users</h1>
      </div>

      {loading ? (
        <div>Loading users…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-sm text-gray-700">{u.displayName || '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{u.email}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                      {u.role || 'specialist'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700 text-right space-x-2">
                    <button
                      disabled={updatingId === u.id || u.role === 'admin'}
                      onClick={() => updateRole(u.id, 'admin')}
                      className="inline-flex justify-center py-1 px-3 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      Make Admin
                    </button>
                    <button
                      disabled={updatingId === u.id || u.role === 'specialist'}
                      onClick={() => updateRole(u.id, 'specialist')}
                      className="inline-flex justify-center py-1 px-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Make Specialist
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersAdminPage;
