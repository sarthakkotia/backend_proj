// require('dotenv').config({path: './env'}) // decreases consistencty
// improved
import dotenv from"dotenv"
import connectDB from "./db/index.js";
import { app } from "../app.js";

dotenv.config({
    path: "./env"
})


connectDB()
.then(() => {
    app.on("error",(error)=>{
        console.log("An Error occurred: ", error)
        throw error
    })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT}`)
    })
})
.catch( (err) => {
    console.log("MONGO DB connection Failed",err)
})










/*
import express from "express";

const app = express()
// function connectDB(){}

// connectDB()




//using IIFE
;(async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("ERROR: ",error)
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening in port ${process.env.PORT}`)
        })

    }catch(error){
        console.error("ERROR: ",error)
        throw error
    }
})()

*/