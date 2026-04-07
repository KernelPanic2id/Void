export interface ServerChannel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'video';
}

export interface Server {
  id: string;
  name: string;
  ownerPublicKey: string;
  inviteKey?: string;
  icon?: string;
  channels: ServerChannel[];
  members: string[];
}

