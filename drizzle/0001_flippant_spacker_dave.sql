ALTER TABLE "order_items" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "item_type" varchar(16) DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "price_at_sale" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "custom_name" varchar(255);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "custom_price" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "notes" text;