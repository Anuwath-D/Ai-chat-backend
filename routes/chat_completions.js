const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mime = require('mime-types')

const initModels = require('../model_db/init_models');

// uploadfile
const multer = require('multer')
let imageTODBname = ''
let fileTODBname = ''
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        const decodedOriginalName = Buffer.from(file.originalname, 'binary').toString('utf-8');
        console.log('decodedOriginalName', decodedOriginalName);
        const pdfDirectory = 'upload_files';
        const imagesDirectory = 'upload_images';
        const fileExtension = decodedOriginalName.split('.').pop();
        console.log('file.originalname', decodedOriginalName);
        if (fileExtension === 'pdf' || fileExtension === 'txt') {

            if (!fs.existsSync(pdfDirectory)) {
                fs.mkdirSync(pdfDirectory, { recursive: true });
            }
            callback(null, pdfDirectory);
        } else {
            // Check if the 'upload_images' folder exists, create it if not
            if (!fs.existsSync(imagesDirectory)) {
                fs.mkdirSync(imagesDirectory, { recursive: true }); // create directory if it doesn't exist
            }
            callback(null, imagesDirectory); // store images in 'upload_images' folder
        }

    },
    filename: function (req, file, callback) {
        const decodedOriginalName = Buffer.from(file.originalname, 'binary').toString('utf-8');
        const fileExtension = decodedOriginalName.split('.').pop();
        if (fileExtension === 'pdf' || fileExtension === 'txt') {
            fileTODBname = decodedOriginalName
            callback(null, fileTODBname) //ให้ใช้ชื่อไฟล์ original เป็นชื่อหลังอัพโหลด
        } else {
            const uniqueKey = Date.now() + '-' + Math.round(Math.random() * 1E9)
            const img_name = 'Images' + '-' + uniqueKey + '.jpg'
            imageTODBname = img_name
            callback(null, img_name) //ให้ใช้ชื่อไฟล์ original เป็นชื่อหลังอัพโหลด
        }

    },
})
const upload = multer({ storage })

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}


