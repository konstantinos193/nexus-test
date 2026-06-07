const bs58 = require("bs58").default;
const fs = require("fs");

const phantomPrivateKey = "4B4eiAqGYpjwFabXJCSki3fuuTjv4NhEcfQ6axTBBJxW1aY4NTGbRPJjtWe7MkTbJbR3prkB9whCUJfGD6fK2yaa";

const secretKey = bs58.decode(phantomPrivateKey);

fs.writeFileSync(
  "deployer-keypair.json",
  JSON.stringify(Array.from(secretKey))
);

console.log("Saved deployer-keypair.json");
console.log("Address:", bs58.decode(phantomPrivateKey).slice(32, 64).toString('hex'));
