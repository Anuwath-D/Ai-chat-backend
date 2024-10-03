const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db');

module.exports = function () {
  return sequelize.define('transaction', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    uid: {
      type: DataTypes.STRING,
    },
    role: {
      type: DataTypes.STRING,
    },
    content: {
      type: DataTypes.TEXT,
    },
    timestamp: {
      type: DataTypes.DATE, // Use Sequelize.DATE for timestamps
    },
    type: {
      type: DataTypes.STRING,
    },
    imagename: {
      type: DataTypes.STRING,
    },
    type_chat: {
      type: DataTypes.STRING,
    }
  }, {
    tableName: 'transaction',
    timestamps: false
  });
};
