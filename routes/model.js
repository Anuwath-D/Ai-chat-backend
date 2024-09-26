const { RetrievalQAChain } = require('langchain/chains');
const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib');
const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

const express = require('express');
const router = express.Router();
const fs = require('fs');
const pdf = require('pdf-parse');
const dotenv = require('dotenv');

// uploadfile
const multer = require('multer')
let fileTODBname = ''
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'upload_files') // folder ที่เราต้องการเก็บไฟล์
    },
    filename: function (req, file, callback) {
        // const uniqueKey = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const file_name = file.originalname
        fileTODBname = file_name
        callback(null, file_name) //ให้ใช้ชื่อไฟล์ original เป็นชื่อหลังอัพโหลด
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

dotenv.config();
router.use(express.json());

const model = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.API_KEY,
    modelName: "embedding-001",
});

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    temperature: 0,
    maxRetries: 2,
    apiKey: process.env.API_KEY,
});

let txtFilename = '';
let txtPath = '';
let VECTOR_STORE_PATH = '';

router.post('/upload', upload.single('file'), async (req, res) => {
    const file_name = req.body.file_name;
    txtFilename = file_name;
    txtPath = `./upload_files/${txtFilename}`;
    VECTOR_STORE_PATH = `./upload_files_index/${txtFilename.split('.')[0]}.index`;
    try {
        let question = req.body.text ? req.body.text : '';
        console.log("question", question);



        if (question) {
            console.log("---chat---");
            const { geminiAnswer, documentAnswer } = await runWithEmbeddings(question);
            res.json({ message: "Request received", data: { geminiAnswer, documentAnswer } });
        } else {
            await runWithEmbeddings(question);
            res.json({ message: "Upload File Success", data: { txtFilename } });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

async function runWithEmbeddings(question) {
    let vectorStore;
    let documentAnswer = null;
    let geminiResponse = null;
    const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
    if (question) {
        console.log('Vector Exists..');
        vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, model);
        // Query Gemini model
        try {
            geminiResponse = await llm.invoke(question);
            console.log("Gemini Answer:", geminiResponse.content);
        } catch (error) {
            console.error("Gemini Query Error:", error);
        }

        // Perform similarity search and document-based QA
        try {
            const similaritySearchWithScoreResults = await vectorStore.similaritySearchWithScore(question, 2);

            // Format results
            let scoreAnswer = similaritySearchWithScoreResults.map(([doc, score]) => ({
                content: doc.pageContent,
                score: score.toFixed(3),
                metadata: doc.metadata,
            }));

            const chain = RetrievalQAChain.fromLLM(llm, vectorStore.asRetriever());
            const res = await chain.call({ query: question });
            documentAnswer = res.text;

            console.log("Document-Based Answer:", scoreAnswer);
        } catch (error) {
            console.error("Document Query Error:", error);
        }

        return {
            geminiAnswer: geminiResponse ? geminiResponse.content : null,
            documentAnswer: documentAnswer,
        };
    } else {
        let text = '';

        // Read and process file based on type (PDF or plain text)
        if ((txtFilename.split('.').pop()) === 'pdf') {
            try {
                const file = fs.readFileSync(txtPath);
                const data = await pdf(file);
                text = data.text;
            } catch (error) {
                console.error("Error reading PDF file:", error);
            }
        } else {
            try {
                text = fs.readFileSync(txtPath, 'utf8');
            } catch (error) {
                console.error("Error reading text file:", error);
            }
        }

        console.log('Processed text:', text);

        // Split text and create documents for vector store
        try {
            const docs = await textSplitter.createDocuments([text]);
            vectorStore = await HNSWLib.fromDocuments(docs, model);
            await vectorStore.save(VECTOR_STORE_PATH);
        } catch (error) {
            console.error("Error creating vector store:", error);
        }
    }


}


module.exports = router;
