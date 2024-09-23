var _transaction = require("./transaction");

function initModels() {
  var transaction = _transaction();

  // production_category.belongsTo(material_category, { as: "id_material_category_material_category", foreignKey: "id_material_category"});
  // material_category.hasMany(production_category, { as: "production_categories", foreignKey: "id_material_category"});
  // production_category.belongsTo(production_hourly, { as: "id_production_hourly_production_hourly", foreignKey: "id_production_hourly"});
  // production_hourly.hasMany(production_category, { as: "production_categories", foreignKey: "id_production_hourly"});

  return {
    transaction,
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
