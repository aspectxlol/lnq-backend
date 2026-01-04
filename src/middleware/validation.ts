import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export class ValidationError extends Error {
  constructor(public statusCode: number, public errors: any) {
    super('Validation error');
    this.name = 'ValidationError';
  }
}

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      next(new ValidationError(400, error.errors || error.message));
    }
  };
};
