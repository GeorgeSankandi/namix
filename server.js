import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST before any other imports
// Explicitly specify the path to .env file
const result = dotenv.config({ path: path.join(__dirname, '.env') });
if (result.error) {
  console.warn('Warning: Could not load .env file:', result.error.message);
} else {
  console.log('✓ .env file loaded successfully');
}

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

// --- Basic Setup ---
const app = express();

// --- Core Middleware ---
// Allow CORS for the requesting origin and allow credentials so frontend
// requests using cookies/sessions work from the same host or proxied hosts.
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl)
        if (!origin) return callback(null, true);
        // Otherwise allow the requesting origin
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());
// --- Session & Passport setup ---
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
        secure: false // Set to false for localhost, true for HTTPS in production
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// --- API Routes ---
// API routes must be defined after session and passport middleware so
// handlers can rely on `req.session` and `req.login`/`req.logout`.
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/faqs', faqRoutes);

// Session-based auth routes
app.use('/auth', authRoutes);

// --- Static File Serving ---
// Point Express to the 'public' folder to serve all frontend assets.
const publicDirectoryPath = path.join(__dirname, 'public');
app.use(express.static(publicDirectoryPath));

// --- SPA Fallback Route ---
// For any GET request that doesn't match an API route or an existing file in 'public',
// send the main index.html file. This MUST be the last route.
app.get('*', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'index.html'));
});

// --- Server Startup Function ---
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
                socket.data.roomId = roomId;
                socket.data.userName = userName;
                socket.data.buyerId = buyerId;
                socket.data.sellerId = sellerId;

                const history = chatRooms.get(roomId) || [];
                socket.emit('chat_history', history);
            });

            socket.on('send_message', (payload) => {
                const message = {
                    roomId: payload.roomId,
                    senderId: payload.senderId,
                    senderName: payload.senderName,
                    text: payload.text,
                    createdAt: new Date().toISOString(),
                };
                if (!message.roomId) return;
                const roomHistory = chatRooms.get(message.roomId) || [];
                roomHistory.push(message);
                if (roomHistory.length > 100) roomHistory.shift();
                chatRooms.set(message.roomId, roomHistory);
                io.to(message.roomId).emit('chat_message', message);
            });

            socket.on('disconnect', () => {
                // No-op for now
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