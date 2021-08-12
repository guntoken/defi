const wait = (s) => {
  const milliseconds = s * 1000;
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

module.exports = {
  EVM_REVERT: "VM Exception while processing transaction: revert",
  wait,
};
