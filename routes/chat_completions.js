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

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// สร้าง Array เพื่อเก็บประวัติการสนทนา
let chatHistory = [];
let save_chat = []

// เริ่มต้นแชท
const chat = model.startChat({
    history: [],
});

router.post('/', async (req, res, next) => {
    // console.log('req.body.messages : ', req.body.messages);
    let idx = req.body.messages.length
    const message_req = req.body.messages[idx - 1].content;
    // console.log('content : ', req.body.messages[idx - 1].content);
    const uid = req.body.uid
    const type = req.body.type
    const type_chat = req.body.type_chat
    const imagename = ''
    console.log('uid : ', uid);
    // // เพิ่มข้อความใหม่เข้าไปใน chatHistory
    if (uid) {
        // console.log('chat.params.history',chat.params.history[1].parts[0]);

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
        // console.log('chatHistory', chatHistory);
        for (const arr of chat.params.history) {
            // console.log(`history`, arr);
            // console.log(`chatHistory_${idx}`, arr.parts[0]);
        }



        // console.log('chatHistory_1', chatHistory[1].parts);
        // console.log('chatHistory_2', chatHistory[2].parts);
        // console.log('chat', chat);

        // // ส่งข้อความไปยังโมเดล
        const result = await chat.sendMessage(message_req);

        // // เพิ่มคำตอบของโมเดลเข้าไปใน chatHistory
        chatHistory.push({ role: "model", parts: [{ text: result.response.text() }] });
        save_chat = { role: "model", text: result.response.text(), timestamp: new Date(), type: type, imagename: imagename };
        saveToDB(save_chat, uid, type_chat)
        console.log('response', result.response.text());
        const text = result.response.text()
        console.log('chat', chat);
        // let msg = text.split('\n')
        // msg = msg.map(item => item + '\n');
        res.json(
            {
                error: false,
                // total_chat : text.length,
                data: text
            }
        )
        // console.log('body', body);

        // // Set the content type to text/event-stream for server-sent events
        // res.writeHead(200, {
        //     'Content-Type': 'text/event-stream',
        //     'Connection': 'keep-alive',
        //     'Cache-Control': 'no-cache'
        // });

        // const messages = msg

        // let count = 0;
        // const interval = setInterval(() => {

        //     let data = {
        //         id: "chatcmpl-26647300",
        //         object: "chat.completion.chunk",
        //         created: 1724747752,
        //         model: "gemini:gemini-1.5-prolatest",
        //         choices: [
        //             {
        //                 index: 0,
        //                 delta: {
        //                     content: messages[count] + "\n"
        //                 },
        //                 finish_reason: null
        //             }
        //         ]
        //     }

        //     // แปลง object เป็น string
        //     const dataString = JSON.stringify(data);

        //     res.write(`data: ${dataString + "\n"}\n`);
        //     count++;

        //     if (count === messages.length) {

        //         let data = {
        //             id: "chatcmpl-26647300",
        //             object: "chat.completion.chunk",
        //             created: new Date().getTime(),
        //             model: "gemini:gemini-1.5-prolatest",
        //             choices: [
        //                 {
        //                     index: 0,
        //                     delta: {},
        //                     finish_reason: "stop"
        //                 }
        //             ]
        //         }

        //         clearInterval(interval);
        //         res.end(JSON.stringify(data));
        //     }
        // }, 1);

        // // // สร้าง User ใหม่ใน database
        // // let uid = new Date().getTime()
        // // let content_user = message_req
        // // let content_model = text
        // // let timestamp = new Date()
        // // const newUser = await transaction.create({ uid , content_user , content_model, timestamp });

        // chatHistory เขียนใส่ yaml
        const yamlStr = yaml.dump(chatHistory);
        fs.writeFileSync('output.yaml', yamlStr, 'utf8');


    } catch (error) {
        res.status(500).send({ msg: 'something went wrong!' });
    }

});

// router.post('/save', async (req, res, next) => {
    // console.log('save_chat', save_chat);
    // console.log('req', req.body);
    // console.log('req.body.messages : ', req.body.messages);
    // let status = req.body.messages
    // let uid = req.body.uid
    // let uid_chat = JSON.stringify(new Date().getTime())
    // try {
    //     if (status == 'END' && save_chat) {
    //         for (const chatdata of save_chat) {
    //             await transaction.create({                       //สร้างข้อมูล
    //                 "id": JSON.stringify(new Date().getTime()),
    //                 "uid": uid ? uid : uid_chat,
    //                 "role": chatdata.role,
    //                 "content": chatdata.text,
    //                 "timestamp": chatdata.timestamp,
    //                 "type": chatdata.type,
    //                 "imagename": chatdata.imagename ? chatdata.imagename : '',

    //             })

    //         }
    //         fs.writeFileSync('output.yaml', '', 'utf8');
    //         chatHistory = [];
    //         save_chat = [];
    //         chat.params.history = []
    //         chat._history = []
    //     }

    //     res.status(200).json({ msg: 'success to create transaction' });
    // } catch (error) {
    //     console.error('Error:', error);
    //     res.status(500).json({ error: 'Failed to create transaction' });
    // }
// });

router.post('/upload', upload.single('photo'), async (req, res) => {
    // console.log('text', req.body.text);

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

    console.log('chat', chat);

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