-- Polymorphic order_items: support both product and custom items
ALTER TABLE order_items ADD COLUMN item_type varchar(16) NOT NULL DEFAULT 'product';
ALTER TABLE order_items ADD COLUMN custom_name varchar(255);
ALTER TABLE order_items ADD COLUMN custom_price integer;
ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE order_items ALTER COLUMN amount DROP NOT NULL;