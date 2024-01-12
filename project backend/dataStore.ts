import { readFileSync, writeFileSync, existsSync } from 'fs';
const dataFilePath = './data.json';

export interface dms {
  name: string,
  dmId: number
}

export interface User {
  uId: number,
  email: string,
  nameFirst: string,
  nameLast: string,
  handleStr: string,
  profileImgUrl?: string
}

export interface react {
  reactId: number,
  authUId: number,
  timeSent: number,
  reacting: boolean
}

export interface message {
  messageId: number,
  uId: number,
  message: string,
  timeSent: number,
  reactInfo? : react[]
  pin: boolean
}

export interface Channels {
  isPublic: boolean,
  channelId: number,
  ownerMembers: User[],
  allMembers: User[],
  name: string,
  messages: message[]
  standupActive: boolean,
  standupFinish: number,
  standupUserId: number,
  standupBuffer: string
}

export interface Users {
  uId: number,
  nameFirst: string,
  nameLast: string,
  email: string,
  handleStr: string,
  password: string,
  token: string[],
  profileImgUrl?: string,
  resetCode: string
}

export interface dMessages {
  uIds: number[],
  name: string,
  members: User[],
  creatorId: number,
  messages: message[],
  dmId: number
}

export interface Data {
  users: Users[],
  channels: Channels[],
  dms: dMessages[]
  permissions: number[],
  removedUsers: Users[]
}

const getData = (): Data => {
  if (existsSync(dataFilePath)) {
    return JSON.parse(readFileSync(dataFilePath).toString());
  }

  const data: Data = {
    users: [],
    channels: [],
    dms: [],
    permissions: [],
    removedUsers: []
  };

  return data;
};

const setData = (newData: Data) => {
  writeFileSync(dataFilePath, JSON.stringify(newData));
};

export { getData, setData };
