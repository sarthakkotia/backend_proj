import {asyncHandler} from "../utils/asyncHandler.js";
import {APIError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async function(userId){
    try {
        const user = await User.findById(userId)
        const accessToken = user.genrateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new APIError(500, "Samething Went wrong while generating refresh and access token")
    }
}


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
    // console.log(req.files)
    // throw new APIError(404, "avatar problems")
    let avatarLocalPath = req.files?.avatar[0]?.path
    console.log("test after avatar")
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


const loginUser = asyncHandler(async (req,res) => {
    // username, password from req.body
    // validation
    // find the user if it exists
    // if user exists password check
    // login kara den to fir ek accesstoken generate ho jaye for the user which expires in let's say 30mmins
    // after which user can go to refreh endpoint jisse wo refresh token se ek naya access token generate kar paaye
    // send these token using cookies called secure cokkies
    console.log("testing loginUser starting")
    const data = req.body
    // console.log(req.body)
    const {username, email, password} = data
    if(!(username || email)){
        throw new APIError(400, "Username or email is required")
    }

    if(!password){
        throw new APIError(400, "Password not present")
    }
    const existUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!existUser){
        throw new APIError(404, "User doesn't exist")
    }

    // password check
    const isPassValid = await existUser.isPasswordCorrect(password)

    if(!isPassValid){
        throw APIError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(existUser._id)

    const logginInUser = await User.findById(existUser._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: logginInUser, accessToken, refreshToken
        },
        "User loggen in successfully"
        )
    )





    // const username = data.username
    // const email = dataemail



})


const logoutUser = asyncHandler(async (req,res) => {
    // clear the cookies
    // reset the refresh Token
    // to get id we create aor own middleware
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken  = asyncHandler( async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new APIError(401, "Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id).select(
            "-password"
        )
        if(!user){
            throw new APIError(404, "Invalid Refresh Token")
        }
        if(user?.refreshToken !== incomingRefreshToken){
            throw new APIError(401, "Refresh Token is Expired or invalid")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(200 , {
                accessToken: accessToken, 
                refreshToken: newrefreshToken,
            }, "Access token reactivated")
        )
    
    } catch (error) {
        throw new APIError(401, error?.message || "Invalid refresh Token")
    }

    
})

const changeCurrentUserPassword = asyncHandler( async (req,res) => {

    const currentPassword = req.body.password
    const newPassword = req.body.newPassword
    const user = await User.findById(req.user?._id)
    
    //compare password
    if(!isPasswordValid){
        isPasswordValid = await user.isPasswordCorrect(currentPassword)
        throw new APIError(400, "Current Password is incorrect")
        
    }
    //change the password
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(
        new ApiResponse(200, {}, "Password changed successfully")
        )
    
})

const getCurrentUser = asyncHandler( async (req,res) => {
    return res.status(200)
    .json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    )
})

const updateAccountDetails = asyncHandler( async (req,res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new APIError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName:fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
})

const updateUserAvatar = asyncHandler( async(req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new APIError(400, "avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new APIError(400, "Error while uploading avatar")
    }
    // const user = await User.findById(req.user._id)
    // user.avatar = avatar
    // user.save({validateBeforeSave: false})
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {avatar: avatar.url}
        },{new: true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated")
    )
    
})

const updateUserCoverImage = asyncHandler( async(req,res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new APIError(400, "CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage){
        throw new APIError(400, "Error while uploading coverImage")
    }
    // const user = await User.findById(req.user._id)
    // user.avatar = avatar
    // user.save({validateBeforeSave: false})
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {coverImage: coverImage.url}
        },{new: true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Cover Image updated")
    )
    
})
export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentUserPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage}
