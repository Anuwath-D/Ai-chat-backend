const express = require('express');
const router = express.Router();
const fs = require('fs');
const yaml = require('js-yaml');

let History = {}

router.post('/', async (req, res, next) => {
    console.log('req.body.messages : ', req.body.messages);
    let status = req.body.messages
    try {
        // clear ข้อความในไฟล์ yaml
        if (status == 'END') {
            History = fs.readFileSync('output.yaml', 'utf8');
            console.log('History',History);


            // ไฟล์ยังเเสดงไม่ถูกต้อง output ไม่โดนลบ
            
            // fs.writeFileSync('history.yaml', History, 'utf8');

            // fs.writeFileSync('output.yaml', '', 'utf8');
        }

        res.status(200).send({ msg: 'Update status chat complete!!!' });

    } catch (error) {
        res.status(500).send({ msg: 'something went wrong!!!' });
    }

});

module.exports = router;