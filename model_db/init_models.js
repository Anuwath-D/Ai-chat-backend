var _transaction = require("./transaction");
var _username = require("./username");

function initModels() {
  var transaction = _transaction();
  var username = _username();

  return {
    transaction,
    username
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
