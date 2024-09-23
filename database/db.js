const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    directory: './model_db',
    additional: {
      underscored: true,
      timestamps: true
    }
});

sequelize.authenticate().then(() => {
  console.log(`Connected to postgres => localhost:5432`);
  // sequelize.sync({ force: true })
  //     .then(() => {
  //         console.log('Database synchronized');
  //     })
  //     .catch((err) => {
  //         console.error('Error syncing database:', err);
  //     });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});



module.exports = { sequelize }
