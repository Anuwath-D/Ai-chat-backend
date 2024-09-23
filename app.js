var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var http = require('http');

const cors = require('cors')

// database
const db = require('./database/db')
const initModels = require('./model_db/init_models')()

var chat_completions = require('./routes/chat_completions')
var end_chat = require('./routes/end_chat')
var chat_history = require('./routes/chat_history')
var model = require('./routes/model')

var app = express();
global.secretKey = "AnuwathServer"

var server = http.createServer(app);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cors({ origin: '*' }))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1/chat/completions', chat_completions);
app.use('/api/v1/chat/end', end_chat);
app.use('/api/v1/chat/history', chat_history);
app.use('/api/v1/chat/model', model);

app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// module.exports = app;
server.listen(process.env.APP_PORT || '3000', () => {
    console.log(`Server running at http://localhost:${process.env.APP_PORT || '3000'}`);
    // setTimeout(async () => {
    //   await material_category.create({                       //สร้างข้อมูล
    //     "name": "test",
    //   })
    // }, 5000);
});
