const express = require('express');
const router = express.Router();
const fs = require('fs');
const yaml = require('js-yaml');

const initModels = require('../model_db/init_models');

// uploadfile
const multer = require('multer')
let imageTODBname = ''
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'uploads') // folder ที่เราต้องการเก็บไฟล์
    },
    filename: function (req, file, callback) {
        const uniqueKey = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const img_name = 'Images' + '-' + uniqueKey + '.jpg'
        imageTODBname = img_name
        callback(null, img_name) //ให้ใช้ชื่อไฟล์ original เป็นชื่อหลังอัพโหลด
    },
})
const upload = multer({ storage })

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType,
        },
    };
}

async function saveToDB(save_chat, uid, type_chat) {
    console.log('save_chat', save_chat);

    await transaction.create({                       //สร้างข้อมูล
        "id": JSON.stringify(new Date().getTime()),
        "uid": uid ? uid : uid_chat,
        "role": save_chat.role,
        "content": save_chat.text,
        "timestamp": save_chat.timestamp,
        "type": save_chat.type,
        "imagename": save_chat.imagename ? save_chat.imagename : '',
        "type_chat": type_chat,

    })
}

// Initialize models
const models = initModels();
const { transaction } = models;


const { GoogleGenerativeAI } = require("@google/generative-ai");

// สร้าง Array เพื่อเก็บประวัติการสนทนา
let chatHistory = [];
let save_chat = []

router.post('/', async (req, res, next) => {
    let idx = req.body.messages.length
    const message_req = req.body.messages[idx - 1].content;
    // console.log('content : ', req.body.messages[idx - 1].content);
    const uid = req.body.uid
    const type = req.body.type
    const type_chat = req.body.type_chat
    const imagename = ''
    console.log('uid : ', uid);
    // ตรวจสอบว่า api_key ถูกส่งมา
    if (!req.body.api_key) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }


    const genAI = new GoogleGenerativeAI(req.body.api_key);
    console.log("genAI>>:",genAI);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
        history: [],
    });

    // // เพิ่มข้อความใหม่เข้าไปใน chatHistory
    if (uid) {
        // ค้นหาข้อมูล
        const data = await transaction.findAll({
            attributes: ["role", "content"],
            where: {
                uid: uid  //สำหรับ body
            },
            order: [['timestamp', 'ASC']],
            // limit: 1
        });
        let arr = data
        for (const history of arr) {
            let historydata = history.dataValues
            if (historydata.role == "model") {
                chat.params.history.push({ parts: [{ text: historydata.content }], role: historydata.role })
            } else {
                chat.params.history.push({ role: historydata.role, parts: [{ text: historydata.content }] })
            }

            chat._history = chat.params.history

        }
    }

    try {
        chatHistory.push({ role: "user", parts: [{ text: message_req }] });
        save_chat = { role: "user", text: message_req, timestamp: new Date(), type: type, imagename: imagename };
        saveToDB(save_chat, uid, type_chat)

        // // ส่งข้อความไปยังโมเดล
        const result = await chat.sendMessage(message_req);

        // // เพิ่มคำตอบของโมเดลเข้าไปใน chatHistory
        chatHistory.push({ role: "model", parts: [{ text: result.response.text() }] });
        save_chat = { role: "model", text: result.response.text(), timestamp: new Date(), type: type, imagename: imagename };
        saveToDB(save_chat, uid, type_chat)
        console.log('response', result.response.text());
        const text = result.response.text()
        console.log('chat', chat);
        
        res.json(
            {
                error: false,
                // total_chat : text.length,
                data: text
            }
        )

        // chatHistory เขียนใส่ yaml
        const yamlStr = yaml.dump(chatHistory);
        fs.writeFileSync('output.yaml', yamlStr, 'utf8');


    } catch (error) {
        res.status(500).send({ msg: 'something went wrong!' });
    }

});

router.post('/upload', upload.single('photo'), async (req, res) => {
    // console.log('text', req.body.text);
    const genAI = new GoogleGenerativeAI(req.body.api_key);
    console.log("genAI>>:",genAI);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = req.body.text;
    const type = req.body.type;
    const uid = req.body.uid;
    const type_chat = req.body.type_chat
    // Note: The only accepted mime types are some image types, image/*.
    const imagePart = fileToGenerativePart(
        `uploads/${imageTODBname}`,
        "image/jpeg",
    );
    if (type === 'imageandtext') {
        save_chat = { role: "user", text: '', timestamp: new Date(), type: type, imagename: imageTODBname };
        saveToDB(save_chat, uid, type_chat)
    }
    save_chat = { role: "user", text: prompt, timestamp: new Date(), type: type, imagename: '' };
    saveToDB(save_chat, uid, type_chat)


    const result = await model.generateContent([prompt, imagePart]);

    // console.log(result.response.text());
    let data = result.response.text()
    save_chat = { role: "model", text: data, timestamp: new Date(), type: type, imagename: '' };
    saveToDB(save_chat, uid, type_chat)
    res.json(
        {
            error: false,
            // total_chat : text.length,
            data: data
        }
    )
})

module.exports = router;