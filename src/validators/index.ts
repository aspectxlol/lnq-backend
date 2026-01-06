import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z.number().int().positive('Price must be a positive number'),
  imageId: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').optional(),
  description: z.string().optional(),
  price: z.number().int().positive('Price must be a positive number').optional(),
  imageId: z.string().optional(),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.number().int().positive('Product ID must be positive'),
      amount: z.number().int().positive('Amount must be positive'),
      notes: z.string().optional(),
    })
  ).min(1, 'At least one item is required'),
});

export const updateOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').optional(),
  pickupDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'), z.null()]).optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.number().int().positive('Product ID must be positive'),
      amount: z.number().int().positive('Amount must be positive'),
      notes: z.string().optional(),
    })
  ).min(1, 'At least one item is required').optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
