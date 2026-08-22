import bcrypt from 'bcrypt';
import prisma from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        module: 'AUTH',
        action: 'LOGIN',
        details: `User ${user.email} logged in`,
        ipAddress: req.ip
      }
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        photo: user.photo
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const newAccessToken = generateAccessToken(payload);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

export const logout = async (req, res) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'AUTH',
        action: 'LOGOUT',
        details: `User ${req.user.email} logged out`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        photo: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};
export const getUsers = async (req, res) => {
  try {
    const { role, status } = req.query;

    const where = {};
    
    if (role) {
      where.role = role;
    }
    
    if (status) {
      where.status = status;
    } else {
      // Por defecto solo usuarios activos
      where.status = 'ACTIVE';
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        photo: true,
        status: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};