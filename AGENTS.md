# ShopLedger contribution guide

## Verified technology stack

- Node.js application using CommonJS modules (`package.json`, `server.js`).
- Express `^4.17.1` with `body-parser` `^1.19.0` (`package.json:12-15`).
- Static browser UI built with HTML, CSS, and browser JavaScript (`public/index.html`, `public/css/style.css`, `public/js/app.js`).
- Synchronous JSON-file persistence in `data/db.json`, implemented by `lib/store.js`.
- No test framework or test runner is configured in the repository.

## Application module map

- `server.js`: Express setup, static-file serving, API router mounting, and printable invoice route.
- `routes/products.js`: product and active-coupon endpoints.
- `routes/orders.js`: order listing, creation, and cancellation endpoints.
- `routes/customers.js`: customer listing and Khata settlement endpoint.
- `routes/reports.js`: dashboard, GST reconciliation, pricing preview, and admin export endpoints.
- `lib/inventory.js`: product lookup, sellable-stock calculation, stock checks, stock deduction/release, and inventory summaries.
- `lib/orders.js`: order creation, lookup, filtering, and cancellation.
- `lib/pricing.js`: subtotals, discounts, GST totals, and line breakdowns.
- `lib/coupons.js`: coupon normalization, validation, discount calculation, and active-coupon listing.
- `lib/tax.js`: item GST-rate resolution and CGST/SGST splitting.
- `lib/ledger.js`: customer balances, Khata charges/reversals, and settlements.
- `lib/store.js`: `data/db.json` reads, writes, structure initialization, and audit logging.
- `lib/invoice.js`: invoice figure calculation and printable HTML rendering.
- `lib/reports.js`: dashboard summaries and GST reconciliation.
- `lib/dates.js`: date formatting, date-key normalization, and fiscal-year calculation.
- `config.js`: server, shop, tax, inventory, and coupon configuration.
- `data/db.json`: products, customers, orders, settlements, audit log, and ID counters.
- `public/index.html` and `public/js/app.js`: POS, order history, Khata, inventory audit, GST audit, and browser API interactions.

## Supported commands

Start the application:

```sh
npm start
```

This runs the `start` script from `package.json`, which executes `node server.js`.

Run the configured test command:

```sh
npm test
```

The current `test` script is a placeholder that prints `Error: no test specified` and exits with status 1. No automated test suite is currently configured.

## Change requirements

1. Before changing existing behavior, write characterization tests that capture the behavior currently implemented by the relevant module.
2. Modify only the module or modules relevant to the selected ticket. Do not make unrelated refactors or behavior changes.
3. Tests must use isolated data and must never modify `data/db.json`. Use in-memory fixtures, temporary test data, or another isolated test-only mechanism.
4. Do not introduce new runtime or development dependencies. Use only the dependencies already declared in `package.json` unless the project owner explicitly changes this requirement.
