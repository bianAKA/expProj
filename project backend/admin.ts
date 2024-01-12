import { getData, setData, Data } from './dataStore';
import { isTokenValid, decodeToken } from './helper';
import HTTPError from 'http-errors';

export const userPermissionChangeV1 = (token: string, uId: number, permissionId: number): Record<string, never> | { error: string } => {
  if (!isTokenValid(token)) {
    throw HTTPError(403);
  }
  const data: Data = getData();
  const uIdIsValid = data.users.map(user => user.uId).includes(uId);
  if (!(permissionId === 1 || permissionId === 2)) {
    throw HTTPError(400);
  } if (!uIdIsValid) {
    throw HTTPError(400);
  } if (data.permissions.length === 0) {
    data.permissions.push(data.users[0].uId);
  }
  if (permissionId === 2 && !data.permissions.includes(uId)) {
    throw HTTPError(400);
  } if (permissionId === 1 && data.permissions.includes(uId)) {
    throw HTTPError(400);
  } if (!data.permissions.includes(decodeToken(token))) {
    throw HTTPError(403);
  } if (data.permissions.length === 1 && permissionId === 1 && data.permissions.includes(uId)) {
    throw HTTPError(400);
  }
  if (permissionId === 1) {
    data.permissions.push(uId);
  } else if (permissionId === 2) {
    let i = 0;
    for (i; i < data.permissions.length; i++) {
      if (data.permissions[i] === uId) {
        data.permissions.splice(i, 1);
        break;
      }
    }
  }
  setData(data);
  return {};
};

export const userRemoveV1 = (token: string, uId: number): Record<string, never> | { error: string } => {
  const data: Data = getData();
  if (!isTokenValid(token)) {
    throw HTTPError(403);
  }
  if (data.permissions.length === 0) {
    data.permissions.push(data.users[0].uId);
  } if (typeof data.permissions !== 'undefined' && data.permissions.length === 1 && data.permissions.includes(uId)) {
    throw HTTPError(400);
  }
  if (typeof data.permissions !== 'undefined' && !data.permissions.includes(decodeToken(token))) {
    throw HTTPError(405);
  }
  const uIdIsValid = data.users.map(user => user.uId).includes(uId);
  if (!uIdIsValid) {
    throw HTTPError(400);
  }
  let i = 0;
  for (i; i < data.users.length; i++) {
    if (data.users[i].uId === uId) {
      break;
    }
  }
  data.users[i].nameFirst = 'Removed';
  data.users[i].nameLast = 'user';
  data.removedUsers.push(data.users[i]);
  data.users.splice(i);
  i = 0;
  // Removing user from being a member/owner of Channel
  const channelNumbers = [];
  for (i; i < data.channels.length; i++) {
    if (data.channels[i].allMembers.map(user => user.uId).includes(uId)) {
      channelNumbers.push(data.channels[i].channelId);
    }
  }
  for (let element of channelNumbers) {
    element--;
    const index = element;
    for (let index3 = 0; index3 < data.channels[index].allMembers.length; index3++) {
      if (data.channels[index].allMembers[index3].uId === uId) {
        data.channels[index].allMembers.splice(index3);
        break;
      }
    }
    for (let index3 = 0; index3 < data.channels[index].ownerMembers.length; index3++) {
      if (data.channels[index].ownerMembers[index3].uId === uId) {
        data.channels[index].ownerMembers.splice(index3);
        break;
      }
    }
    i = 0;
    for (i; i < data.channels[element].messages.length; i++) {
      if (data.channels[element].messages[i].uId === uId) {
        data.channels[element].messages[i].message = 'Removed user';
      }
    }
  }
  i = 0;
  let j = 0;
  // Leaving DMs
  for (i; i < data.dms.length; i++) {
    if (data.dms[i].uIds.includes(uId)) {
      data.dms[i].uIds.splice(data.dms[i].uIds.indexOf(uId), 1);
    }
    for (j; j < data.dms[i].messages.length; j++) {
      if (data.dms[i].messages[j].uId === uId) {
        data.dms[i].messages[j].message = 'Removed user';
      }
    }
  }
  setData(data);
  return {};
};
