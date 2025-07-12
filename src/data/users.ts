import { User } from '@/types';

let ALL_USERS: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@feedsport.com',
    role: 'Administrator',
    image: 'https://placehold.co/100x100.png',
    bio: 'Site administrator with full access to all features.',
    lastActive: '2 hours ago',
  },
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane.doe@feedsport.com',
    role: 'Editor',
    image: 'https://placehold.co/100x100.png',
    bio: 'Content editor responsible for managing blog posts and articles.',
    lastActive: '5 minutes ago',
  },
  {
    id: '3',
    name: 'John Smith',
    email: 'john.smith@feedsport.com',
    role: 'Viewer',
    image: 'https://placehold.co/100x100.png',
    bio: 'Viewer with read-only access to the dashboard.',
    lastActive: '1 day ago',
  },
];

export const getUsers = (): User[] => {
  return ALL_USERS;
};

export const getUserById = (id: string): User | undefined => {
  return ALL_USERS.find(user => user.id === id);
};

export const addUser = (user: Omit<User, 'id' | 'lastActive'>) => {
  const newUser: User = {
    ...user,
    id: (ALL_USERS.length + 1).toString(),
    lastActive: 'Just now',
  };
  ALL_USERS.push(newUser);
  return newUser;
};

export const updateUser = (id: string, updatedUser: Partial<User>) => {
  const userIndex = ALL_USERS.findIndex(user => user.id === id);
  if (userIndex !== -1) {
    ALL_USERS[userIndex] = { ...ALL_USERS[userIndex], ...updatedUser };
    return ALL_USERS[userIndex];
  }
  return null;
};

export const deleteUser = (id: string) => {
  const initialLength = ALL_USERS.length;
  ALL_USERS = ALL_USERS.filter(user => user.id !== id);
  return ALL_USERS.length < initialLength;
};
