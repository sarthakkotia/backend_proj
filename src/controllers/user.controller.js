import {asyncHandler} from "../utils/asyncHandler.js";
import {APIError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {

    // get use rdeatils from frontend, postman
    // validation logic - if not empty
    // check if user already exists in the db ie through email/username
    // check for images, check for avatar
    // multer upload, upload that to cloudinary, get url from response 
    // create user object - create entry in db
    // remove password and refresh token field from response of db
    // check for user creation in mongodb atlas
    // return response, else error


    //get user details
    // const {fullName, email, username, password} = req.body
    const data = req.body
    // console.log(data)
    let fullName = data.fullName
    let email = data.email
    let username = data.username
    let password = data.password
    console.log("---------------------data-----------------------")
    console.log(data)
    console.log("---------------------data-----------------------")

    // if(fullName == ""){
    //     return new ApiError(400, "Full Name is required")
    // }
    console.log("test here after data")
    if(
        [fullName, email, username, password].some((field) => {
            // if field exists then trim it and even afer trim it's empty then return true
            return (field?.trim() === "")
        })
    ){
        throw new APIError(400, "all fields are required")
    }
    console.log("existed user after")
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    // console.log(existedUser)
    if(existedUser){
        throw new APIError(409, "User already Exists")
    }

    console.log("test here for avatar")
    const avatarLocalPath = req.files?.avatar[0]?.path
    // console.log(req.files)
    console.log(req.files)
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    console.log("test here for cover Image done")
    if(!avatarLocalPath){
        throw new APIError(400, "Avatar is required")
    }

    console.log("upload on cloudinary check")
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if(!avatar){
        throw new APIError(400, "Avatar is required")
    }

    // User.create({
    //     fullName,
    //     avatar: avatar.url,
    //     coverImage: coverImage?.url || "",
    //     email,
    //     password,
    //     username: username.toLowerCase()
    // })
    const user = await User.create({
        fullName: fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email: email,
        password: password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        '-password -refreshToken'
    )
    // console.log(createdUser)

    if(!createdUser){
        throw new APIError(500, "Semothing went wring while registering a user")
    }

    console.log("User registered successfully")
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )



    // res.status(200).json({
    //     message: "ok then"
    // })



    // res.status(200).json({
    //     message: "Hello, World!"
    // })
    // console.log("message recieved")
})

export {registerUser}
