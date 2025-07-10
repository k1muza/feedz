import { Bell, Edit2, Lock, Plus, Save, Settings as SettingsIcon, Trash2, User, X } from "lucide-react";
import { useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Administrator' | 'Operator' | 'Viewer';
  lastActive: string;
}

export const Settings = () => {
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'Admin User', email: 'admin@feedsport.com', role: 'Administrator', lastActive: '2 hours ago' },
    { id: '2', name: 'Staff Member', email: 'staff@feedsport.com', role: 'Operator', lastActive: '5 minutes ago' },
  ]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, 'id' | 'lastActive'>>({ 
    name: '', 
    email: '', 
    role: 'Operator' 
  });
  const [units, setUnits] = useState({
    weight: 'kg',
    currency: 'USD'
  });
  const [notifications, setNotifications] = useState({
    lowStock: true,
    expiry: true,
    reports: false
  });

  const handleAddUser = () => {
    setUsers([...users, {
      ...newUser,
      id: Math.random().toString(36).substring(2, 9),
      lastActive: 'Just now'
    }]);
    setNewUser({ name: '', email: '', role: 'Operator' });
    setShowUserForm(false);
  };

  const removeUser = (id: string) => {
    setUsers(users.filter(user => user.id !== id));
  };

  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-6 backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-8">
        <SettingsIcon className="w-6 h-6 text-indigo-400" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Application Settings
        </h2>
      </div>

      <div className="space-y-8">
        {/* Units & Measurements */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            <span>System Preferences</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Weight Unit</label>
              <select 
                value={units.weight}
                onChange={(e) => setUnits({...units, weight: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
                <option value="t">Tons (t)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Currency</label>
              <select 
                value={units.currency}
                onChange={(e) => setUnits({...units, currency: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200"
              >
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
                <option value="GBP">British Pound (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            <span>Notification Preferences</span>
          </h3>
          <div className="space-y-4">
            {[
              { id: 'lowStock', label: 'Low stock alerts', checked: notifications.lowStock },
              { id: 'expiry', label: 'Ingredient expiry alerts', checked: notifications.expiry },
              { id: 'reports', label: 'Monthly report reminders', checked: notifications.reports }
            ].map((item) => (
              <div key={item.id} className="flex items-center">
                <input 
                  type="checkbox" 
                  id={item.id}
                  checked={item.checked}
                  onChange={(e) => setNotifications({...notifications, [item.id]: e.target.checked})}
                  className="h-4 w-4 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500/50 focus:ring-offset-gray-800 text-indigo-500"
                />
                <label htmlFor={item.id} className="ml-3 text-sm text-gray-300">
                  {item.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* User Management */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              <User className="w-5 h-5 text-indigo-400" />
              <span>User Management</span>
            </h3>
            <button 
              onClick={() => setShowUserForm(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-1 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Active</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-200">{user.name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'Administrator' ? 'bg-purple-900/30 text-purple-400' :
                        user.role === 'Operator' ? 'bg-blue-900/30 text-blue-400' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                      {user.lastActive}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-indigo-400 hover:text-indigo-300 mr-4 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeUser(user.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Settings */}
        <div className="pt-4 border-t border-gray-700 flex justify-end">
          <button className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 mr-3 transition-colors">
            Cancel
          </button>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-1 transition-colors">
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Add User Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Add New User</h3>
                <button 
                  onClick={() => setShowUserForm(false)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Role</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as User['role']})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-gray-200"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Operator">Operator</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowUserForm(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleAddUser}
                    disabled={!newUser.name || !newUser.email}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Add User
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};