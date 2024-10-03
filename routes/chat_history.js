const express = require('express');
const router = express.Router();
const fs = require('fs');
const initModels = require('../model_db/init_models');
const path = require('path');

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
            attributes: ["uid", "content", "type", "timestamp", "type_chat"],
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
                content: arr.content[arr.content.length - 1] ? arr.content[arr.content.length - 1] : arr.content[arr.content.length - 2],
                type: arr.type[arr.type.length - 1],
                timestamp: arr.timestamp[arr.timestamp.length - 1],
                type_chat: arr.type_chat[arr.type_chat.length - 1]
            }
            resdata.push(data)
        }

        res.json(
            {
                error: false,
                total_chat: resdata.length,
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
                    `upload_images/${arr.imagename}`,
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
            } else {
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

router.get('/files', async (req, res, next) => {

    let data_flie = []

    try {
        // ระบุพาธไปยังโฟลเดอร์ upload
        const uploadDir = path.join(__dirname, '../upload_files');

        // อ่านรายการไฟล์ในโฟลเดอร์
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                console.error('ไม่สามารถอ่านโฟลเดอร์:', err);
                return;
            }

            // แสดงชื่อไฟล์ทั้งหมดที่อยู่ในโฟลเดอร์
            files.forEach(file => {
                console.log(file);
                // data_flie.push(file)
            });
            let body = {}
            let arrfile = []
            for (const arr of files) {
                body = {
                    file_name: arr
                }
                arrfile.push(body)
            }
            data_flie = arrfile
            console.log('data_flie', data_flie);

            res.json(
                {
                    error: false,
                    total_flies: data_flie.length,
                    data: data_flie
                }
            )
        });

    } catch (error) {
        res.status(500).send({ msg: 'something went wrong!!!' });
    }

});

// API สำหรับลบไฟล์ตามชื่อที่ส่งมา
router.delete('/files/delete', (req, res) => {
    // const fileName = req.params.fileName;
    const { fileName } = req.query;
    console.log('fileName',fileName);
    
    const uploadDir = path.join(__dirname, '../upload_files');
    const filePath = path.join(uploadDir, fileName);
    
    // ตรวจสอบว่าไฟล์มีอยู่หรือไม่ก่อนลบ
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ error: 'ไฟล์ไม่พบ' });
      }
  
      // ลบไฟล์
      fs.unlink(filePath, (err) => {
        if (err) {
          return res.status(500).json({ error: 'ไม่สามารถลบไฟล์ได้' });
        }
        res.json({ message: `ลบไฟล์ ${fileName} เรียบร้อยแล้ว` });
      });
    });
  });

module.exports = router;