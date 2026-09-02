import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

const addMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['OWNER', 'MEMBER', 'VIEWER']),
  password: z.string().min(6),
});

export class OrganizationsController {
  static async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const members = await prisma.user.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json({ members });
    } catch (err) {
      next(err);
    }
  }

  static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationId!;
      const parsed = addMemberSchema.parse(req.body);

      const existing = await prisma.user.findUnique({
        where: { email: parsed.email },
      });

      if (existing) {
        throw new AppError('User with this email already exists', 400, 'USER_EXISTS');
      }

      const passwordHash = await bcrypt.hash(parsed.password, 10);
      const newUser = await prisma.user.create({
        data: {
          email: parsed.email,
          passwordHash,
          name: parsed.name,
          role: parsed.role as Role,
          organizationId: orgId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      res.status(201).json({ member: newUser });
    } catch (err) {
      next(err);
    }
  }
}
