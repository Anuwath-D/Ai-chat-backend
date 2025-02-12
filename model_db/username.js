const { DataTypes } = require('sequelize')
const { sequelize } = require('../database/db');

module.exports = function () {
  return sequelize.define('username', {
    uid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,  // สร้าง UUID อัตโนมัติ
      primaryKey: true
    },
    createdat: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,  // ใช้ค่า timestamp ปัจจุบันโดยอัตโนมัติ
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,  // ห้ามเป็นค่า NULL
      unique: true // ตรวจสอบไม่ให้ชื่อซ้ำ
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,  // ห้ามเป็นค่า NULL
    },
    refreshtoken: {
      type: DataTypes.STRING,
      allowNull: true,  // สามารถเป็นค่า NULL ได้
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,  // สามารถเป็นค่า NULL ได้
    },
    api_key: {
      type: DataTypes.STRING,
      allowNull: false,  // สามารถเป็นค่า NULL ได้
    },
    role: {
      type: DataTypes.STRING(100),
      allowNull: true,  // สามารถเป็นค่า NULL ได้
    }
  }, {
    tableName: 'username',  // กำหนดชื่อตาราง
    timestamps: false  // ปิดการใช้งาน createdAt และ updatedAt อัตโนมัติ
  });
};
