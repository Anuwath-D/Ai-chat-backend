// const { DataTypes } = require('sequelize')
// const { sequelize } = require('../database/db');

// module.exports = function () {
//   return sequelize.define('transaction', {
//     uid: {
//       type: DataTypes.UUID,
//       allowNull: false,
//       primaryKey: true,
//     },
//     id: {
//         type: DataTypes.STRING,
//         allowNull: false,
//         unique: true,
//     },
//     uid_chat: {
//         type: DataTypes.UUID,
//         allowNull: true,
//     },
//     role: {
//         type: DataTypes.STRING,
//         allowNull: true,
//     },
//     content: {
//         type: DataTypes.TEXT,
//         allowNull: true,
//     },
//     timestamp: {
//         type: DataTypes.DATE,
//         allowNull: true,
//     },
//     type: {
//         type: DataTypes.STRING,
//         allowNull: true,
//     },
//     imagename: {
//         type: DataTypes.STRING,
//         allowNull: true,
//     },
//     type_chat: {
//         type: DataTypes.STRING,
//         allowNull: true,
//     }
//   }, {
//     tableName: 'transaction',
//     timestamps: false
//   });

// };

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/db');

module.exports = function () {
    const Transaction = sequelize.define('transaction', {
        uid: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        id: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            primaryKey: true,
        },
        uid_chat: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        imagename: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        type_chat: {
            type: DataTypes.STRING,
            allowNull: true,
        }
    }, {
        tableName: 'transaction',
        timestamps: false
    });

    // การตั้งค่า Foreign Key
    Transaction.associate = (models) => {
        Transaction.belongsTo(models.username, {
            foreignKey: 'uid', // ชื่อคอลัมน์ใน transaction ที่อ้างถึง uid
            targetKey: 'uid', // ชื่อคอลัมน์ที่เป็น Foreign Key ใน username
            onDelete: 'CASCADE', // ตัวเลือกการลบที่สามารถปรับได้
        });
    };

    return Transaction;
};

