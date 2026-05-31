const { NodeSSH } = require('node-ssh');

function getRouters() {
  try {
    return JSON.parse(process.env.ROUTERS || '[]');
  } catch {
    return [];
  }
}

function getRouter(id) {
  return getRouters().find(r => r.id === id) || null;
}

async function sshConnect(router) {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: router.host,
    username: router.username,
    password: router.password,
    privateKeyPath: router.privateKeyPath,
    readyTimeout: 8000,
  });
  return ssh;
}

async function pushCodes(routerId, codes) {
  const router = getRouter(routerId);
  if (!router) throw new Error(`Router not found: ${routerId}`);
  const ssh = await sshConnect(router);
  try {
    const result = await ssh.execCommand(
      `/usr/bin/add-vouchers.sh ${codes.join(' ')}`
    );
    return result.stdout;
  } finally {
    ssh.dispose();
  }
}

async function getStatus(routerId) {
  const router = getRouter(routerId);
  if (!router) throw new Error(`Router not found: ${routerId}`);
  const ssh = await sshConnect(router);
  try {
    const result = await ssh.execCommand('/usr/bin/voucher-status.sh');
    return JSON.parse(result.stdout);
  } finally {
    ssh.dispose();
  }
}

module.exports = { getRouters, getRouter, pushCodes, getStatus };
