import { Env, RegisterRequest, LoginRequest, User } from '../types';
import { hashPassword, verifyPassword, createJWT, getUserIdFromRequest } from '../utils/auth';
import { jsonResponse, errorResponse, successResponse } from '../utils/response';

/**
 * Register a new user
 */
export async function register(request: Request, env: Env): Promise<Response> {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    // Check if user exists
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existing) {
      return errorResponse('User already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await env.DB.prepare(
      'INSERT INTO users (email, hashed_password, created_at) VALUES (?, ?, datetime("now")) RETURNING id'
    ).bind(email, hashedPassword).first();

    return successResponse({ 
      id: result?.id,
      email 
    }, 'User registered successfully');
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('Registration failed', 500);
  }
}

/**
 * Login user
 */
export async function login(request: Request, env: Env): Promise<Response> {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    // Find user
    const user = await env.DB.prepare(
      'SELECT id, email, hashed_password, role FROM users WHERE email = ?'
    ).bind(email).first<User>();

    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.hashed_password);
    if (!isValid) {
      return errorResponse('Invalid credentials', 401);
    }

    // Create JWT token
    const token = await createJWT(user.id, user.email, env, user.role || 'user');

    return jsonResponse({
      access_token: token,
      token_type: 'bearer'
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Login failed', 500);
  }
}

/**
 * Get current user info
 */
export async function getCurrentUser(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const user = await env.DB.prepare(
      'SELECT id, email, created_at FROM users WHERE id = ?'
    ).bind(userId).first<User>();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return jsonResponse({
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return errorResponse('Failed to get user', 500);
  }
}
