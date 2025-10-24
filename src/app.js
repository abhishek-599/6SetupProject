import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { ApiError } from './utils/ApiError.js';


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit: "16mb"}))
app.use(express.urlencoded({
    extended: true,
    limit: "16mb"
}))
app.use(express.static("public"))
app.use(cookieParser())

//import router
import userRouter from './routes/user.routes.js'


//routes declaration
app.use('/api/v1/users', userRouter)


// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Error:", err);

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors || []
        });
    }

    // Fallback for unknown errors
    return res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});


export {app}