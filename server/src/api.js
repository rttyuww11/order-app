import { Router } from 'express';
import { pool } from './database.js';

const router = Router();
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusOrder = ['RECEIVED', 'PREPARING', 'COMPLETED'];

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireUuid(value, resource) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new ApiError(404, `${resource.toUpperCase()}_NOT_FOUND`, `${resource} 정보를 찾을 수 없습니다.`);
  }
}

function validateOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new ApiError(400, 'INVALID_ITEMS', '주문 항목은 1개 이상이어야 합니다.');
  }

  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ApiError(400, 'INVALID_ITEM', '주문 항목 형식이 올바르지 않습니다.');
    }

    requireUuid(item.menuId, 'menu');
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new ApiError(400, 'INVALID_QUANTITY', '수량은 1 이상의 정수여야 합니다.');
    }

    if (
      !Array.isArray(item.optionIds) ||
      item.optionIds.some(
        (id) => typeof id !== 'string' || !uuidPattern.test(id),
      ) ||
      new Set(item.optionIds).size !== item.optionIds.length
    ) {
      throw new ApiError(400, 'INVALID_OPTIONS', '메뉴 옵션 정보가 올바르지 않습니다.');
    }
  }
}

async function fetchOrders(client, orderIds) {
  const ordersResult = orderIds
    ? await client.query(
        `SELECT id, ordered_at, status, total_amount
         FROM orders
         WHERE id = ANY($1::uuid[])
         ORDER BY ordered_at DESC`,
        [orderIds],
      )
    : await client.query(
        `SELECT id, ordered_at, status, total_amount
         FROM orders
         ORDER BY ordered_at DESC`,
      );
  const orders = ordersResult.rows;

  if (orders.length === 0) return [];

  const ids = orders.map((order) => order.id);
  const itemsResult = await client.query(
    `SELECT id, order_id, menu_id, menu_name, quantity, unit_price, item_amount
     FROM order_items
     WHERE order_id = ANY($1::uuid[])
     ORDER BY id`,
    [ids],
  );
  const items = itemsResult.rows;
  const optionsResult = items.length
    ? await client.query(
        `SELECT order_item_id, option_id, option_name, option_price
         FROM order_item_options
         WHERE order_item_id = ANY($1::uuid[])
         ORDER BY option_name`,
        [items.map((item) => item.id)],
      )
    : { rows: [] };

  const optionsByItem = new Map();
  for (const option of optionsResult.rows) {
    const itemOptions = optionsByItem.get(option.order_item_id) ?? [];
    itemOptions.push({
      id: option.option_id,
      name: option.option_name,
      price: option.option_price,
    });
    optionsByItem.set(option.order_item_id, itemOptions);
  }

  const itemsByOrder = new Map();
  for (const item of items) {
    const orderItems = itemsByOrder.get(item.order_id) ?? [];
    orderItems.push({
      id: item.id,
      menuId: item.menu_id,
      name: item.menu_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      itemAmount: item.item_amount,
      options: optionsByItem.get(item.id) ?? [],
    });
    itemsByOrder.set(item.order_id, orderItems);
  }

  return orders.map((order) => ({
    id: order.id,
    orderedAt: order.ordered_at,
    status: order.status,
    totalAmount: order.total_amount,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

router.get('/menus', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT
         m.id,
         m.name,
         m.description,
         m.price,
         m.image_url AS "imageUrl",
         m.stock_quantity AS "stockQuantity",
         COALESCE(
           json_agg(
             json_build_object(
               'id', o.id,
               'name', o.name,
               'price', o.price,
               'selectionGroup', o.selection_group
             )
             ORDER BY o.name
           ) FILTER (WHERE o.id IS NOT NULL),
           '[]'::json
         ) AS options
       FROM menus m
       LEFT JOIN menu_options o ON o.menu_id = m.id
       WHERE m.is_available = TRUE
       GROUP BY m.id
       ORDER BY m.created_at, m.name`,
    );
    response.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/menus', async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, price, image_url AS "imageUrl",
              stock_quantity AS "stockQuantity", is_available AS "isAvailable"
       FROM menus
       ORDER BY created_at, name`,
    );
    response.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/menus/:menuId/stock', async (request, response, next) => {
  try {
    requireUuid(request.params.menuId, 'menu');
    const { delta } = request.body ?? {};
    if (delta !== 1 && delta !== -1) {
      throw new ApiError(400, 'INVALID_DELTA', '재고 변경량은 +1 또는 -1이어야 합니다.');
    }

    const result = await pool.query(
      `UPDATE menus
       SET stock_quantity = stock_quantity + $2
       WHERE id = $1 AND stock_quantity + $2 >= 0
       RETURNING id, name, description, price, image_url AS "imageUrl",
                 stock_quantity AS "stockQuantity", is_available AS "isAvailable"`,
      [request.params.menuId, delta],
    );

    if (result.rowCount === 0) {
      const exists = await pool.query('SELECT 1 FROM menus WHERE id = $1', [
        request.params.menuId,
      ]);
      if (exists.rowCount === 0) {
        throw new ApiError(404, 'MENU_NOT_FOUND', '메뉴 정보를 찾을 수 없습니다.');
      }
      throw new ApiError(409, 'INSUFFICIENT_STOCK', '재고는 0개 미만이 될 수 없습니다.');
    }

    response.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/orders', async (request, response, next) => {
  const client = await pool.connect();

  try {
    const { items } = request.body ?? {};
    validateOrderItems(items);

    await client.query('BEGIN');

    const menuIds = [...new Set(items.map((item) => item.menuId))].sort();
    const menuResult = await client.query(
      `SELECT id, name, price, stock_quantity, is_available
       FROM menus
       WHERE id = ANY($1::uuid[])
       ORDER BY id
       FOR UPDATE`,
      [menuIds],
    );
    const menus = new Map(menuResult.rows.map((menu) => [menu.id, menu]));

    for (const menuId of menuIds) {
      const menu = menus.get(menuId);
      if (!menu) {
        throw new ApiError(404, 'MENU_NOT_FOUND', '메뉴 정보를 찾을 수 없습니다.');
      }
      if (!menu.is_available) {
        throw new ApiError(409, 'MENU_UNAVAILABLE', `${menu.name} 메뉴는 현재 주문할 수 없습니다.`);
      }
    }

    const optionIds = [...new Set(items.flatMap((item) => item.optionIds))];
    const optionResult = await client.query(
      `SELECT id, menu_id, name, price, selection_group
       FROM menu_options
       WHERE menu_id = ANY($1::uuid[])`,
      [menuIds],
    );
    const options = new Map(optionResult.rows.map((option) => [option.id, option]));

    for (const optionId of optionIds) {
      if (!options.has(optionId)) {
        throw new ApiError(404, 'OPTION_NOT_FOUND', '메뉴 옵션을 찾을 수 없습니다.');
      }
    }

    const quantitiesByMenu = new Map();
    const pricedItems = items.map((item) => {
      const menu = menus.get(item.menuId);
      const selectedOptions = item.optionIds.map((optionId) => {
        const option = options.get(optionId);
        if (option.menu_id !== menu.id) {
          throw new ApiError(400, 'INVALID_OPTION', '해당 메뉴에서 선택할 수 없는 옵션입니다.');
        }
        return option;
      });
      const requiredGroups = new Set(
        optionResult.rows
          .filter(
            (option) =>
              option.menu_id === menu.id && option.selection_group !== null,
          )
          .map((option) => option.selection_group),
      );
      for (const group of requiredGroups) {
        if (
          selectedOptions.filter((option) => option.selection_group === group)
            .length !== 1
        ) {
          throw new ApiError(
            400,
            'INVALID_OPTION_SELECTION',
            '아메리카노 온도(아이스 또는 핫)를 하나 선택해 주세요.',
          );
        }
      }
      const optionTotal = selectedOptions.reduce(
        (total, option) => total + option.price,
        0,
      );
      const unitPrice = menu.price + optionTotal;
      const itemAmount = unitPrice * item.quantity;

      if (!Number.isSafeInteger(itemAmount)) {
        throw new ApiError(400, 'INVALID_AMOUNT', '주문 금액이 올바르지 않습니다.');
      }

      quantitiesByMenu.set(
        menu.id,
        (quantitiesByMenu.get(menu.id) ?? 0) + item.quantity,
      );
      return { menu, selectedOptions, quantity: item.quantity, unitPrice, itemAmount };
    });

    for (const [menuId, quantity] of quantitiesByMenu) {
      const menu = menus.get(menuId);
      if (!Number.isSafeInteger(quantity) || menu.stock_quantity < quantity) {
        throw new ApiError(409, 'INSUFFICIENT_STOCK', `${menu.name} 메뉴의 재고가 부족합니다.`);
      }
    }

    const totalAmount = pricedItems.reduce(
      (total, item) => total + item.itemAmount,
      0,
    );
    if (!Number.isSafeInteger(totalAmount) || totalAmount > 2147483647) {
      throw new ApiError(400, 'INVALID_AMOUNT', '주문 금액이 올바르지 않습니다.');
    }

    for (const [menuId, quantity] of quantitiesByMenu) {
      await client.query(
        `UPDATE menus
         SET stock_quantity = stock_quantity - $2
         WHERE id = $1 AND stock_quantity >= $2`,
        [menuId, quantity],
      );
    }

    const orderResult = await client.query(
      `INSERT INTO orders (total_amount) VALUES ($1)
       RETURNING id`,
      [totalAmount],
    );
    const orderId = orderResult.rows[0].id;

    for (const item of pricedItems) {
      const itemResult = await client.query(
        `INSERT INTO order_items
           (order_id, menu_id, menu_name, quantity, unit_price, item_amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          orderId,
          item.menu.id,
          item.menu.name,
          item.quantity,
          item.menu.price,
          item.itemAmount,
        ],
      );
      const orderItemId = itemResult.rows[0].id;

      for (const option of item.selectedOptions) {
        await client.query(
          `INSERT INTO order_item_options
             (order_item_id, option_id, option_name, option_price)
           VALUES ($1, $2, $3, $4)`,
          [orderItemId, option.id, option.name, option.price],
        );
      }
    }

    const [order] = await fetchOrders(client, [orderId]);
    await client.query('COMMIT');
    response.status(201).json(order);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to roll back order transaction:', rollbackError);
    }
    next(error);
  } finally {
    client.release();
  }
});

router.get('/orders/:orderId', async (request, response, next) => {
  try {
    requireUuid(request.params.orderId, 'order');
    const [order] = await fetchOrders(pool, [request.params.orderId]);
    if (!order) {
      throw new ApiError(404, 'ORDER_NOT_FOUND', '주문 정보를 찾을 수 없습니다.');
    }
    response.json(order);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/orders', async (_request, response, next) => {
  try {
    const [orders, counts] = await Promise.all([
      fetchOrders(pool),
      pool.query(
        `SELECT
           COUNT(*)::INTEGER AS total,
           COUNT(*) FILTER (WHERE status = 'RECEIVED')::INTEGER AS received,
           COUNT(*) FILTER (WHERE status = 'PREPARING')::INTEGER AS preparing,
           COUNT(*) FILTER (WHERE status = 'COMPLETED')::INTEGER AS completed
         FROM orders`,
      ),
    ]);
    response.json({ orders, summary: counts.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/admin/orders', async (_request, response, next) => {
  try {
    const result = await pool.query('DELETE FROM orders RETURNING id');
    response.json({ deletedCount: result.rowCount });
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/orders/:orderId/status', async (request, response, next) => {
  const client = await pool.connect();

  try {
    requireUuid(request.params.orderId, 'order');
    const { status } = request.body ?? {};
    if (status !== 'PREPARING' && status !== 'COMPLETED') {
      throw new ApiError(400, 'INVALID_STATUS', '변경할 주문 상태가 올바르지 않습니다.');
    }

    await client.query('BEGIN');
    const currentResult = await client.query(
      'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
      [request.params.orderId],
    );
    if (currentResult.rowCount === 0) {
      throw new ApiError(404, 'ORDER_NOT_FOUND', '주문 정보를 찾을 수 없습니다.');
    }

    const currentStatus = currentResult.rows[0].status;
    const nextStatus = statusOrder[statusOrder.indexOf(currentStatus) + 1];
    if (nextStatus !== status) {
      throw new ApiError(400, 'INVALID_STATUS_TRANSITION', '주문 상태는 다음 단계로만 변경할 수 있습니다.');
    }

    await client.query('UPDATE orders SET status = $2 WHERE id = $1', [
      request.params.orderId,
      status,
    ]);
    const [order] = await fetchOrders(client, [request.params.orderId]);
    await client.query('COMMIT');
    response.json(order);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to roll back order status transaction:', rollbackError);
    }
    next(error);
  } finally {
    client.release();
  }
});

export default router;
