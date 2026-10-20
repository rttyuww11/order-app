CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  image_url TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  selection_group TEXT,
  UNIQUE (menu_id, name)
);

ALTER TABLE menu_options
  ADD COLUMN IF NOT EXISTS selection_group TEXT;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'RECEIVED'
    CHECK (status IN ('RECEIVED', 'PREPARING', 'COMPLETED')),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0)
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id),
  menu_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  item_amount INTEGER NOT NULL CHECK (item_amount >= 0)
);

CREATE TABLE IF NOT EXISTS order_item_options (
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  option_id UUID NOT NULL,
  option_name TEXT NOT NULL,
  option_price INTEGER NOT NULL CHECK (option_price >= 0),
  PRIMARY KEY (order_item_id, option_id)
);

CREATE INDEX IF NOT EXISTS orders_ordered_at_idx ON orders (ordered_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

INSERT INTO menus (
  id, name, description, price, stock_quantity, is_available, image_url
)
VALUES
  ('10000000-0000-4000-8000-000000000001', '아메리카노', '원두의 풍미를 아이스 또는 핫으로 즐기는 아메리카노', 4000, 10, TRUE, '/아메리카노 ice.jpg'),
  ('10000000-0000-4000-8000-000000000002', '고구마라떼', '달콤하고 포근한 고구마와 부드러운 우유', 5000, 10, TRUE, '/고구마 라떼.jpg'),
  ('10000000-0000-4000-8000-000000000003', '카페라떼', '부드러운 우유와 진한 에스프레소', 5000, 10, TRUE, '/카페라떼.jpg')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    image_url = EXCLUDED.image_url;

INSERT INTO menu_options (id, menu_id, name, price, selection_group)
VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '샷 추가', 500, NULL),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '시럽 추가', 0, NULL),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '샷 추가', 500, NULL),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '시럽 추가', 0, NULL),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', '샷 추가', 500, NULL),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000003', '시럽 추가', 0, NULL),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '아이스', 0, 'temperature'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '핫', 0, 'temperature'),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002', '아이스', 0, 'temperature'),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002', '핫', 0, 'temperature'),
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000003', '아이스', 0, 'temperature'),
  ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000003', '핫', 0, 'temperature')
ON CONFLICT (id) DO UPDATE
SET menu_id = EXCLUDED.menu_id,
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    selection_group = EXCLUDED.selection_group;
