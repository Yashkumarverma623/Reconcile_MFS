import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/audit.service';
import { Role } from '@prisma/client';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  organizationName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = registerSchema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: parsed.email },
      });

      if (existingUser) {
        throw new AppError('Email address is already registered', 400, 'USER_EXISTS');
      }

      const passwordHash = await bcrypt.hash(parsed.password, 10);

      // Create Organization & OWNER User
      const organization = await prisma.organization.create({
        data: { name: parsed.organizationName },
      });

      const user = await prisma.user.create({
        data: {
          email: parsed.email,
          passwordHash,
          name: parsed.name,
          role: Role.OWNER,
          organizationId: organization.id,
        },
      });

      // Create Default Matching Rule
      await prisma.matchingRule.create({
        data: {
          organizationId: organization.id,
          name: 'Default ID + Amount Matching',
          primaryKey: 'external_id',
          requireAmountMatch: true,
          dateToleranceSeconds: 86400,
        },
      });

      await AuditService.log({
        organizationId: organization.id,
        userId: user.id,
        action: 'USER_REGISTERED',
        resource: `User:${user.id}`,
        details: { email: user.email, organization: organization.name },
      });

      const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-min-32-chars';
      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: organization.name,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: parsed.email },
        include: { organization: true },
      });

      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      const valid = await bcrypt.compare(parsed.password, user.passwordHash);
      if (!valid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      await AuditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'USER_LOGIN',
        resource: `User:${user.id}`,
      });

      const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-min-32-chars';
      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '7d' });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { organization: true },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
