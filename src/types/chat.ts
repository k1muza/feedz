import type { Timestamp } from 'firebase/firestore';

export type Message = {
    role: 'user' | 'model';
    content: string;
    timestamp: Timestamp;
};

export type Conversation = {
    id: string;
    startTime: Timestamp;
    messages: Message[];
};
