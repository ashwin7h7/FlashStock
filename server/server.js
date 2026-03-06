import express from "express";
import userRouter from "./routes/userRoute.js";
import productRoutes from "./routes/productRoutes.js"

const app = express();
const port = process.env.PORT || 4000;

// await connectDB()

// Middleware configuration
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: allowedOrigins, credentials: true}))

app.get('/', (req, res) => res.send("API is Workinng"));
app.use('/api/user', userRouter)
app.use('/api/product', productRoutes)

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});