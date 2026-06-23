import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import cors from 'cors';
import { ApolloServer } from 'apollo-server-express';

import connectDB from './config/db.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import brandRoutes from './routes/brandRoutes.js';

import Competition from './models/competitionModel.js';
import Agreement from './models/agreementModel.js';
import multer from 'multer';

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

const sessionStore = MongoStore.create({ mongoUrl: process.env.MONGO_URI, collectionName: 'sessions' });
app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: 'lax',
        secure: false
    }
}));
app.use(passport.initialize());
app.use(passport.session());

const compStorage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'public/uploads/competitions/');
    },
    filename(req, file, cb) {
        cb(null, `proof-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const uploadComp = multer({ storage: compStorage });

app.get('/api/competitions', async (req, res) => {
    try {
        const comps = await Competition.find({});
        res.json(comps);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving competitions' });
    }
});

app.post('/api/competitions', async (req, res) => {
    try {
        const comp = new Competition(req.body);
        await comp.save();
        res.json(comp);
    } catch (err) {
        res.status(500).json({ message: 'Error launching competition' });
    }
});

app.post('/api/competitions/:id/enter', uploadComp.single('proofFile'), async (req, res) => {
    try {
        const comp = await Competition.findById(req.params.id);
        if (!comp) return res.status(404).json({ message: 'Competition not found' });
        
        comp.entries.push({
            userName: req.body.userName,
            userEmail: req.body.userEmail,
            proofOfPurchaseUrl: `/uploads/competitions/${req.file.filename}`,
            mediaType: req.file.mimetype.includes('video') ? 'video' : 'image'
        });
        await comp.save();
        res.json({ message: 'Successful Submission' });
    } catch (err) {
        res.status(500).json({ message: 'Failed submission' });
    }
});

app.post('/api/agreements', async (req, res) => {
    try {
        const agr = new Agreement(req.body);
        await agr.save();
        res.json(agr);
    } catch (err) {
        res.status(500).json({ message: 'Save failure' });
    }
});

app.get('/api/agreements/:roomId', async (req, res) => {
    try {
        const agrs = await Agreement.find({ roomId: req.params.roomId });
        res.json(agrs);
    } catch (err) {
        res.status(500).json({ message: 'Read failure' });
    }
});

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/brands', brandRoutes);
app.use('/auth', authRoutes);

const publicDirectoryPath = path.join(__dirname, 'public');
app.use(express.static(publicDirectoryPath));

app.get('*', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'index.html'));
});

const startServer = async () => {
    try {
        await connectDB();

        const apolloServer = new ApolloServer({
            typeDefs,
            resolvers,
        });
        await apolloServer.start();
        apolloServer.applyMiddleware({ app, path: '/graphql' });

        const server = http.createServer(app);
        const io = new SocketIOServer(server, {
            cors: {
                origin: true,
                credentials: true,
            },
        });

        const chatRooms = new Map();

        io.on('connection', (socket) => {
            socket.on('join_chat', ({ roomId, sellerId, buyerId, userName }) => {
                if (!roomId) return;
                socket.join(roomId);
                const history = chatRooms.get(roomId) || [];
                socket.emit('chat_history', history);
            });

            socket.on('send_message', (payload) => {
                const message = {
                    roomId: payload.roomId,
                    senderId: payload.senderId,
                    senderName: payload.senderName,
                    text: payload.text,
                    voiceUrl: payload.voiceUrl || null,
                    attachmentUrl: payload.attachmentUrl || null,
                    attachmentName: payload.attachmentName || null,
                    createdAt: new Date().toISOString(),
                };
                if (!message.roomId) return;
                const roomHistory = chatRooms.get(message.roomId) || [];
                roomHistory.push(message);
                chatRooms.set(message.roomId, roomHistory);
                io.to(message.roomId).emit('chat_message', message);
            });
        });

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log('----------------------------------------------------');
            console.log(`✅ Full application server is running on http://localhost:${PORT}`);
            console.log(`✅ GraphQL endpoint is ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
            console.log('----------------------------------------------------');
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();