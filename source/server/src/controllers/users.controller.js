import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

// Obtener todos los usuarios
export const getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;

    const whereFilter = {};

    if (role) {
      whereFilter.role = role;
    }

    if (status) {
      whereFilter.status = status;
    }

    if (search) {
      whereFilter.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const users = await prisma.user.findMany({
      where: whereFilter,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        phone: true,
        photo: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            loans: true,
            payments: true,
            collectionLogs: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const usersWithStats = users.map(user => ({
      ...user,
      loansCount: user._count.loans,
      paymentsCount: user._count.payments,
      collectionLogsCount: user._count.collectionLogs
    }));

    res.json(usersWithStats);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Obtener un usuario por ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        phone: true,
        photo: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Crear usuario
export const createUser = async (req, res) => {
  try {
    const { email, password, fullName, role, phone } = req.body;

    // Validaciones
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, fullName, role' 
      });
    }

    // Validar email único
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Validar rol
    const validRoles = ['ADMIN', 'ANALISTA', 'COBRADOR', 'CONSULTA'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        fullName: fullName.trim(),
        role,
        phone: phone?.trim() || null,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'USERS',
        action: 'CREATE',
        details: `Created user: ${user.fullName} (${user.email}) with role ${user.role}`,
        ipAddress: req.ip
      }
    });

    res.status(201).json(user);

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, role, phone, status } = req.body;

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // No permitir que el usuario se desactive a sí mismo
    if (parseInt(id) === req.user.id && status === 'INACTIVE') {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // No permitir que el usuario cambie su propio rol
    if (parseInt(id) === req.user.id && role && role !== existingUser.role) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Validar rol si se proporciona
    if (role) {
      const validRoles = ['ADMIN', 'ANALISTA', 'COBRADOR', 'CONSULTA'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (role) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (status) updateData.status = status;

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        phone: true,
        updatedAt: true
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'USERS',
        action: 'UPDATE',
        details: `Updated user: ${user.fullName} (${user.email})`,
        ipAddress: req.ip
      }
    });

    res.json(user);

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Cambiar contraseña
export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'USERS',
        action: 'RESET_PASSWORD',
        details: `Reset password for user: ${user.fullName} (${user.email})`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

// Eliminar usuario (soft delete)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir que el usuario se elimine a sí mismo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete (cambiar estado a INACTIVE)
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { status: 'INACTIVE' }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        module: 'USERS',
        action: 'DELETE',
        details: `Deactivated user: ${user.fullName} (${user.email})`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Obtener estadísticas de usuarios
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: 'ACTIVE' } });
    const inactiveUsers = await prisma.user.count({ where: { status: 'INACTIVE' } });

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {});

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      roleStats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
};