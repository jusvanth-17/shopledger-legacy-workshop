const test = require('node:test');
const assert = require('node:assert/strict');

const inventory = require('../lib/inventory');
const orders = require('../lib/orders');

function product(overrides) {
  return Object.assign({
    id: 1,
    name: 'Regression Product',
    stock: 10,
    reserved: 2,
    price: 100
  }, overrides || {});
}

function db(overrides) {
  return Object.assign({
    nextOrderId: 2001,
    products: [product()],
    orders: [],
    customers: []
  }, overrides || {});
}

function order(overrides) {
  return Object.assign({
    id: 2001,
    status: 'completed',
    paymentMode: 'cash',
    customerId: null,
    items: [{ id: 1, qty: 3 }],
    total: 300
  }, overrides || {});
}

test('regression: ordering exactly the sellable stock succeeds', () => {
  assert.deepEqual(inventory.check([product({ stock: 10, reserved: 2 })], [{ id: 1, qty: 8 }]), { ok: true });
});

test('regression: ordering above sellable stock fails', () => {
  const result = inventory.check([product({ stock: 10, reserved: 2 })], [{ id: 1, qty: 9 }]);
  assert.equal(result.ok, false);
  assert.match(result.msg, /8 sellable available/);
});

test('regression: cancelling restores physical stock using stored item ids', () => {
  const state = db({ products: [product({ stock: 7, reserved: 2 })], orders: [order()] });

  const result = orders.cancel(state, 2001, 'restore stock');

  assert.equal(result.ok, true);
  assert.equal(state.products[0].stock, 10);
  assert.equal(state.products[0].reserved, 2);
});

test('regression: independent reserved stock remains unchanged on cancellation', () => {
  const state = db({ products: [product({ stock: 7, reserved: 5 })], orders: [order()] });

  orders.cancel(state, 2001, 'preserve reservation');

  assert.equal(state.products[0].stock, 10);
  assert.equal(state.products[0].reserved, 5);
});

test('regression: cancelling an order twice cannot restore stock twice', () => {
  const state = db({ products: [product({ stock: 7, reserved: 2 })], orders: [order()] });

  assert.equal(orders.cancel(state, 2001, 'first cancellation').ok, true);
  const second = orders.cancel(state, 2001, 'duplicate cancellation');

  assert.deepEqual(second, { ok: false, error: 'Order #2001 is already cancelled' });
  assert.equal(state.products[0].stock, 10);
  assert.equal(state.products[0].reserved, 2);
});

test('regression: Khata cancellation restores stock and reverses the debit', () => {
  const state = db({
    products: [product({ stock: 7, reserved: 2 })],
    customers: [{ id: 9, openingBalance: 10, totalBilled: 100, totalSettled: 20 }],
    orders: [order({ customerId: 9, paymentMode: 'khata', total: 35 })]
  });

  const result = orders.cancel(state, 2001, 'Khata cancellation');

  assert.equal(result.ok, true);
  assert.equal(state.products[0].stock, 10);
  assert.equal(state.products[0].reserved, 2);
  assert.equal(state.customers[0].totalBilled, 65);
  assert.equal(state.customers[0].balance, 55);
});
