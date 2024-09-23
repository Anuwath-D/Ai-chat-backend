const express = require('express');
const router = express.Router();
const fs = require('fs');
const initModels = require('../model_db/init_models');

// Initialize models
const models = initModels();
const { transaction } = models;

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType,
        },
    };
}


router.get('/header', async (req, res, next) => {
    try {
        const whereCondition = {};
        // ค้นหาข้อมูล
        const response = await transaction.findAll({
            attributes: ["uid", "content", "type", "timestamp" , "type_chat"],
            // where: whereCondition,
            order: [['timestamp', 'DESC']],
            // limit: 1
        });

        const arrData = []
        for (const arr of response) {
            arrData.push(arr.dataValues)
        }

        const formattedResponse = Object.values(
            arrData.reduce((acc, data) => {
                // ตรวจสอบว่ามี uid ใน acc หรือไม่ ถ้าไม่มีก็สร้างใหม่
                if (!acc[data.uid]) {
                    acc[data.uid] = { uid: data.uid, content: [], type: [], timestamp: [], type_chat: [] };
                }
                // เพิ่ม id ของ data ลงใน array ที่ตรงกับ uid
                acc[data.uid].content.push(data.content);
                acc[data.uid].type.push(data.type);
                acc[data.uid].timestamp.push(data.timestamp);
                acc[data.uid].type_chat.push(data.type_chat);


                return acc;
            }, {})
        );

        let resdata = []

        for (const arr of formattedResponse) {
            let data = {
                uid: arr.uid,
                content: arr.content[arr.content.length - 1] ? arr.content[arr.content.length - 1]:arr.content[arr.content.length - 2],
                type: arr.type[arr.type.length - 1],
                timestamp: arr.timestamp[arr.timestamp.length - 1],
                type_chat: arr.type_chat[arr.type_chat.length - 1]
            }
            resdata.push(data)
        }

        res.json(
            {
                error: false,
                total_chat: formattedResponse.length,
                data: resdata
            }
        )


    } catch (error) {
        res.status(500).send({ msg: 'something went wrong!!!' });
    }

});

router.get('/detail', async function (req, res, next) {    //verrify auth เพื่อตรวจสอบ Token
    try {
        const uid = req.query;
        console.log('uid', uid);

        // ค้นหาข้อมูล
        const data = await transaction.findAll({
            // attributes: ["target"],
            where: uid, //สำหรับ query
            order: [['timestamp', 'ASC']],
            // limit: 1
        });
        const arrdata = []
        for (const arr of data) {
            console.log('arr.imagename', arr.imagename);
            const img = ''

            if (arr.imagename) {
                const imagePart = fileToGenerativePart(
                    `uploads/${arr.imagename}`,
                    "image/jpeg",
                );
                console.log('imagePart', imagePart.inlineData.data);
                arrdata.push({
                    id: arr.id,
                    uid: arr.uid,
                    role: arr.role,
                    content: arr.content,
                    timestamp: arr.timestamp,
                    type: arr.type,
                    imagetobase64: imagePart.inlineData.data,
                })
            }else{
                arrdata.push({
                    id: arr.id,
                    uid: arr.uid,
                    role: arr.role,
                    content: arr.content,
                    timestamp: arr.timestamp,
                    type: arr.type,
                    imagetobase64: '',
                })
            }


        }


        res.json(
            {
                error: false,
                total_chat: arrdata.length,
                data: arrdata,
            }
        )
    } catch (error) {
        res.status(500).send({ msg: error })  //res 500

    }
});

module.exports = router;