import type { Timestamp } from 'firebase/firestore';

// This type is used on the server and for Firestore interactions
export type Message = {
    role: 'user' | 'model';
    content: string;
    timestamp: Timestamp | { seconds: number; nanoseconds: number };
};

// This is what the client component receives (serializable)
export type SerializableMessage = Omit<Message, 'timestamp'> & {
    timestamp: { seconds: number, nanoseconds: number };
}

export type Conversation = {
    id: string;
    startTime: { seconds: number, nanoseconds: number };
    messages: SerializableMessage[];
};
