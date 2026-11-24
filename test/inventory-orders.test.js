const test = require('node:test');
const assert = require('node:assert/strict');

const inventory = require('../lib/inventory');
const orders = require('../lib/orders');

function product(overrides) {
  return Object.assign({
    id: 1,
    name: 'Test Product',
    stock: 10,
    reserved: 2,
    price: 100,
    reorderLevel: 3
  }, overrides || {});
}

function orderDb(overrides) {
  return Object.assign({
    nextOrderId: 1001,
    products: [product()],
    orders: [],
    customers: []
  }, overrides || {});
}

function storedOrder(overrides) {
  return Object.assign({
    id: 1001,
    date: '01/01/2024',
    customer: 'Test Customer',
    customerId: null,
    paymentMode: 'cash',
    status: 'completed',
    items: [{ id: 1, qty: 2 }],
    total: 200
  }, overrides || {});
}

test('getSellableStock subtracts reserved units from physical stock', () => {
  assert.equal(inventory.getSellableStock(product({ stock: 18, reserved: 5 })), 13);
});

test('getSellableStock clamps negative availability to zero', () => {
  assert.equal(inventory.getSellableStock(product({ stock: 4, reserved: 7 })), 0);
});

test('getSellableStock returns zero for a missing product', () => {
  assert.equal(inventory.getSellableStock(null), 0);
});

test('inventory.check accepts quantity equal to sellable stock', () => {
  const products = [product({ stock: 10, reserved: 2 })];

  const result = inventory.check(products, [{ id: 1, qty: 8 }]);

  assert.deepEqual(result, { ok: true });
});

test('inventory.check accepts quantity below sellable stock', () => {
  const result = inventory.check([product({ stock: 10, reserved: 2 })], [{ id: 1, qty: 7 }]);

  assert.deepEqual(result, { ok: true });
});

test('inventory.check rejects quantity above sellable stock', () => {
  const result = inventory.check([product({ stock: 10, reserved: 2 })], [{ id: 1, qty: 9 }]);

  assert.equal(result.ok, false);
  assert.match(result.msg, /8 sellable available/);
});

test('inventory.check rejects an unknown product', () => {
  const result = inventory.check([product()], [{ id: 999, qty: 1 }]);

  assert.deepEqual(result, { ok: false, msg: 'Unknown product 999' });
});

test('inventory.reserve deducts physical stock and leaves reserved stock unchanged', () => {
  const products = [product({ stock: 10, reserved: 2 })];

  inventory.reserve(products, [{ id: 1, qty: 3 }]);

  assert.equal(products[0].stock, 7);
  assert.equal(products[0].reserved, 2);
});

test('inventory.release with stored id items restores physical stock', () => {
  const products = [product({ stock: 7, reserved: 2 })];

  inventory.release(products, [{ id: 1, qty: 3 }]);

  assert.equal(products[0].stock, 10);
  assert.equal(products[0].reserved, 2);
});

test('inventory.release leaves reserved stock unchanged for stored id items', () => {
  const products = [product({ stock: 7, reserved: 5 })];

  inventory.release(products, [{ id: 1, qty: 3 }]);

  assert.equal(products[0].stock, 10);
  assert.equal(products[0].reserved, 5);
});

test('inventory.release ignores an unknown productId without throwing', () => {
  const products = [product({ stock: 7, reserved: 5 })];

  assert.doesNotThrow(() => inventory.release(products, [{ productId: 999, qty: 3 }]));
  assert.deepEqual(products, [product({ stock: 7, reserved: 5 })]);
});

test('orders.cancel changes an existing order status and records cancellation details', () => {
  const db = orderDb({ orders: [storedOrder()] });

  const result = orders.cancel(db, 1001, 'Test cancellation');

  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'cancelled');
  assert.equal(result.order.cancelReason, 'Test cancellation');
  assert.match(result.order.cancelledAt, /^\d{2}\/\d{2}\/\d{4}$/);
});

test('orders.cancel rejects a second cancellation of the same order', () => {
  const db = orderDb({ orders: [storedOrder({ status: 'cancelled' })] });

  const result = orders.cancel(db, 1001, 'Duplicate cancellation');

  assert.deepEqual(result, {
    ok: false,
    error: 'Order #1001 is already cancelled'
  });
});

test('orders.cancel reverses a Khata debit when payment mode and customer are present', () => {
  const db = orderDb({
    customers: [{ id: 7, openingBalance: 10, totalBilled: 100, totalSettled: 20 }],
    orders: [storedOrder({ customerId: 7, paymentMode: 'khata', total: 35 })]
  });

  const result = orders.cancel(db, 1001, 'Khata cancellation');

  assert.equal(result.ok, true);
  assert.equal(db.customers[0].totalBilled, 65);
  assert.equal(db.customers[0].balance, 55);
});

test('orders.cancel does not reverse a debit for a non-Khata order', () => {
  const db = orderDb({
    customers: [{ id: 7, openingBalance: 10, totalBilled: 100, totalSettled: 20 }],
    orders: [storedOrder({ customerId: 7, paymentMode: 'cash', total: 35 })]
  });

  const result = orders.cancel(db, 1001, 'Cash cancellation');

  assert.equal(result.ok, true);
  assert.equal(db.customers[0].totalBilled, 100);
  assert.equal(db.customers[0].balance, undefined);
});

test('orders.cancel returns an error for an unknown order', () => {
  const db = orderDb();

  assert.deepEqual(orders.cancel(db, 4040, 'Missing order'), {
    ok: false,
    error: 'Order not found'
  });
});
