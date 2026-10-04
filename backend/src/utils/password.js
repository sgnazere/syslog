/**
 * Hachage des mots de passe (bcrypt natif : calcul dans les threads de libuv,
 * sans bloquer le traitement des autres requêtes).
 */
const bcrypt = require('bcrypt');

const COST = 12;

// libuv partage ses threads entre bcrypt, l'authentification PostgreSQL (SCRAM) et la
// résolution DNS. On limite les calculs bcrypt simultanés pour toujours laisser un
// thread libre : sinon, lors d'un pic de connexions, l'ouverture d'une connexion à la
// base attend derrière des centaines de hachages et finit en timeout.
const THREADS = parseInt(process.env.UV_THREADPOOL_SIZE || '4', 10);
const MAX_CONCURRENT = Math.max(1, THREADS - 1);

let running = 0;
const queue = [];

const limited = async (task) => {
  if (running < MAX_CONCURRENT) running++;
  else await new Promise(resolve => queue.push(resolve)); // la place est transmise par la tâche qui se termine
  try {
    return await task();
  } finally {
    const next = queue.shift();
    if (next) next();
    else running--;
  }
};

const hashPassword = (password) => limited(() => bcrypt.hash(password, COST));

// Les hachages PHP ($2y$) sont identiques à $2b$ : seul le préfixe diffère
const verifyPassword = (password, hash) =>
  limited(() => bcrypt.compare(password, String(hash).replace(/^\$2y\$/, '$2b$')));

module.exports = { hashPassword, verifyPassword };
