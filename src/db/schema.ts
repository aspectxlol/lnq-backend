import { pgTable, serial, varchar, integer, timestamp, text, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(), // Price in IDR
  imageId: varchar('image_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  pickupDate: date('pickup_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  itemType: varchar('item_type', { length: 16 }).notNull().default('product'),
  productId: integer('product_id').references(() => products.id), // nullable for custom
  amount: integer('amount'), // nullable for custom
  notes: text('notes'),
  priceAtSale: integer('price_at_sale'), // Price at the time of sale
  customName: varchar('custom_name', { length: 255 }), // for custom items
  customPrice: integer('custom_price'), // for custom items
});

// Relations
export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));
