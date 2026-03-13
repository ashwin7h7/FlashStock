import mongoose from "mongoose"; 

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not configured");
        }

        mongoose.connection.on("connected", () => console.log("Database Connected"));
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.MONGODB_DB_NAME || "FlashStock",
        });
    } catch (error) {
        console.error(error.message);
        throw error;
    }
};

export default connectDB;
