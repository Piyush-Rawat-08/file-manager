import crypto from 'node:crypto';
import { Router } from 'express';
import { User } from '../models/User.js';
import { signToken } from '../lib/tokens.js';

const router = Router();

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function userToDto(user) {
  return {
    id: String(user._id),
    email: user.email,
    email_confirmed_at: user.emailConfirmedAt ? user.emailConfirmedAt.toISOString() : null,
  };
}

function createSession(user) {
  const userDto = userToDto(user);
  const token = signToken({
    sub: userDto.id,
    email: userDto.email,
    email_confirmed_at: userDto.email_confirmed_at,
  });
  return {
    access_token: token,
    token_type: 'bearer',
    user: userDto,
  };
}

router.post('/signup', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Use a password with at least 8 characters.' });
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  const user = await User.create({
    email,
    passwordHash,
    salt,
    emailConfirmedAt: new Date(),
  });

  const session = createSession(user);
  return res.status(201).json({
    user: session.user,
    session,
  });
});

router.post('/signin', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid login credentials.' });
  }

  const hash = hashPassword(password, user.salt);
  const hashBuf = Buffer.from(hash, 'hex');
  const userHashBuf = Buffer.from(user.passwordHash, 'hex');

  if (hashBuf.length !== userHashBuf.length || !crypto.timingSafeEqual(hashBuf, userHashBuf)) {
    return res.status(401).json({ error: 'Invalid login credentials.' });
  }

  const session = createSession(user);
  return res.json({
    user: session.user,
    session,
  });
});

router.post('/signout', (_req, res) => {
  return res.json({ ok: true });
});

export default router;
