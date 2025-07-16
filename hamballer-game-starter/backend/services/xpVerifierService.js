const { ethers } = require('ethers');
const ABI = ['function verifyAndStoreClaim(uint256 claimId, bytes proof) returns (bool)'];

function getContract() {
  const addr = process.env.XP_VERIFIER_ADDRESS;
  const rpc = process.env.ABSTRACT_RPC_URL;
  if (!addr || !rpc) return null;
  const provider = new ethers.JsonRpcProvider(rpc);
  return new ethers.Contract(addr, ABI, provider);
}

async function verifyClaim(contract, claimId, proof) {
  const verifier = contract || getContract();
  if (!verifier) throw new Error('Verifier unavailable');
  return await verifier.verifyAndStoreClaim(claimId, proof);
}

module.exports = { verifyClaim };

