#!/usr/bin/env node

const net = require('net');

const candidates = process.argv.slice(2).map((value) => Number(value)).filter(Boolean);
const ports = candidates.length > 0 ? candidates : [3001, 3002, 3003, 3004, 3005];

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });
}

async function main() {
  for (const port of ports) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(port)) {
      process.stdout.write(String(port));
      return;
    }
  }
  process.stderr.write('No free renderer dev port found in candidate range.\n');
  process.exit(1);
}

main();
