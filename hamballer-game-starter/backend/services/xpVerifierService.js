const { ethers } = require('ethers');
const ABI = ['function verifyAndStoreClaim(uint256 claimId, bytes proof) returns (bool)'];

function getContract() {
  const addr = process.env.XP_VERIFIER_ADDRESS;
  const rpc = process.env.ABSTRACT_RPC_URL;
  const pk = process.env.PRIVATE_KEY;
  if (!addr || !rpc || !pk) return null;
  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = new ethers.Wallet(pk.startsWith('0x') ? pk : `0x${pk}`, provider);
  return new ethers.Contract(addr, ABI, signer);
}

async function verifyClaim(contract, claimId, proof) {
  const verifier = contract || getContract();
  if (!verifier) throw new Error('Verifier unavailable');
  return await verifier.verifyAndStoreClaim(claimId, proof);
}

module.exports = { verifyClaim };

