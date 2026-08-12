/**
 * Focused unit tests for controllers/authController.js register/login.
 *
 * Most of authController.js is thin CRUD glue around the `users` table and
 * isn't worth unit testing (e.g. profile updates, address CRUD, OTP mock
 * endpoints) — that logic is "fetch row, maybe update row" with no real
 * business rules, so DB-mocked tests for it would just re-assert the SQL
 * string, which is brittle and low-value.
 *
 * register() and login(), however, DO contain real safety-critical rules
 * (password length floor, username length floor, email format check,
 * password hashing via bcrypt, suspended-account lockout, invalid credential
 * handling) that are worth locking down. The DB layer (`config/database`) is
 * mocked so no live MySQL connection is required; bcrypt and JWT signing are
 * left un-mocked and exercised for real, since they're pure/local and their
 * exact behavior (hash verifies, wrong password fails) is precisely what
 * we want to confirm actually works end-to-end.
 */

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { verifyToken } = require('../utils/jwt');
const authController = require('../controllers/authController');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.cookie = jest.fn(() => res);
  res.clearCookie = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  pool.query.mockReset();
});

describe('authController.register — input validation', () => {
  test('missing username => 400', async () => {
    const req = { body: { email: 'a@b.com', password: 'password1' } };
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('missing both email and phone => 400', async () => {
    const req = { body: { username: 'newuser', password: 'password1' } };
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('missing password => 400', async () => {
    const req = { body: { username: 'newuser', email: 'a@b.com' } };
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('malformed email (no "@") => 400 Invalid email format', async () => {
    const req = { body: { username: 'newuser', email: 'not-an-email', password: 'password1' } };
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email format' });
  });

  test('malformed email (no ".") => 400 Invalid email format', async () => {
    const req = { body: { username: 'newuser', email: 'a@bcom', password: 'password1' } };
    const res = mockRes();
    await authController.register(req, res);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email format' });
  });

  test('password shorter than 8 chars => 400', async () => {
    const req = { body: { username: 'newuser', email: 'a@b.com', password: '1234567' } };
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Password must be at least 8 characters' });
  });

  test('password of exactly 8 chars passes the length check (proceeds to DB lookup)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // no existing user
    pool.query.mockResolvedValueOnce({}); // insert
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'newuser', email: 'a@b.com', phone: null, avatar_url: null, active_role: 'buyer' }] });
    const req = { body: { username: 'newuser', email: 'a@b.com', password: '12345678' } };
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('username shorter than 3 chars => 400', async () => {
    const req = { body: { username: 'ab', email: 'a@b.com', password: 'password1' } };
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username must be at least 3 characters' });
  });

  test('username/email/phone already registered => 400', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // existing user found
    const req = { body: { username: 'newuser', email: 'a@b.com', password: 'password1' } };
    const res = mockRes();
    await authController.register(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username, email, or phone number already registered' });
  });
});

describe('authController.register — success path & password hashing', () => {
  test('valid registration hashes the password with bcrypt and returns 201 with a valid token', async () => {
    const plainPassword = 'password1';

    pool.query.mockResolvedValueOnce({ rows: [] }); // 1) existing-user check: none found
    pool.query.mockResolvedValueOnce({}); // 2) INSERT
    pool.query.mockResolvedValueOnce({ // 3) SELECT the newly created user
      rows: [{ id: 42, username: 'newuser', email: 'a@b.com', phone: null, avatar_url: null, active_role: 'buyer' }],
    });

    const req = { body: { username: 'newuser', email: 'a@b.com', password: plainPassword } };
    const res = mockRes();
    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);

    // Verify the password stored via the INSERT call was actually bcrypt-hashed,
    // not stored in plaintext.
    const insertCall = pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO users'));
    expect(insertCall).toBeDefined();
    const hashedPassword = insertCall[1][2]; // params: [username, email, password, phone, active_role]
    expect(hashedPassword).not.toBe(plainPassword);
    expect(hashedPassword).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    await expect(bcrypt.compare(plainPassword, hashedPassword)).resolves.toBe(true);

    // Verify the JSON response carries a usable JWT identifying the new user.
    const jsonPayload = res.json.mock.calls[res.json.mock.calls.length - 1][0];
    expect(jsonPayload.token).toBeDefined();
    const decoded = verifyToken(jsonPayload.token);
    expect(decoded.userId).toBe(42);

    // Response body must never leak the password hash.
    expect(jsonPayload.user.password).toBeUndefined();
  });
});

describe('authController.login', () => {
  const plainPassword = 'correct-password-1';
  let hashedPassword;

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash(plainPassword, 10);
  });

  test('missing identifier or password => 400', async () => {
    const req = { body: {} };
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('unknown identifier (no matching user) => 401', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const req = { body: { login_identifier: 'nobody@example.com', password: plainPassword } };
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email/phone or password' });
  });

  test('suspended account => 403, even before password is checked', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 5, status: 'suspended', password: hashedPassword }],
    });
    const req = { body: { login_identifier: 'suspended@example.com', password: plainPassword } };
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('wrong password => 401', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 5, status: 'active', password: hashedPassword }],
    });
    const req = { body: { login_identifier: 'user@example.com', password: 'totally-wrong-password' } };
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email/phone or password' });
  });

  test('correct credentials => 200 with a valid token for that user', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 7, status: 'active', password: hashedPassword, username: 'someone', email: 'user@example.com', phone: null, avatar_url: null, active_role: 'buyer', role: null }],
    });
    const req = { body: { login_identifier: 'user@example.com', password: plainPassword } };
    const res = mockRes();
    await authController.login(req, res);

    // No explicit res.status() call on the success path (defaults to 200).
    expect(res.status).not.toHaveBeenCalled();
    const jsonPayload = res.json.mock.calls[0][0];
    expect(jsonPayload.message).toBe('Login successful');
    const decoded = verifyToken(jsonPayload.token);
    expect(decoded.userId).toBe(7);
  });
});
