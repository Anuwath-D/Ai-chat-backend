const { RetrievalQAChain } = require('langchain/chains');
const { HNSWLib } = require('@langchain/community/vectorstores/hnswlib');
const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

const express = require('express');
const router = express.Router();
const fs = require('fs');
const dotenv = require('dotenv');

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

const txtFilename = "player";
const txtPath = `./${txtFilename}.txt`;
const VECTOR_STORE_PATH = `${txtFilename}.index`;

router.post('/', async (req, res) => {
    try {
        const question = req.body.question;
        console.log("question", question);
        
        const { geminiAnswer, documentAnswer } = await runWithEmbeddings(question);
        
        console.log("---chat---");
        res.json({ message: "Request received", data: { geminiAnswer, documentAnswer }});
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

async function runWithEmbeddings(question) {
    let vectorStore;
    let documentAnswer = null;
    let geminiResponse = null;
    if (fs.existsSync(VECTOR_STORE_PATH)) {
        console.log('Vector Exists..');
        vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, model);
    } else {
        const text = fs.readFileSync(txtPath, 'utf8');
        const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
        const docs = await textSplitter.createDocuments([text]);
        vectorStore = await HNSWLib.fromDocuments(docs, model);
        await vectorStore.save(VECTOR_STORE_PATH);
    }

    
    try {
        geminiResponse = await llm.invoke(question);
        console.log("Gemini Answer:", geminiResponse.content);
    } catch (error) {
        console.error("Gemini Query Error:", error);
    }

    
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
}

module.exports = router;
