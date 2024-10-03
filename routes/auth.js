const express = require('express');
const bcrypt = require('bcrypt'); // อย่าลืมนำเข้า bcrypt สำหรับเข้ารหัสรหัสผ่าน
const jwt = require('jsonwebtoken'); // สำหรับการสร้าง JSON Web Token
const router = express.Router();
const initModels = require('../model_db/init_models');

// Initialize models
const models = initModels();
const { username } = models;  // `username` ควรตรงกับชื่อโมเดลที่คุณใช้ในการกำหนดค่า Sequelize

router.post('/register', async (req, res) => {
    console.log('req.body: ', req.body);
    const { Username, password, email, api_key, token } = req.body;

    // ตรวจสอบว่า username และ password ถูกส่งมา
    if (!Username || !password || !api_key) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        // ตรวจสอบว่าผู้ใช้มีอยู่แล้วหรือไม่
        const existingUser = await username.findOne({ where: { username: Username } });  // เปลี่ยนเป็น Username
        if (existingUser) {
            return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
        }

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        // สร้างผู้ใช้ใหม่
        const newUser = await username.create({  // ใช้ `username.create` เพราะโมเดลชื่อ `username`
            username: Username,  // ใช้ค่าจาก `Username` และ map กับคอลัมน์ `username`
            password: hashedPassword,
            refreshtoken: null, // ไม่ต้องบันทึก refreshtoken ในระหว่างการลงทะเบียน
            email: email,
            api_key: api_key
        });

        res.status(201).json({ message: 'สมัครผู้ใช้สำเร็จ', user: newUser });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสมัครผู้ใช้' });
    }

});

router.post('/login', async (req, res) => {
    console.log('req.body: ', req.body);
    const { Username, password } = req.body;

    // ตรวจสอบว่า username และ password ถูกส่งมา
    if (!Username || !password) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        // ค้นหาผู้ใช้ในฐานข้อมูล
        const user = await username.findOne({ where: { username: Username } });

        // ตรวจสอบว่าผู้ใช้มีอยู่
        if (!user) {
            return res.status(400).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        // ตรวจสอบรหัสผ่าน
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        // สร้าง JWT Token
        const token = jwt.sign({ uid: user.uid }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // ส่ง Token กลับไป
        res.status(200).json({ 
            message: 'เข้าสู่ระบบสำเร็จ', 
            data: {
                user_uid: user.uid,
                username: user.username,
                email: user.email,
                api_key: user.api_key
            },
            token 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    }

});

module.exports = router;
