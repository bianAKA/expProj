import validator from 'validator';
import { getData, setData, Data } from './dataStore';
import { generateToken, recursive, isTokenValid, getHashOf, ResetCodeGenerator } from './helper';
import { secret } from './server';
import HTTPError from 'http-errors';

/**
  * <This function takes in an email and password and checks
  * it against an existing database. If both are valid, a
  * userId is returned>
  *
  * @param {string} email - potential email of the user
  * @param {string} password - potential password of the user
  * ...
  *
  * @returns {integer} - If both email and password are valid,
  * the authUserId of the user is returned
  * @returns {string} - If both email and password are valid,
  * the token of the user is returned
  * @returns {object} - If either or both the email and password
  * do not meet the condition, {error: 'error'} is returned
*/
function authLoginV3(email: string, password: string): {authUserId: number, token: string} {
  const data: Data = getData();

  let emailvalid = false;
  let passwordvalid = false;
  let index = 0;

  for (let i = 0; i < data.users.length; i++) {
    if (email === data.users[i].email) {
      emailvalid = true;
      index = i;
    }
  }

  if (!emailvalid) {
    throw HTTPError(400, 'invalid email');
  }

  if (getHashOf(password + secret) === data.users[index].password) {
    passwordvalid = true;
  }

  if (!passwordvalid) {
    throw HTTPError(400, 'invalid password');
  }

  const token: string = getHashOf(generateToken(Math.random()) + secret);
  data.users[index].token.push(token);
  setData(data);

  return {
    token: token,
    authUserId: data.users[index].uId
  };
}
/**
  * <authLogoutV2 logs out user and removes their session token>
  *
  * @param {string} token - A string that identifies an authorised user for the session
  *
  *
  * @returns {} - Returns if there are no errors
  * @returns {string} - Returns if invalid token
*/
function authLogoutV2(token: string): Record<string, unknown> | {error: string} {
  if (!isTokenValid(token)) {
    throw HTTPError(403);
  }
  let i = 0;
  let j = 0;
  const data: Data = getData();
  for (i; i < data.users.length; i++) {
    if (data.users[i].token.includes(token)) break;
  }
  for (j; j < data.users[i].token.length; j++) {
    if (data.users[i].token[j] === token) break;
  }
  data.users[i].token.splice(j);
  setData(data);
  return {};
}

/**
  * <This function takes in the inputted details and registers a user into
  * the users of data in dataStore, then returns the authUserId>
  *
  * @param {string} email - Email the registrating user will use
  * @param {string} password - Password the registrating user will use
  * @param {string} nameFirst - First name of registrating user
  * @param {string} nameLast - Last name of registrating user
  * ...
  *
  * @returns {integer, string} - If all parameters are valid, an authUserId is returned
  * @returns {object} - If at least one of the parameters are invalid,
  *
*/

function authRegisterV3(email: string, password: string, nameFirst: string, nameLast: string): Error | {token: string, authUserId: number} {
  const data: Data = getData();

  const emailValid: boolean = validator.isEmail(email);
  const emailCheck: boolean = data.users.map(user => user.email).includes(email);

  if (!emailValid) {
    throw HTTPError(400, 'email entered is not a valid email');
  } else if (emailCheck) {
    throw HTTPError(400, 'email is already being used by another user');
  } else if (password.length < 6) {
    throw HTTPError(400, 'length of password is less than 6 characters');
  } else if (nameFirst.length < 1 || nameFirst.length > 50) {
    throw HTTPError(400, 'length of nameFirst is not between 1 and 50 characters inclusive');
  } else if (nameLast.length < 1 || nameLast.length > 50) {
    throw HTTPError(400, 'length of nameLast is not between 1 and 50 characters inclusive');
  }

  const handle: string = nameFirst.toLowerCase() + nameLast.toLowerCase();
  const userHandle: string[] = handle.split('').filter(character => character.match(/[0-9a-z]/i));
  while (userHandle.length > 20) {
    userHandle.pop();
  }
  const userHandleStr: string = recursive(userHandle.join(''));

  const uId: number = data.users.length + 1;
  const token: string = getHashOf(generateToken(Math.random()) + secret);

  data.users.push({
    uId: uId,
    nameFirst: nameFirst,
    nameLast: nameLast,
    email: email,
    handleStr: userHandleStr,
    password: getHashOf(password + secret),
    token: [token],
    resetCode: null
  });

  setData(data);

  return {
    token: token,
    authUserId: uId
  };
}

/**
  * <Sends an email to the designated email with a password reset code. Doesn't return anything
  * for security purposes.>
  *
  * @param {string} email - Email which the resetcode is sent to
  * ...
  *
*/
function authPasswordResetRequestV1(email: string) {
  const data = getData();

  let emailvalid = false;
  let index = 0;
  let resetCode: string = null;

  for (let i = 0; i < data.users.length; i++) {
    if (email === data.users[i].email) {
      emailvalid = true;
      index = i;
      resetCode = ResetCodeGenerator();
      data.users[index].resetCode = resetCode;
    }
  }

  if (!emailvalid) {
    return {};
  }

  data.users[index].token = [];

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'compauthenticator@gmail.com',
      pass: 'gjkdfajipaafntmv'
    }
  });
  const mailOptions = {
    from: 'compauthenticator@gmail.com',
    to: email,
    subject: 'Password request',
    text: resetCode
  };

  transporter.sendMail(mailOptions);
  setData(data);
  return {};
}

/**
  * <Resets the password if given the correct resetCode and valid password.
  * Doesn't return anything for security purposes.>
  *
  * @param {string} resetCode - Reset code which was sent to the email
  * @param {string} newPassword - New password of the user
  * ...
  *
*/
// hashing the password or token? Idk tbh
function authPasswordResetResetV1(resetCode: string, newPassword: string) {
  const data = getData();

  const userIndex: number = data.users.map(user => user.resetCode).indexOf(resetCode);
  if (userIndex < 0) {
    throw HTTPError(400, 'invalid resetCode');
  }

  if (newPassword.length < 6) {
    throw HTTPError(400, 'password cannot be less than 6 characters');
  }

  data.users[userIndex].password = getHashOf(newPassword + secret);

  data.users[userIndex].resetCode = null;
  setData(data);

  return {};
}

export { authRegisterV3, authLoginV3, authLogoutV2, authPasswordResetResetV1, authPasswordResetRequestV1 };
