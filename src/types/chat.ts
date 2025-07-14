// This type is used on the server and for RTDB interactions
export type Message = {
    role: 'user' | 'model';
    content: string;
    timestamp: number; // Using number for RTDB server timestamps
};

// This is what the client component receives (serializable)
export type SerializableMessage = Message;

export type Conversation = {
    id: string; // This will be the user's UID
    startTime: number;
    messages: SerializableMessage[];
    lastMessage?: SerializableMessage;
};
