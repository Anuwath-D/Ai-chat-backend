# ใช้ Node.js image
FROM node:18

# ตั้ง working directory ใน container
WORKDIR /usr/src/app

# คัดลอกไฟล์ package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกโค้ดทั้งหมดในโฟลเดอร์ backend
COPY . .

# เปิดพอร์ตที่แอปใช้ (เปลี่ยนตามความเหมาะสม)
EXPOSE 5003

# รันแอปพลิเคชัน
CMD ["npm", "start"]

