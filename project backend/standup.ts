import { getData, setData, Data } from './dataStore';
import { isTokenValid, isChannelIdValid, getIndexOfChannelId, isAuthUserMemberChannel, getUId, getIndexOfUser } from './helper';
import { messageSendV2 } from './message';
import HTTPError from 'http-errors';

/**
  * <This function starts a standup period where all messages sent
  *  will be concatenated and sent as one message>
  *
  * @param {string} token - token of the AuthUser
  * @param {string} channelId - Id of channel
  * @param {string} length - Period of standup in seconds
  *
  * @returns {object} - If all the parameters are valid,
  *
*/
function standupStartV1(token: string, channelId: number, length: number): { timeFinish: number } {
  let data: Data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'Token is invalid');
  } else if (!isChannelIdValid(channelId)) {
    throw HTTPError(400, 'channelId does not refer to a valid channel');
  } else if (length < 0) {
    throw HTTPError(400, 'length is a negative integer');
  } else if (data.channels[getIndexOfChannelId(channelId)].standupActive) {
    throw HTTPError(400, 'an active standup is currently running in the channel');
  } else if (!isAuthUserMemberChannel(token, channelId)) {
    throw HTTPError(403, 'channelId is valid and the authorised user is not a member of the channel');
  }

  const channelIndex = getIndexOfChannelId(channelId);
  data.channels[channelIndex].standupActive = true;
  data.channels[channelIndex].standupUserId = getUId(token);

  const timeFinish = Math.floor(Date.now() / 1000) + length;
  data.channels[channelIndex].standupFinish = timeFinish;

  setData(data);

  setTimeout(() => {
    data = getData();
    if (data.channels[channelIndex].standupBuffer.localeCompare('') !== 0) {
      messageSendV2(token, channelId, data.channels[channelIndex].standupBuffer);
    }

    data = getData();
    data.channels[channelIndex].standupActive = false;
    data.channels[channelIndex].standupFinish = null;
    data.channels[channelIndex].standupUserId = undefined;
    data.channels[channelIndex].standupBuffer = '';

    setData(data);
  }, length * 1000);

  return { timeFinish };
}

/**
  * <This function checks where a standup is currently active>
  *
  * @param {string} token - token of the AuthUser
  * @param {string} channelId - Id of channel
  *
  * @returns {object} - If all the parameters are valid,
  *
*/
function standupActiveV1(token: string, channelId: number): { isActive: boolean, timeFinish: number } {
  const data: Data = getData();
  const channelIndex = getIndexOfChannelId(channelId);

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'Token is invalid');
  } else if (!isChannelIdValid(channelId)) {
    throw HTTPError(400, 'channelId does not refer to a valid channel');
  } else if (!isAuthUserMemberChannel(token, channelId)) {
    throw HTTPError(403, 'channelId is valid and the authorised user is not a member of the channel');
  }

  return { isActive: data.channels[channelIndex].standupActive, timeFinish: data.channels[channelIndex].standupFinish };
}

/**
  * <Concatenates the send messasges during the standup period>
  *
  * @param {string} token - token of the AuthUser
  * @param {string} channelId - Id of channel
  * @param {string} message - Message to be sent
  *
  * @returns {object} - If all the parameters are valid,
  *
*/
function standupSendV1(token: string, channelId: number, message: string): Record<string, never> {
  const data: Data = getData();
  const channelIndex = getIndexOfChannelId(channelId);

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'Token is invalid');
  } else if (!isChannelIdValid(channelId)) {
    throw HTTPError(400, 'channelId does not refer to a valid channel');
  } else if (message.length > 1000) {
    throw HTTPError(400, 'length of message is over 1000 characters');
  } else if (!data.channels[getIndexOfChannelId(channelId)].standupActive) {
    throw HTTPError(400, 'an active standup is not currently running in the channel');
  } else if (!isAuthUserMemberChannel(token, channelId)) {
    throw HTTPError(403, 'channelId is valid and the authorised user is not a member of the channel');
  }

  data.channels[channelIndex].standupBuffer = data.channels[channelIndex].standupBuffer + `${data.users[getIndexOfUser(data, token)].handleStr}: ${message}\n`;

  setData(data);
  return {};
}

export { standupStartV1, standupActiveV1, standupSendV1 };