async function saveToDB(save_chat, uid_chat, type_chat, uid, num) {

    await transaction.create({
        "uid": uid,               //สร้างข้อมูล
        "id": JSON.stringify(new Date().getTime()) + num,
        "uid_chat": uid_chat,
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
const { username } = models;

const { GoogleGenerativeAI } = require("@google/generative-ai");
let genAI = null;
let model = null;


// สร้าง Array เพื่อเก็บประวัติการสนทนา
let chatHistory = [];
let save_chat = [];
// สร้าง array สำหรับ imageParts
let filesParts = [];

// middleware สำหรับตรวจสอบ token
async function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    // ตรวจสอบว่า authHeader มีค่าหรือไม่ และเป็น Bearer token หรือไม่
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'ไม่มี token หรือรูปแบบ token ไม่ถูกต้อง กรุณาเข้าสู่ระบบ' });
    }

    // ดึง token ออกมาจาก authHeader โดยเอาส่วน Bearer ออก
    const token = authHeader.split(' ')[1];
    // console.log("token", token);

    try {
        // ตรวจสอบและ decode token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ใส่ข้อมูลผู้ใช้จาก token เข้าไปใน request เพื่อใช้ใน endpoint ต่อไป
        req.user = decoded;

        // ค้นหาผู้ใช้ในฐานข้อมูล
        const user = await username.findOne({
            where: { uid: req.user.uid },
            attributes: ['api_key'] // เลือกเฉพาะคอลัมน์ api_key 
        });

        // ตรวจสอบว่าพบผู้ใช้หรือไม่
        if (user) {
            const api_key = user.api_key;
            // ใช้งาน api_key ต่อไปตามต้องการ
            genAI = new GoogleGenerativeAI(api_key);
            // console.log("genAI>>:/upload_images", genAI);
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        } else {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้ในฐานข้อมูล' });
        }

        next();
    } catch (error) {
        return res.status(401).json({ message: 'token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
    }
};

async function readFloder(req, res, next) {
    // อ่านไฟล์ทั้งหมดในโฟลเดอร์ upload_files
    const uploadDir = 'upload_files';

    // ใช้ fs.readdirSync เพื่ออ่านชื่อไฟล์ในโฟลเดอร์
    const files = fs.readdirSync(uploadDir);

    try {

        files.forEach((file, index) => {
            // สร้าง path สำหรับไฟล์
            const filePath = path.join(uploadDir, file);

            const mimeType = mime.lookup(filePath); // กำหนดค่าเริ่มต้น
            // console.log("MIME type:", mimeType);

            // เช็คว่าเป็นไฟล์ (ไม่ใช่โฟลเดอร์)
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                // console.log("stat.isFile()", files[index]);

                //สร้าง filePart สำหรับไฟล์แต่ละไฟล์
                const filePart = fileToGenerativePart(
                    `upload_files/${files[index]}`,
                    `${mimeType}`,
                ); // เปลี่ยน mime type ตามความเหมาะสม
                filesParts.push(filePart);
            }
        })
        // console.log("files", filesParts);
    } catch (error) {
        return res.status(401).json({ message: 'token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
    }
};


router.post('/', verifyToken, async (req, res) => {

    let idx = req.body.messages.length
    const message_req = req.body.messages[idx - 1].content;
    const uid_chat = req.body.uid_chat
    const type = req.body.type
    const type_chat = req.body.type_chat
    const imagename = ''
    const uid = req.user.uid;


    const chat = model.startChat({
        history: [],
    });

    // // เพิ่มข้อความใหม่เข้าไปใน chatHistory
    if (uid_chat) {
        // ค้นหาข้อมูล
        const data = await transaction.findAll({
            attributes: ["role", "content"],
            where: {
                uid_chat: uid_chat  //สำหรับ body
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
        // // ส่งข้อความไปยังโมเดล
        const result = await chat.sendMessage(message_req);
        // // เพิ่มคำตอบของโมเดลเข้าไปใน chatHistory
        chatHistory.push({ role: "model", parts: [{ text: result.response.text() }] });

        save_chat = { role: "user", text: message_req, timestamp: new Date(), type: type, imagename: imagename };
        saveToDB(save_chat, uid_chat, type_chat, uid, 0)

        save_chat = { role: "model", text: result.response.text(), timestamp: new Date(), type: type, imagename: imagename };
        saveToDB(save_chat, uid_chat, type_chat, uid, 3)

        // console.log('response', result.response.text());
        const text = result.response.text()
        // console.log('chat', chat);

        res.json(
            {
                error: false,
                // total_chat : text.length,
                data: text
            }
        )


    } catch (error) {
        res.status(500).send({ msg: 'something went wrong!' });
    }

});


router.post('/upload_images', verifyToken, upload.single('photo'), async (req, res) => {

    const prompt = req.body.text;
    const type = req.body.type;
    const uid_chat = req.body.uid_chat;
    const type_chat = req.body.type_chat
    const uid = req.user.uid;
    // Note: The only accepted mime types are some image types, image/*.
    const imagePart = fileToGenerativePart(
        `upload_images/${imageTODBname}`,
        "image/jpeg",
    );

    const result = await model.generateContent([prompt, imagePart]);

    // console.log('chat', chat);

    let data = result.response.text()

    if (type === 'imageandtext') {
        save_chat = { role: "user", text: '', timestamp: new Date(), type: type, imagename: imageTODBname };
        saveToDB(save_chat, uid_chat, type_chat, uid, 0)
    }
    save_chat = { role: "user", text: prompt, timestamp: new Date(), type: type, imagename: '' };
    saveToDB(save_chat, uid_chat, type_chat, uid, 0)


    save_chat = { role: "model", text: data, timestamp: new Date(), type: type, imagename: '' };
    saveToDB(save_chat, uid_chat, type_chat, uid, 6)

    res.json(
        {
            error: false,
            // total_chat : text.length,
            data: data
        }
    )
})

router.post('/upload_files', verifyToken, upload.single('file'), async (req, res) => {

    const prompt = req.body.text;
    const file_name = req.body.file_name
    fileTODBname = file_name
   
    try {
        if (prompt) {
            
            let data = ''

            if (fileTODBname == 'เลือกไฟล์ทั้งหมด') {
                readFloder();
                const result = await model.generateContent([prompt, filesParts]);
                data = result.response.text()
                console.log(1111111);

            } else {
                const filePart = fileToGenerativePart(
                    `upload_files/${fileTODBname}`,
                    (fileTODBname.split('.').pop()) === 'pdf' ? "application/pdf" : "text/plain",
                );

                const imageParts = [
                    filePart
                ];

                const result = await model.generateContent([prompt, imageParts]);
                data = result.response.text()
                console.log(22222222);
            }

            res.json(
                {
                    error: false,
                    // total_chat : text.length,
                    data: data,
                    file_name: fileTODBname
                }
            )
        } else {
            res.json({ message: "Upload File Success" });
        }
    } catch (error) {
        res.status(500).send({ msg: 'something went wrong!' });
    }

})

module.exports = router;