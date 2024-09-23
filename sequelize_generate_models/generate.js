const SequelizeAuto = require('sequelize-auto');
require('dotenv').config();

// var postgres_config ={
//     host: '203.151.164.229',
//     port: '5434',
//     database : 'smart_watch_db',
//     user: 'postgres',
//     pass: 'postgres',
//     dialect: 'postgres'
// }

var postgres_config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database : process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  pass: process.env.DB_PASSWORD,
  dialect: process.env.DB_DIALECT
}

// sequelize-auto -h localhost -d iot_broker_db
// -u root -x root4444 -p 3306  --dialect mysql -o ./model

const auto = new SequelizeAuto(postgres_config.database,postgres_config.user, postgres_config.pass, {
  host: postgres_config.host,
  dialect: postgres_config.dialect,
  directory: './models_db_backup', // where to write files
  logging: false,
  port: postgres_config.port,
  caseModel: 's', // c:convert snake_case column names to snake_case field names: userId ->  user_id
  caseFile: 's', // c:file names created for each model use snake_case.js not camelCase.js
  singularize: true, // convert plural table names to singular model names
  additional: {
    timestamps: false
    // ...options added to each model
  },
  tables: ['transaction'] // use all tables, if omitted
  //...
})


async function auto_generate_models()
{
    console.log("generate models");
    var res=  await Promise.resolve(
        auto.run()
        // .then(data => {
        //     console.log(data.tables);      // table and field list
        //     console.log(data.foreignKeys); // table foreign key list
        //     console.log(data.indexes);     // table indexes
        //     console.log(data.hasTriggerTables); // tables that have triggers
        //     console.log(data.relations);   // relationships between models
        //     console.log(data.text)         // text of generated models
        //   })
          )
          console.log(`${process.env.POSTGRES_DB?process.env.POSTGRES_DB:'_____smart_watch_123456db'}`)
          return res;

}


module.exports = {auto_generate_models}
